from django.contrib import admin

from .models import Appointment, Doctor, Patient


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ["name", "specialization", "email", "is_active"]
    search_fields = ["name", "specialization"]


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "gender", "created_by"]
    search_fields = ["first_name", "last_name", "phone"]


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["patient", "doctor", "scheduled_at", "status"]
    list_filter = ["status", "doctor"]
