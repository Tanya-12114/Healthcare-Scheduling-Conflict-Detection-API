from django.core.management.base import BaseCommand

from clinic.models import Doctor

SAMPLE = [
    ("Priya Rao", "Cardiology", "priya.rao@example.com", "9840000001"),
    ("Arjun Mehta", "General Medicine", "arjun.mehta@example.com", "9840000002"),
    ("Kavya Nair", "Pediatrics", "kavya.nair@example.com", "9840000003"),
    ("Sameer Khan", "Orthopedics", "sameer.khan@example.com", "9840000004"),
    ("Anita Desai", "Dermatology", "anita.desai@example.com", "9840000005"),
]


class Command(BaseCommand):
    help = "Add a few sample doctors so appointments can be booked right away."

    def handle(self, *args, **options):
        created = 0
        for name, spec, email, phone in SAMPLE:
            _, was_created = Doctor.objects.get_or_create(
                email=email, defaults={"name": name, "specialization": spec, "phone": phone}
            )
            created += was_created
        self.stdout.write(self.style.SUCCESS(f"Added {created} sample doctor(s)."))
