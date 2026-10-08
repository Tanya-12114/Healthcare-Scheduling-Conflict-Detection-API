from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from clinic.models import Appointment

from .helpers import future_slot, make_doctor, make_patient, make_user


class AppointmentTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.doctor = make_doctor()
        self.patient = make_patient(self.alice)
        self.client.force_authenticate(self.alice)

    def book(self, start, minutes=30, patient=None, doctor=None):
        return self.client.post("/api/appointments/", {
            "patient": (patient or self.patient).id,
            "doctor": (doctor or self.doctor).id,
            "scheduled_at": start.isoformat(),
            "duration_minutes": minutes,
            "reason": "Checkup",
        })

    def test_book_appointment(self):
        res = self.book(future_slot())
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "scheduled")
        self.assertEqual(res.data["doctor_name"], "Rao")

    def test_past_appointment_rejected(self):
        res = self.book(future_slot(days=-1))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scheduled_at", res.data)

    def test_double_booking_rejected(self):
        start = future_slot()
        self.assertEqual(self.book(start).status_code, 201)
        # Starts in the middle of the first appointment
        res = self.book(start + timedelta(minutes=15))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_back_to_back_is_allowed(self):
        start = future_slot()
        self.assertEqual(self.book(start).status_code, 201)
        self.assertEqual(self.book(start + timedelta(minutes=30)).status_code, 201)

    def test_long_appointment_blocks_later_start(self):
        start = future_slot()
        self.assertEqual(self.book(start, minutes=120).status_code, 201)
        self.assertEqual(self.book(start + timedelta(minutes=90)).status_code, 400)

    def test_doctor_conflict_applies_across_users(self):
        bob = make_user("bob")
        bobs_patient = make_patient(bob, first="Neha")
        start = future_slot()
        self.assertEqual(self.book(start).status_code, 201)
        self.client.force_authenticate(bob)
        res = self.book(start, patient=bobs_patient)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_book_for_another_users_patient(self):
        bob = make_user("bob")
        self.client.force_authenticate(bob)
        res = self.book(future_slot())
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", res.data)

    def test_inactive_doctor_rejected(self):
        self.doctor.is_active = False
        self.doctor.save()
        self.assertEqual(self.book(future_slot()).status_code, 400)

    def test_cancel_frees_the_slot(self):
        start = future_slot()
        appt_id = self.book(start).data["id"]
        res = self.client.post(f"/api/appointments/{appt_id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "cancelled")
        self.assertEqual(self.book(start).status_code, 201)

    def test_complete_saves_notes_and_blocks_further_changes(self):
        appt_id = self.book(future_slot()).data["id"]
        res = self.client.post(f"/api/appointments/{appt_id}/complete/", {"notes": "BP normal"})
        self.assertEqual(res.data["status"], "completed")
        self.assertEqual(res.data["notes"], "BP normal")
        self.assertEqual(self.client.post(f"/api/appointments/{appt_id}/cancel/").status_code, 400)
        self.assertEqual(self.client.patch(f"/api/appointments/{appt_id}/", {"reason": "x"}).status_code, 400)

    def test_status_cannot_be_set_directly(self):
        appt_id = self.book(future_slot()).data["id"]
        self.client.patch(f"/api/appointments/{appt_id}/", {"status": "completed"})
        self.assertEqual(Appointment.objects.get(pk=appt_id).status, "scheduled")

    def test_reschedule_conflict_checked_but_not_against_itself(self):
        start = future_slot()
        first = self.book(start).data["id"]
        self.book(start + timedelta(minutes=30))
        # Moving within its own window is fine
        ok = self.client.patch(f"/api/appointments/{first}/", {
            "scheduled_at": (start + timedelta(minutes=5)).isoformat(), "duration_minutes": 20,
        })
        self.assertEqual(ok.status_code, 200)
        # Moving onto the second appointment is not
        bad = self.client.patch(f"/api/appointments/{first}/", {
            "scheduled_at": (start + timedelta(minutes=30)).isoformat(),
        })
        self.assertEqual(bad.status_code, 400)

    def test_filter_by_status(self):
        a = self.book(future_slot(hour=9)).data["id"]
        self.book(future_slot(hour=11))
        self.client.post(f"/api/appointments/{a}/cancel/")
        res = self.client.get("/api/appointments/?status=cancelled")
        self.assertEqual(res.data["count"], 1)

    def test_dashboard(self):
        a = self.book(future_slot(hour=9)).data["id"]
        self.book(future_slot(hour=11))
        self.client.post(f"/api/appointments/{a}/cancel/")
        res = self.client.get("/api/dashboard/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_patients"], 1)
        self.assertEqual(res.data["appointments_by_status"],
                         {"scheduled": 1, "completed": 0, "cancelled": 1})
        self.assertEqual(len(res.data["upcoming"]), 1)
