# 🎓 ORBIT — Coaching Institute Management Web App

![ORBIT Dashboard](https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80)

**ORBIT** is an enterprise-grade, multi-role coaching institute management platform designed with modern SaaS aesthetics, micro-interactions, dark/light theme support, and strict PostgreSQL Row Level Security (RLS) powered by Supabase.

---

## ✨ Features by Role

### 👑 1. Admin Workspace (`/admin`)
- **Executive Analytics Dashboard**: Real-time counter stat cards (Total Students, Faculty Members, Active Batches, Monthly Revenue Collected, Pending Dues).
- **Monthly Collection Bar Chart**: Monthly revenue trends powered by Recharts with custom tooltips.
- **Student Information System (SIS)**:
  - Add, edit, filter, search, and delete students.
  - Multi-batch enrollment assignment.
  - Student Profile view with enrollment details, attendance rates, and fee payment history.
- **Faculty & Teacher Management**:
  - Add, edit, and assign teachers to batches.
  - Subject specializations, qualifications, and salary info.
- **Batch & Course Scheduling**:
  - Class name, subject category, weekly timing schedule, faculty assignees, and monthly tuition fee.
- **Fee Ledger & Payment Processing**:
  - Record payments across cash, UPI, and bank transfers.
  - Real-time due list computation.
  - **Printable Fee Receipt**: Formatted official institute receipt with instant window print formatting.
- **Notice Board Broadcasts**:
  - Post notices targeted to Everyone, Teachers Only, Students Only, or specific batches.

---

### 🧑‍🏫 2. Teacher Portal (`/teacher`)
- **Teacher Dashboard**:
  - Scoped metrics: Assigned classes, total enrolled students, today's schedule.
  - Quick action to take daily attendance or post class notes.
- **Batch Rosters**:
  - View only batches assigned to the logged-in teacher.
  - Student rosters with parent contact info and historical attendance percentages.
- **Daily Attendance Register**:
  - Select class and date (persisted in URL query params).
  - 1-click **"Mark All Present"** button.
  - 3-way toggle per student: **Present**, **Late**, **Absent**.
  - Real-time turnout calculation and instant database upsert.
- **Class Notice Board**:
  - Post homework, exam dates, and updates visible only to students of that specific batch.

---

### 🎒 3. Student Portal (`/student`)
- **Student Dashboard**:
  - Personalized greeting with roll number badge.
  - 4 Stat Cards: Enrolled classes, attendance percentage, monthly fee status, notice count.
  - Quick attendance breakdown (Present vs. Absent vs. Late).
  - Recent payment receipts with one-click print modal.
- **My Classes (`/student/batch`)**:
  - Enrolled subjects, schedules, timings, faculty instructor profiles, and monthly fee.
- **Fee Ledger (`/student/fees`)**:
  - Complete history of payments made, transaction references, and printable receipts.
- **Attendance Log (`/student/attendance`)**:
  - Day-by-day attendance log with status badges and class filter dropdown.
- **Notice Board (`/student/announcements`)**:
  - Institute-wide circulars + class notices targeted to their enrolled batches.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons, Class Variance Authority, Tailwind Merge
- **UI Components**: Radix UI primitives (Dialog, Select, Tabs, Dropdown Menu, Avatar), Framer Motion
- **Charts**: Recharts
- **State & Data Fetching**: TanStack Query v5 (React Query)
- **Backend & Database**: Supabase (PostgreSQL 15+, Auth, Row-Level Security, Edge Functions)
- **Forms & Notifications**: Sonner toast notifications, date-fns

---

## 📁 Project Structure

```
orbit/
├── public/                 # Static assets
├── supabase/               # Database definitions & Edge Functions
│   ├── 1_schema.sql        # Database tables, triggers, indexes, and roles
│   ├── 2_rls.sql           # Row Level Security policies
│   ├── 3_seed.sql          # Optional mock data seed
│   └── functions/
│       └── create-user/    # Admin user creation edge function
├── src/
│   ├── components/
│   │   ├── auth/           # ProtectedRoute with role gating
│   │   ├── charts/         # Recharts monthly collection chart
│   │   ├── layout/         # AppShell, Sidebar, TopBar, MobileNav
│   │   ├── shared/         # StatCard, EmptyState, PageHeader, PrintableReceipt
│   │   └── ui/             # Radix & Tailwind UI primitives
│   ├── hooks/              # useAuth hook
│   ├── lib/                # Supabase client, utils, constants
│   ├── pages/
│   │   ├── admin/          # Admin pages (dashboard, students, teachers, batches, fees, notices)
│   │   ├── auth/           # Split-screen Login page with role-based redirects
│   │   ├── student/        # Student pages (dashboard, batches, fees, attendance, notices)
│   │   ├── teacher/        # Teacher pages (dashboard, batches, attendance, notices)
│   │   └── not-found.tsx   # 404 handler
│   ├── providers/          # AuthProvider, ThemeProvider, QueryProvider
│   ├── services/           # Supabase service layer
│   ├── types/              # Database & application TypeScript types
│   ├── App.tsx             # Route definitions & router setup
│   └── main.tsx            # Application entry point
├── .env.example            # Environment variables template
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- pnpm (`npm install -g pnpm`)
- A free Supabase account ([supabase.com](https://supabase.com))

### 2. Clone and Install Dependencies
```bash
cd orbit
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Apply Database Migrations (Supabase SQL Editor)
In your Supabase project dashboard, navigate to **SQL Editor** and execute the files in this order:

1. **`supabase/1_schema.sql`**: Creates tables (`profiles`, `students`, `teachers`, `batches`, `enrollments`, `fee_structures`, `fee_payments`, `attendance`, `announcements`), indexes, and triggers.
2. **`supabase/2_rls.sql`**: Enables RLS on all 9 tables and creates non-recursive policies for Admin, Teacher, and Student roles.

---

## 🛡️ Security & Role Architecture

- **`profiles.role`**: Checked via PostgreSQL enum check constraint (`admin`, `teacher`, `student`).
- **`get_my_role()`**: `SECURITY DEFINER` function executing safely within `public` schema.
- **Client Role Gating**: React Router v7 routes protected with `<ProtectedRoute allowedRoles={['...']}>`.
- **Server Role Gating**: Every database operation is enforced directly by PostgreSQL RLS. Students and Teachers can never read or write outside their permitted rows.

---

## 📦 Building for Production

To create an optimized production build:
```bash
pnpm build
```
Preview the production build locally:
```bash
pnpm preview
```

Deployable directly to **Vercel**, **Netlify**, or **Cloudflare Pages** with single-page application (SPA) rewrite rules configured (`/index.html`).

---

## 📄 License
MIT License. Built with ❤️ for educational institutes and coaching centers.

