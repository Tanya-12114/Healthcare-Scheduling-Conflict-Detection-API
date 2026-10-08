from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import Appointment, Doctor, Patient

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ["id", "name", "specialization", "email", "phone", "is_active"]


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "first_name", "last_name", "full_name", "age", "date_of_birth",
            "gender", "phone", "email", "address", "blood_group", "allergies", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_date_of_birth(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)
    end_time = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "patient", "patient_name", "doctor", "doctor_name", "scheduled_at",
            "duration_minutes", "end_time", "reason", "status", "notes", "created_at",
        ]
        # Status only changes through the /cancel/ and /complete/ actions.
        read_only_fields = ["status", "created_at"]

    def validate_patient(self, patient):
        user = self.context["request"].user
        if not user.is_superuser and patient.created_by_id != user.id:
            raise serializers.ValidationError("Patient not found.")
        return patient

    def validate_doctor(self, doctor):
        if not doctor.is_active:
            raise serializers.ValidationError("This doctor is not accepting appointments.")
        return doctor

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Appointment must be in the future.")
        return value

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.status != Appointment.Status.SCHEDULED:
            raise serializers.ValidationError(
                f"A {instance.status} appointment can no longer be edited."
            )

        if {"doctor", "scheduled_at", "duration_minutes"} & attrs.keys() or instance is None:
            doctor = attrs.get("doctor") or instance.doctor
            start = attrs.get("scheduled_at") or instance.scheduled_at
            minutes = attrs.get("duration_minutes") or (instance.duration_minutes if instance else 30)
            if Appointment.doctor_has_conflict(
                doctor, start, minutes, exclude_pk=instance.pk if instance else None
            ):
                raise serializers.ValidationError(
                    {"scheduled_at": "This doctor already has an appointment at that time."}
                )
        return attrs
