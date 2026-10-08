from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from django.db.models import ProtectedError
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import AppointmentFilter
from .models import Appointment, Doctor, Patient
from .permissions import IsAdminOrReadOnly
from .serializers import (
    AppointmentSerializer,
    DoctorSerializer,
    PatientSerializer,
    RegisterSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id, "username": user.username,
                    "email": user.email, "is_staff": user.is_staff,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(ObtainAuthToken):
    """Same as DRF's token login, but also tells the UI who the user is."""

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id, "username": user.username,
                    "email": user.email, "is_staff": user.is_staff,
                },
            }
        )


class OwnedQuerysetMixin:
    """Regular users only ever see their own records; superusers see everything."""

    def owned(self, queryset):
        user = self.request.user
        return queryset if user.is_superuser else queryset.filter(created_by=user)


class PatientViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    search_fields = ["first_name", "last_name", "phone", "email"]
    filterset_fields = ["gender", "blood_group"]
    ordering_fields = ["last_name", "created_at", "date_of_birth"]

    def get_queryset(self):
        return self.owned(Patient.objects.all())

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["name", "specialization"]
    filterset_fields = ["specialization", "is_active"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This doctor has appointments and cannot be deleted. Mark them inactive instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AppointmentViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    filterset_class = AppointmentFilter
    search_fields = ["reason", "patient__first_name", "patient__last_name", "doctor__name"]
    ordering_fields = ["scheduled_at", "created_at"]

    def get_queryset(self):
        return self.owned(Appointment.objects.select_related("patient", "doctor"))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _transition(self, request, new_status):
        appointment = self.get_object()
        if appointment.status != Appointment.Status.SCHEDULED:
            return Response(
                {"detail": f"Only scheduled appointments can be changed (this one is {appointment.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        appointment.status = new_status
        if new_status == Appointment.Status.COMPLETED and "notes" in request.data:
            appointment.notes = request.data["notes"]
        appointment.save()
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(request, Appointment.Status.CANCELLED)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._transition(request, Appointment.Status.COMPLETED)


class DashboardView(OwnedQuerysetMixin, APIView):
    def get(self, request):
        appointments = self.owned(Appointment.objects.all())
        by_status = dict(
            appointments.order_by("status").values_list("status").annotate(n=Count("id"))
        )
        upcoming = appointments.filter(
            status=Appointment.Status.SCHEDULED, scheduled_at__gte=timezone.now()
        ).select_related("patient", "doctor")[:5]
        return Response(
            {
                "total_patients": self.owned(Patient.objects.all()).count(),
                "appointments_today": appointments.filter(
                    scheduled_at__date=timezone.localdate(), status=Appointment.Status.SCHEDULED
                ).count(),
                "appointments_by_status": {
                    s.value: by_status.get(s.value, 0) for s in Appointment.Status
                },
                "upcoming": AppointmentSerializer(upcoming, many=True, context={"request": request}).data,
            }
        )