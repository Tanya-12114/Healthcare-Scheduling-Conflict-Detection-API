# Healthcare Scheduling & Conflict-Detection API

A REST API for managing patients, doctors, and appointments, built with **Django** and **Django REST Framework**.
Clinic staff register, manage their own patient records, and book appointments. The API prevents double-booking,
and each user can only see their own data.

## Tech stack
Python · Django · Django REST Framework · PostgreSQL (SQLite for local dev) · Token authentication ·
django-filter · django-cors-headers · WhiteNoise + Gunicorn · GitHub Actions

## Features
- **Auth:** register / login with token authentication, password validation, unique emails
- **Patients:** full CRUD, search by name/phone/email, filters, computed `age`; each user sees only their own patients
- **Doctors:** readable by any logged-in user, editable by staff only
- **Appointments:**
  - cannot be booked in the past
  - **overlap detection per doctor** (back-to-back is fine; different durations are handled)
  - the patient must belong to the logged-in user, and the doctor must be active
  - status changes only through `/cancel/` and `/complete/` (completed appointments can store visit notes)
  - cancelled slots become bookable again
- **Dashboard:** patient count, today's appointments, counts by status, next 5 upcoming
- Pagination, search, filtering (`status`, `doctor`, `patient`, `date_from`, `date_to`) and ordering
- 30 automated tests, run in CI on every push

## Setup
```bash
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # then edit values
python manage.py migrate
python manage.py createsuperuser                     # optional: needed to add doctors via API/admin
python manage.py runserver
```
API runs at `http://localhost:8000/api/`. Admin panel at `/admin/`.

To use **PostgreSQL**, set `DATABASE_URL=postgres://user:password@localhost:5432/carepoint` in `.env`.

## Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Create account, returns token |
| POST | `/api/auth/login/` | Returns token |
| GET/POST | `/api/patients/` | List (search/filter) / create |
| GET/PUT/PATCH/DELETE | `/api/patients/<id>/` | Patient detail |
| GET/POST | `/api/doctors/` | List / create (create is staff only) |
| GET/PUT/PATCH/DELETE | `/api/doctors/<id>/` | Doctor detail (write is staff only) |
| GET/POST | `/api/appointments/` | List / book |
| GET/PUT/PATCH/DELETE | `/api/appointments/<id>/` | Appointment detail (only while scheduled) |
| POST | `/api/appointments/<id>/cancel/` | Cancel |
| POST | `/api/appointments/<id>/complete/` | Complete (optional `notes`) |
| GET | `/api/dashboard/` | Summary stats |

Send the token as `Authorization: Token <your-token>`.

### Example
```bash
# Register
curl -X POST localhost:8000/api/auth/register/ -H "Content-Type: application/json" \
  -d '{"username":"asha","email":"asha@example.com","password":"StrongPass#123"}'

# Book an appointment
curl -X POST localhost:8000/api/appointments/ \
  -H "Authorization: Token <token>" -H "Content-Type: application/json" \
  -d '{"patient":1,"doctor":1,"scheduled_at":"2030-01-15T10:00:00+05:30","duration_minutes":30,"reason":"Checkup"}'

# Filter
curl "localhost:8000/api/appointments/?status=scheduled&date_from=2030-01-01" -H "Authorization: Token <token>"
```

## Tests
```bash
DEBUG=True python manage.py test      # Windows PowerShell: $env:DEBUG="True"; python manage.py test
```

## Project structure
```
config/            settings, root urls, wsgi/asgi
clinic/
├── models.py        Doctor, Patient, Appointment (+ conflict-check logic)
├── serializers.py   validation rules
├── views.py         viewsets, status actions, dashboard
├── permissions.py   IsAdminOrReadOnly
├── filters.py       appointment filters
└── tests/           30 tests
```

## Deployment (e.g. Render)
- Create a PostgreSQL database and a web service.
- Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- Start: `gunicorn config.wsgi`
- Environment: `SECRET_KEY` (required), `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`

## Design notes and known limitations
- Overlap detection runs in the serializer. Two simultaneous requests for the same slot could in theory both pass the
  check. A production system would add a PostgreSQL exclusion constraint or lock the doctor's row with
  `select_for_update()` inside a transaction.
- `SECRET_KEY` has no hardcoded fallback outside `DEBUG`, so the app refuses to start without one.
- This is a portfolio project. It is not designed or certified for real patient data (no audit logging, field encryption,
  or HIPAA-style controls).

## Adding doctors and patients

**Patients** (any user): sign in, open **Patients**, click **Add patient**. Each user only sees the patients they created.

**Doctors** (admin only): doctors are shared by everyone, so only staff accounts can add or edit them.
1. Create an admin once: `python manage.py createsuperuser`
2. Sign in to the web app with that account. A **Doctors** page with an **Add doctor** button appears
   (regular users see the list, read-only).
3. Optional: `python manage.py seed_doctors` adds 5 sample doctors.

You can also manage everything at `/admin/`. Doctors with appointments can't be deleted; mark them inactive instead.
To turn an existing user into an admin: `python manage.py shell` then
`from django.contrib.auth import get_user_model as g; u=g().objects.get(username="asha"); u.is_staff=True; u.save()`

## Frontend (React + Vite)
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev               # http://localhost:5173
```
Pages: login/register, dashboard, patients, doctors, appointments. Forms open in dialogs, destructive actions ask for
confirmation, and booking conflicts from the API are shown inline.
For production, set `CORS_ALLOWED_ORIGINS` on the backend to your frontend URL, and `VITE_API_URL` on the frontend to the backend URL.