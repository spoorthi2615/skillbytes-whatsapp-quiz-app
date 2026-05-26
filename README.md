# SkillBytes — WhatsApp-Style Quiz Platform

> **A production-grade, full-stack, interactive learning platform** built with React, FastAPI, and MongoDB. Delivers MCQ quizzes through a gamified, WhatsApp-inspired chat interface with advanced real-time analytics.

---

## ✨ Features

| Category | Details |
|----------|---------|
| 🎯 **Quiz Engine** | 279+ randomized MCQs • MongoDB `$sample` • Option shuffling |
| 💬 **Chat UX** | WhatsApp-style bubbles • Typing indicators • Framer Motion animations |
| 📊 **Analytics** | DAU/WAU • Completion Rate • Drop-off Analysis • Peak Hours |
| 🔀 **Randomization** | Different 5-question subset every session • Shuffled options every load |
| 🎉 **Celebration** | Confetti for 80%+ scores • Spring-animated score reveals |
| 🏷️ **Difficulty Badges** | 🟢 Easy • 🟡 Medium • 🔴 Hard — shown on every question |
| 📱 **Mobile-First** | Responsive on all screen sizes • Sticky chat header |
| 🔒 **Production** | Rate limiting • Structured logging • Dockerized deployment |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React 18 + Vite (Frontend)                             │
│  Zustand Persist  │  Framer Motion  │  Recharts         │
└───────────────────────────┬─────────────────────────────┘
                            │ Axios + REST API
┌───────────────────────────▼─────────────────────────────┐
│  FastAPI + Uvicorn (Backend)                            │
│  Service Layer  │  Repository Pattern  │  Pydantic      │
│  slowapi (rate limiting)  │  loguru (logging)           │
└───────────────────────────┬─────────────────────────────┘
                            │ Motor (async driver)
┌───────────────────────────▼─────────────────────────────┐
│  MongoDB                                                │
│  quiz_sessions  │  quiz_events  │  questions            │
│  users  │  exams  │  subjects  │  chapters             │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** — HMR dev server, code-splitting via `React.lazy`
- **Zustand** (with `persist` middleware) — zero-boilerplate state + resume after refresh
- **Framer Motion** — physics-based chat animations, spring score reveals
- **Recharts** — responsive SVG charts (Area, Bar, Pie) with gradients
- **react-hot-toast** — global API error notifications via Axios interceptors
- **react-confetti** — celebration for high scores (≥80%)

### Backend
- **FastAPI** (Python 3.10+) — async ASGI framework
- **Motor** — non-blocking async MongoDB driver
- **slowapi** — sliding-window rate limiting
- **loguru** — structured, color-coded logging to file + stdout
- **Pydantic** — strict JSON body validation

### Database
- **MongoDB** — 7 collections with timeseries event sourcing
- Aggregation pipelines for: DAU/WAU, Drop-off analysis, Peak activity hours

### DevOps
- **Docker** + **Docker Compose** — multi-container orchestration
- **Nginx** — static asset serving + reverse proxy ready

---

## 📦 Dataset Scale

```
3 Exams
  └── 9 Subjects (3 each)
        └── 27 Chapters (3 each)
              └── 279+ Questions (8–12 per chapter)
                    ├── difficulty: easy | medium | hard
                    ├── 4 shuffled options per question
                    └── detailed explanations
```

---

## 📊 Analytics Dashboard

9 real-time metrics powered by MongoDB aggregation pipelines:

| Metric | Description |
|--------|-------------|
| 📅 DAU | Daily Active Users |
| 📆 WAU | Weekly Active Users |
| ❓ Questions Served | Total questions presented |
| ✅ Questions Answered | Total answers submitted |
| ⏱️ Avg Response Time | Mean `duration_ms` from `quiz_events` |
| 🏁 Completion Rate | Completed sessions / total sessions |
| 📉 Drop-off Analysis | Where users abandon (by question index) |
| 🕐 Peak Activity Hours | Hourly session distribution (24-hour) |
| 📈 Avg Q/Session | Questions answered ÷ total sessions |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB running locally on `localhost:27017`

### 1. Clone & Setup Backend
```bash
git clone https://github.com/spoorthi2615/skillbytes-whatsapp-quiz-app.git
cd skillbytes/backend

python -m venv venv
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate  (Linux/Mac)

pip install -r requirements.txt
```

### 2. Configure Environment
Create `backend/.env`:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=skillbytes_db
PROJECT_NAME=SkillBytes Quiz API
```

### 3. Seed the Database
```bash
.\venv\Scripts\python -m app.scripts.seed
# Output: Dummy data seeded successfully! Inserted 279 unique questions across 27 chapters.
```

### 4. Start Backend
```bash
.\venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### 5. Setup & Start Frontend
```bash
cd ../frontend
npm install

# Create frontend/.env
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

npm run dev
# Runs at http://localhost:5173
```

---

## 🐳 Docker Setup

```bash
cd skillbytes
docker-compose up --build
```

Services:
- Frontend → `http://localhost:3000`
- Backend → `http://localhost:8000`
- MongoDB → `localhost:27017`

---

## 🗂️ Project Structure

```
skillbytes/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, QuizSession, Results, Analytics
│   │   ├── components/      # TypingIndicator, reusable UI
│   │   ├── services/        # api.js (Axios + interceptors)
│   │   ├── store/           # quizStore.js (Zustand + persist)
│   │   └── App.jsx          # Routing + lazy loading + Toaster
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── routes/          # api.py (all endpoints)
│   │   ├── services/        # exam_service, quiz_service, analytics_service
│   │   ├── repositories/    # base.py + quiz_repo.py
│   │   ├── schemas/         # Pydantic domain models
│   │   ├── middleware/      # rate_limiter.py
│   │   ├── scripts/         # seed.py
│   │   └── main.py          # FastAPI app entry
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exams` | Fetch all exams |
| GET | `/api/exams/{id}/subjects` | Get subjects |
| GET | `/api/subjects/{id}/chapters` | Get chapters |
| GET | `/api/chapters/{id}/questions` | Get 5 random questions |
| POST | `/api/quiz/start` | Create quiz session |
| POST | `/api/quiz/{id}/answer` | Submit answer + track event |
| POST | `/api/quiz/{id}/complete` | Complete + calculate score |
| GET | `/api/analytics/dashboard` | Full analytics payload |

---

## 👨‍💻 Developer Level

This project demonstrates **Mid-to-Senior Full-Stack Engineering** capabilities:
- Event sourcing with timeseries collections
- Complex MongoDB aggregation pipelines
- Physics-based UI state machines with session persistence
- Production-hardened architecture (rate limiting, structured logging, Docker)
- Mathematical safeguards against impossible data states

---

## 📄 License

MIT — Built with ❤️ by [Spoorthi](https://github.com/spoorthi2615)
