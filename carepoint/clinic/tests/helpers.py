from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from clinic.models import Doctor, Patient

User = get_user_model()


def make_user(username="alice", staff=False):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="StrongPass#123", is_staff=staff
    )


def make_doctor(email="dr.rao@example.com"):
    return Doctor.objects.create(name="Rao", specialization="Cardiology", email=email)


def make_patient(owner, first="Asha"):
    return Patient.objects.create(
        created_by=owner, first_name=first, last_name="Verma",
        date_of_birth=date(1995, 5, 17), gender="F", phone="9876543210",
    )


def future_slot(days=2, hour=10, minute=0):
    base = timezone.now().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=days)
