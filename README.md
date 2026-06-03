# SkillBytes — WhatsApp-Style Quiz Platform

[![Phase 1 Complete](https://img.shields.io/badge/Phase%201-Complete-brightgreen.svg)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20MongoDB-blue.svg)](#)
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20Bcrypt-orange.svg)](#)

**Version:** v1.0  
**Status:** Stable Release

A full-stack gamified quiz application that delivers MCQs through an interactive chat interface inspired by WhatsApp. Features secure JWT user authentication, profile customization, a gamification system (XP, levels, streaks, achievements), daily challenges, personalized learning tracks, and a real-time analytics dashboard.

> Take a quiz, get instant feedback, unlock achievements, climb levels, and track your metrics.

---

## 🎥 Demo Video

Watch the full walkthrough and live project demo here:

[▶ Watch Demo on Loom](https://www.loom.com/share/d6856747a1d848a78fabb14aea55b58b)

---

## 🚀 Features (Phase 1 Finalized)

### 1. Chat-Style Quiz Flow
- **WhatsApp UI Experience** — MCQ questions are rendered as animated chat bubbles with a realistic typing indicator.
- **Per-Question Timer** — Live stopwatch tracking responses to calculate average solving speeds.
- **Difficulty Badges** — Instant feedback with difficulty classification (Easy, Medium, Hard).
- **Celebration Confetti** — Interactive confetti trigger on scoring 80% or higher.
- **Session Resume** — State persisted via Zustand; quiz sessions survive page refreshes.

### 2. Authentication & Authorization Foundation
- **JWT Authorization** — Secure route protection using access tokens (short-lived) and rotation-based refresh tokens (stored securely).
- **Password Protection** — High-performance password hashing via the direct `bcrypt` library (fully compatible with Python 3.13).
- **Role-Based Access Control (RBAC)** — Backend dependencies distinguishing `student`, `faculty`, and `admin` roles.
- **Email Verification** — Signup token verification mechanism.

### 3. Profile & Preferences System
- **Custom Profiles** — Manage name, college, year, department/branch, and preferred coding language.
- **Preferences Panel** — Toggle push notifications and manage account preferences directly.
- **Public Handles** — Access and share public profile summaries under `/u/{username}`.

### 4. Gamification Engine
- **XP & Levels** — Earn experience points for answers and quiz completions. Dynamic level calculations based on cumulative XP (Levels 1–10).
- **Daily Active Streaks** — Visual calendar streak counter tracking consecutive days of quiz activity.
- **Unlockable Achievements** — Award system checking conditions like "First Quiz Completed" or "Perfect Score (100% Accuracy)".
- **In-App Notifications** — Receive notifications immediately on leveling up, updating streaks, or unlocking achievements.

### 5. Learning Tracks & Content Discovery
- **Personalized Recommendations** — Smart widgets pointing students to weak chapters and trending topics.
- **Structured Tracks** — Browse 4 learning paths: *Placement Prep*, *Full-Stack Development*, *AI & Machine Learning*, and *Cybersecurity*.
- **Daily Challenges** — Specialized, high-reward daily challenges matched to the current calendar date.

---

## 🏗️ Architecture

```
React + Vite  ──(Axios)──►  FastAPI  ──(Motor)──►  MongoDB
     │                          │
  Zustand                  slowapi / loguru
  (state + localStorage)   (rate limiting / logging)
```

The application uses an asynchronous REST API architecture built with **FastAPI** and **MongoDB**. Data exchanges are secured with JWT bearer tokens. The backend implements a robust **Service-Repository** pattern for separation of concerns, and the frontend is built using **Vite + React** with global store management powered by **Zustand**.

---

## 🛠️ Tech Stack

### Frontend
- **React 19 + Vite** — High-speed dev server and UI component rendering.
- **React Router 7** — Declared page navigation and route redirects.
- **Zustand** — Central store managing authentication, theme preferences, and quiz progress.
- **Framer Motion** — Dynamic animations for message bubbles and transitions.
- **Recharts** — Data charts mapping daily analytics and drop-off analysis.

### Backend
- **FastAPI** — Async web framework for high-throughput routing.
- **Motor** — Asynchronous MongoDB driver.
- **Bcrypt** — Cryptographic password hashing.
- **PyJWT / Python-Jose** — Secure JSON Web Token encoding/decoding.
- **slowapi** — Rate-limiting middleware.
- **loguru** — Standardized application logging.

---

## 💾 Database Collections & Schema

MongoDB indexes are automatically verified and built on application startup.

| Collection | Key Fields | Purpose |
|---|---|---|
| `users` | `_id`, `email` (unique), `username` (unique), `password_hash`, `xp`, `level`, `streak` | Student profiles and auth accounts |
| `refresh_tokens` | `_id`, `token` (unique), `user_id`, `expires_at` | Active sessions and rotation tracking |
| `learning_tracks` | `_id`, `title`, `description`, `modules` | Curriculum layout and learning paths |
| `exams` / `subjects` / `chapters` | Academic structural details mapping chapters to exams |
| `questions` | `_id`, `question_text`, `options`, `correct_option_id`, `difficulty` | MCQ database |
| `daily_challenges` | `_id`, `date_str`, `title`, `description`, `xp_reward` | Calendar challenges |
| `user_achievements` | `_id`, `user_id`, `achievement_id`, `unlocked_at` | Gamification tracking |
| `notifications` | `_id`, `user_id`, `message`, `is_read`, `created_at` | User alerts |

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB running locally (`mongodb://localhost:27017`)

### 1. Clone the Repository
```bash
git clone https://github.com/spoorthi2615/skillbytes-whatsapp-quiz-app.git
cd skillbytes-whatsapp-quiz-app
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=skillbytes_db
JWT_SECRET_KEY=changeme-use-a-real-secret-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

Seed the database collections, curriculums, and admin student account:
```bash
# Seed curriculums, tracks, and challenges
.\venv\Scripts\python -m app.scripts.seed_tracks

# Seed a default student login account (student@test.com / Test@123)
.\venv\Scripts\python -m app.scripts.seed_admin

# Seed general questions (optional)
.\venv\Scripts\python -m app.scripts.seed
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the Vite development server:
```bash
npm run dev
# Running at http://localhost:5173
```

---

## 🔌 API Endpoints

### 🔐 Authentication
- `POST` `/api/auth/register` — Create a student account.
- `POST` `/api/auth/login` — Sign in and get JWT tokens.
- `POST` `/api/auth/logout` — Revoke and clean refresh tokens.
- `POST` `/api/auth/refresh` — Rotate access and refresh tokens.
- `GET` `/api/auth/me` — Retrieve current authenticated user object.

### 👤 Profiles & Customization
- `GET` `/api/profile` — Fetch custom profile.
- `PUT` `/api/profile` — Update details (name, college, year, branch, language).
- `GET` `/api/u/{username}` — Public profile page (unauthenticated).
- `GET` `/api/preferences` — Get notification toggles.
- `PUT` `/api/preferences` — Save notification toggles.

### 📚 Learning Layer
- `GET` `/api/tracks` — Retrieve all learning tracks.
- `GET` `/api/daily-challenge` — Fetch challenge for the current date.
- `GET` `/api/recommendations` — Fetch weak topic recommendations.
- `GET` `/api/history` — Fetch student quiz completion history.

### 🏆 Gamification
- `GET` `/api/achievements/mine` — Retrieve unlocked achievements.
- `GET` `/api/notifications` — Fetch recent in-app user notifications.
- `PUT` `/api/notifications/read` — Mark notifications as read.

---

## 🔮 Things I'd Add in Phase 2

- **Redis Caching** — Cache exam lists and recommendations to speed up requests.
- **WebSockets** — Transition quiz session queries from HTTP polling to WebSockets.
- **CI/CD Pipeline** — Set up GitHub Actions for testing and lint verification on pull requests.
- **AI Recommendation Engine** — Use machine learning to analyze history and auto-suggest chapters.

---

## 📄 License

MIT License © [Spoorthi](https://github.com/spoorthi2615)
