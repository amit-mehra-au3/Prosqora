# Prosqora — Intelligent Lead Discovery & CRM

**Prosqora** is an intelligent website discovery, verification, deduplication, and sales CRM platform built for modern B2B teams.

---

## 🚀 Key Capabilities

- **Website Discovery & Verification**: 5-stage automated website health inspection and technical capability extraction.
- **Smart Deduplication**: Enforces `1 UNIQUE WEBSITE = 1 LEAD PER WORKSPACE` canonical domain resolution.
- **Multi-Tenant Workspaces**: Isolated customer workspaces with Role-Based Access Control (Admin & Normal User).
- **Super Admin Governance**: Platform owner portal (`/super-admin`) for workspace management, custom limit overrides, plan exemptions, soft-deletion, and restoration.
- **Server-Side Status Filtering & Permanent Delete**: `All`, `Active`, `Disabled` status filtering and physical SQL user deletion with email confirmation.
- **B2B Email Outreach**: Business Gmail connection, campaign composer, and progress tracking.
- **INR Billing**: Plans in Indian Rupee (`₹999` Starter, `₹2,499` Growth, `₹4,999` Business, Enterprise Custom).

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide Icons, React Router v6.
- **Backend**: Node.js v24, Express.js, JWT Authentication, Cookie Parser, bcryptjs.
- **Database**: SQLite3 (`sqlite3`) / PostgreSQL support via `DATABASE_URL`.
- **Deployment**: Render Web Service (`render.yaml` Blueprint specification).

---

## 💻 Local Development Setup

### 1. Install Dependencies

```bash
# Install root, client, and server dependencies
npm run build
```

### 2. Configure Local Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Run Development Server

```bash
# Start backend server on port 5001
cd server && node server.js

# In a separate terminal, start React Vite frontend on port 3000
cd client && npm run dev
```

---

## ☁️ Render Production Deployment Guide

### Option A: Render Blueprint Deployment (Recommended)

1. Connect your GitHub repository to [Render](https://render.com).
2. Click **New +** → **Blueprint**.
3. Select your repository containing `render.yaml`.
4. Render will automatically configure the Web Service with:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Fill in the required environment variables in the Render Dashboard (`JWT_SECRET`, `APP_URL`, `RAZORPAY_KEY_ID`, etc.).
6. Click **Apply**.

### Option B: Manual Web Service Setup

1. Click **New +** → **Web Service** on Render.
2. Select your repository.
3. Configure settings:
   - **Environment**: `Node`
   - **Region**: `Singapore` (or nearest region)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Add Environment Variables from `.env.example`.
5. Click **Create Web Service**.

---

## 🔒 Required Environment Variables (Render)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (Render sets this dynamically) | `5001` |
| `APP_URL` | Public Render application URL | `https://prosqora.onrender.com` |
| `CORS_ORIGIN` | Allowed CORS origin URL | `https://prosqora.onrender.com` |
| `JWT_SECRET` | 64+ char random JWT secret | `your_secret_here` |
| `DATABASE_URL` | SQLite path or PostgreSQL connection URI | `file:./prosqora.db` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | `secret_...` |
| `GMAIL_CLIENT_ID` | Google OAuth Client ID | `client_id_...` |
| `GMAIL_CLIENT_SECRET` | Google OAuth Client Secret | `client_secret_...` |

---

## 🧪 Testing & Quality Assurance

Run the automated pre-production QA test suite locally before pushing to production:

```bash
npm test
```

---

## 📄 License & Attribution

&copy; 2026 Prosqora. All rights reserved. Registered under AM Automation Trading.
