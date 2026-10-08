from rest_framework import status
from rest_framework.test import APITestCase

from .helpers import make_user


class AuthTests(APITestCase):
    def test_register_returns_token(self):
        res = self.client.post("/api/auth/register/", {
            "username": "bob", "email": "bob@example.com", "password": "StrongPass#123",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", res.data)

    def test_register_rejects_weak_password(self):
        res = self.client.post("/api/auth/register/", {
            "username": "bob", "email": "bob@example.com", "password": "123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", res.data)

    def test_register_rejects_duplicate_email(self):
        make_user("alice")
        res = self.client.post("/api/auth/register/", {
            "username": "alice2", "email": "alice@example.com", "password": "StrongPass#123",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_token(self):
        make_user("alice")
        res = self.client.post("/api/auth/login/", {"username": "alice", "password": "StrongPass#123"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("token", res.data)

    def test_login_rejects_wrong_password(self):
        make_user("alice")
        res = self.client.post("/api/auth/login/", {"username": "alice", "password": "wrong"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_endpoints_require_authentication(self):
        for url in ["/api/patients/", "/api/appointments/", "/api/doctors/", "/api/dashboard/"]:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED, url)

    def test_login_reports_staff_flag(self):
        make_user("boss", staff=True)
        res = self.client.post("/api/auth/login/", {"username": "boss", "password": "StrongPass#123"})
        self.assertTrue(res.data["user"]["is_staff"])
