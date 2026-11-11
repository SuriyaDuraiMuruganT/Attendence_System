# Employee Attendance Management System – Prototype Version 1

A clean, modular, and responsive Employee Attendance Management System built with **React + TypeScript + Vite + Tailwind CSS** on the frontend, **Python FastAPI + SQLAlchemy + Alembic** on the backend, and **PostgreSQL** for persistent storage.

---

## 1. System Overview & Architecture

- **Timezone:** Standardized strictly to Indian Standard Time (`Asia/Kolkata`). Timestamps are generated and enforced on the backend server only.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, responsive layout with cream theme (`#F7F5EC`), forest green (`#315C45`), and sage green (`#66866B`).
- **Backend:** FastAPI, Pydantic V2, Argon2-cffi password hashing, PyJWT authentication, SQLAlchemy 2.0 ORM, and Alembic migrations.
- **Database:** PostgreSQL (with connection pooling, constraints, and audit logging).

---

## 2. Company Attendance Rules & Validation

1. **Shift Timings:**
   - Standard IN time: **10:00 AM IST**
   - Late arrival threshold: **10:30 AM IST** (Check-in after 10:30 AM requires a mandatory reason)
   - Standard OUT time: **05:30 PM IST** (Check-out before 05:30 PM requires a mandatory early departure reason)
2. **Attendance Integrity Checks:**
   - Cannot mark OUT without marking IN first.
   - Cannot mark IN twice on the same day.
   - Cannot mark OUT twice on the same day.
   - Device timestamps from the browser are never trusted; only server timestamps in `Asia/Kolkata` are recorded.
3. **Office Network Restriction:**
   - Client public IP is securely resolved via `X-Forwarded-For` / `CF-Connecting-IP` / direct socket.
   - Attendance is strictly blocked when the employee connects from an unauthorized network with the message:
     > *"Attendance can only be marked from the authorized office network. Please connect to the office Wi-Fi or contact your administrator."*
   - Configurable via `APPROVED_OFFICE_IPS` in environment variables or dynamically in the admin console.
4. **Three-Day Attendance Correction Window:**
   - If attendance is missed on a working day, employees can request a historical correction within the **next 3 calendar days**.
   - Example: Missed on Nov 6 $\rightarrow$ Nov 7, 8, 9 allowed; Nov 10 blocked.
   - Claims are marked as *historical claims* with mandatory reason and require Admin approval.
   - Admin approval or rejection is logged in the `admin_audit_logs` table.

---

## 3. Database Schema

The database consists of 6 tables with foreign keys and unique constraints:
1. `users`: Stores login credentials (`employee_id`, Argon2 `password_hash`, role `EMPLOYEE` or `ADMIN`, `is_active`).
2. `employees`: Employee profile metadata (`employee_id`, `full_name`, `email`, `department`, `designation`, `joining_date`, `is_active`).
3. `attendance`: Single record per employee per date (`in_time`, `out_time`, `in_status`, `out_status`, `late_reason`, `early_departure_reason`, `total_hours`, `client_ip`, `is_correction`).
4. `attendance_correction_requests`: 3-day window correction requests (`claimed_in_time`, `claimed_out_time`, `reason`, `status`: `PENDING` / `APPROVED` / `REJECTED`, `admin_remarks`).
5. `office_network_settings`: Office IP and CIDR subnet whitelist.
6. `admin_audit_logs`: Audit trail for admin approvals, rejections, and employee status changes.

---

## 4. Default Seed Credentials

Run `python seed.py` to initialize:

| Role | Employee ID | Default Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `ADMIN001` | `AdminPassword@123` | Operations Administrator |
| **Employee** | `EMP101` | `Employee@123` | Rahul Sharma (Engineering) |
| **Employee** | `EMP102` | `Employee@123` | Priya Patel (Product Design) |

---

## 5. Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+ & npm
- PostgreSQL (or local SQLite fallback during rapid development)

### Step 1: Backend Setup
```bash
cd backend

# Create and activate virtual environment (optional)
python -m venv venv
venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial admin & demo employees
python seed.py

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at `http://localhost:8000`.
Interactive Swagger API documentation: `http://localhost:8000/docs`.

### Step 2: Frontend Setup
```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## 6. Running with Docker Compose

To run the complete stack (PostgreSQL + FastAPI backend + React frontend) with a single command:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 7. Independent Cloud Deployment Guide

To deploy this application independently of the local machine:

### A. Cloud PostgreSQL Database (Neon or Supabase)
1. Create a free PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection string (`postgresql://<user>:<password>@<host>/<dbname>?sslmode=require`).
3. Set this as `DATABASE_URL` in your backend environment.

### B. Backend Deployment (Render or Railway)
1. Push this repository to GitHub.
2. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service** connected to your repository.
3. Configure settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
4. Set Environment Variables:
   - `DATABASE_URL`: Your cloud PostgreSQL URL from Step A.
   - `JWT_SECRET_KEY`: A secure 64-character secret key.
   - `TIMEZONE`: `Asia/Kolkata`
   - `APPROVED_OFFICE_IPS`: Your company's office public static IP or CIDR (e.g. `122.161.45.22/32`).
   - `ENFORCE_OFFICE_NETWORK`: `true`
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://attendance-system.vercel.app`).
5. Deploy. You will receive a backend URL (e.g. `https://attendance-api.onrender.com`).

### C. Frontend Deployment (Vercel)
1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Configure settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://attendance-api.onrender.com/api` (your deployed backend URL from Step B).
4. Deploy. You will receive a public HTTPS URL (e.g. `https://attendance-system.vercel.app`).

---

## 8. Automated Test Suite

Run the full automated test suite covering all 12 system requirements:
```bash
cd backend
pytest tests/ -v
```

Verified test cases:
1. `test_1_login_and_logout` – Verifies employee & admin login, token issue, and rejection of invalid credentials.
2. `test_2_attendance_blocked_from_unauthorized_network` – Validates 403 Forbidden with company notice when public IP is outside office CIDR.
3. `test_3_attendance_allowed_from_authorized_network` – Validates successful IN check from approved office IP before 10:30 AM.
4. `test_4_duplicate_in_prevention` – Validates 400 Bad Request if marking IN twice on the same day.
5. `test_5_out_before_530_requires_reason` – Validates requirement of early departure reason when check-out is before 5:30 PM IST.
6. `test_6_duplicate_out_prevention` – Validates 400 Bad Request if marking OUT twice on the same day.
7. `test_7_in_after_1030_requires_reason` – Validates mandatory late arrival reason when checking in after 10:30 AM IST.
8. `test_8_correction_window_3_days_and_rejection_approval` – Validates 3-calendar-day correction window, expiration after 3 days, admin review, and persistence of corrected attendance records.

