from rest_framework import status
from rest_framework.test import APITestCase

from .helpers import make_doctor, make_patient, make_user

PAYLOAD = {
    "first_name": "Ravi", "last_name": "Kumar", "date_of_birth": "1990-01-01",
    "gender": "M", "phone": "9000000000",
}


class PatientTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")

    def test_create_assigns_owner_and_computes_age(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/patients/", PAYLOAD)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["full_name"], "Ravi Kumar")
        self.assertGreaterEqual(res.data["age"], 30)

    def test_future_date_of_birth_rejected(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/patients/", {**PAYLOAD, "date_of_birth": "2999-01-01"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_users_cannot_see_each_others_patients(self):
        patient = make_patient(self.alice)
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.get("/api/patients/").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/patients/{patient.id}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/patients/{patient.id}/").status_code, 404)

    def test_search_by_name(self):
        make_patient(self.alice, first="Asha")
        make_patient(self.alice, first="Meera")
        self.client.force_authenticate(self.alice)
        res = self.client.get("/api/patients/?search=meera")
        self.assertEqual(res.data["count"], 1)

    def test_update_patient(self):
        patient = make_patient(self.alice)
        self.client.force_authenticate(self.alice)
        res = self.client.patch(f"/api/patients/{patient.id}/", {"allergies": "Penicillin"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["allergies"], "Penicillin")


class DoctorTests(APITestCase):
    def test_regular_user_can_read_but_not_create(self):
        self.client.force_authenticate(make_user("alice"))
        make_doctor()
        self.assertEqual(self.client.get("/api/doctors/").data["count"], 1)
        res = self.client.post("/api/doctors/", {
            "name": "Sen", "specialization": "ENT", "email": "sen@example.com",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_create(self):
        self.client.force_authenticate(make_user("admin1", staff=True))
        res = self.client.post("/api/doctors/", {
            "name": "Sen", "specialization": "ENT", "email": "sen@example.com",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
