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


class BecomeAdminTests(APITestCase):
    def setUp(self):
        self.user = make_user("alice")
        self.client.force_authenticate(self.user)

    def test_disabled_when_no_code_configured(self):
        res = self.client.post("/api/auth/become-admin/", {"code": "anything"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_wrong_code_rejected(self):
        with self.settings(ADMIN_SIGNUP_CODE="s3cret"):
            res = self.client.post("/api/auth/become-admin/", {"code": "nope"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_correct_code_promotes_user(self):
        with self.settings(ADMIN_SIGNUP_CODE="s3cret"):
            res = self.client.post("/api/auth/become-admin/", {"code": "s3cret"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)