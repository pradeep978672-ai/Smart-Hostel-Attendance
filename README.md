# Hostel Attendance Management System

Full-stack Hostel Attendance Management System built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase JS Client**.

---

## 🌟 Key Features Implemented

### 1. Dual Role Architecture
- **ADMIN PORTAL**:
  - **Admin Login**: Admin credential validation & session tracking.
  - **Admin Dashboard**: Total Students, Present Count, Absent Count, Attendance Percentage statistics.
  - **Separate Present & Absent Lists**: Direct tab navigation and separate views for Present/Absent residents.
  - **Multi-Field Search**: Search students dynamically by **Name**, **Roll Number**, **Department**, or **Room Number**.
  - **Student Directory**: Add, View, Edit, and Delete student records with confirmation dialogs.
  - **Student Strength Analytics**: Department-wise and Hostel Block distribution analytics.
  - **Attendance Management & Proof Verification**: Review daily logs, selfie snapshot, GPS location coordinates, and reverse geocoded address proof.

- **STUDENT PORTAL**:
  - **Student Login**: Login via Student Roll Number + Password or WebAuthn Passkey (Touch ID / Face ID / Windows Hello).
  - **Student Dashboard**: Displays logged-in student's photo, name, roll number, department, room number, and attendance status.
  - **Submit Attendance Section**: Automatic registration details usage, camera selfie snapshot, GPS location verification, and passkey/password auth.
  - **Strict Time Window Enforcement (7:00 PM – 8:00 PM)**: Enforces 7–8 PM server time window (`Before 7:00 PM: "Attendance has not started yet"`, `7:00–8:00 PM: Allow submission`, `After 8:00 PM: "Attendance is closed for today"`).
  - **Anti-Duplicate Submission**: Prevents students from submitting attendance more than once on the same day.
  - **My Attendance History**: 30-day attendance score percentage, submission timestamps, and location logs.

---

## 🗄️ Database Mapping (Supabase)

Connected to your existing Supabase tables without duplicate table creation:

1. `students`: `id`, `roll_number`, `name`, `department`, `room_number`, `current_location`, `profile_photo`, `password_hash`, `has_webauthn`, `role`, `created_at`
2. `attendance`: `id`, `student_id`, `roll_number`, `date`, `submission_time`, `status`, `location_lat`, `location_lng`, `location_address`, `selfie_photo`, `auth_method`
3. `audit_logs`: `id`, `user_role`, `user_identifier`, `action`, `details`, `created_at`

DDL setup script is located in [`supabase/schema.sql`](file:///d:/my%20file/ANTI__PROJECT%201/supabase/schema.sql).

---

## ⚙️ Environment Configuration

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
NEXT_PUBLIC_APP_DOMAIN=localhost
```

---

## 🚀 How to Run Locally

1. Open a terminal in `d:/my file/ANTI__PROJECT 1`:
   ```bash
   cd "d:/my file/ANTI__PROJECT 1"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3000`.
