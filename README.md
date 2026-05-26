# SkillBytes — WhatsApp-Style Quiz Platform

A full-stack quiz application that delivers MCQs through a chat interface inspired by WhatsApp. Built with React, FastAPI, and MongoDB — with a real-time analytics dashboard and session persistence.

> Take a quiz, get instant feedback, and track your progress over time.

---

## 🎥 Demo Video

Watch the full walkthrough and live project demo here:

[▶ Watch Demo on Loom](https://www.loom.com/share/d6856747a1d848a78fabb14aea55b58b)

---

## Features

- **Chat-style quiz flow** — questions arrive as animated chat bubbles with a typing indicator between transitions
- **Instant answer feedback** — correct/wrong highlighted immediately with a clear explanation
- **Difficulty badges** — each question is tagged Easy, Medium, or Hard
- **Randomized quizzes** — questions are randomly sampled from a pool; answer options are shuffled each time
- **Per-question timers** — a live stopwatch tracks how long each question takes
- **Progress bar** — smooth animated progress indicator across the top
- **Session persistence** — refresh the page mid-quiz and it resumes exactly where you left off (via localStorage)
- **Results screen** — score breakdown with accuracy, time spent, and motivational message; confetti fires for scores ≥ 80%
- **Analytics dashboard** — personal and global stats powered by MongoDB aggregation pipelines
- **Docker support** — spin up the entire stack with a single command

---

## Architecture

```
React + Vite  ──(Axios)──►  FastAPI  ──(Motor)──►  MongoDB
     │                          │
  Zustand                  slowapi / loguru
  (state + localStorage)   (rate limiting / logging)
```

The frontend is a React SPA built with Vite. State is managed by Zustand with a persist middleware so quiz progress survives a page refresh. API calls go to a FastAPI backend that follows a service-repository pattern — routes handle HTTP, services contain business logic, and repositories abstract the database layer. MongoDB stores everything from quiz sessions to granular answer events, which power the analytics.

---

## Tech Stack

### Frontend
| Library | Purpose |
|---|---|
| React 18 + Vite | UI framework + dev server |
| React Router | Page routing |
| Zustand | State management with localStorage persistence |
| Framer Motion | Chat bubble animations, hover/tap micro-interactions |
| Recharts | Analytics charts (Area, Bar, Pie) |
| react-hot-toast | Global API error notifications |
| react-confetti | Celebration on high scores |

### Backend
| Library | Purpose |
|---|---|
| FastAPI | Async REST API framework |
| Motor | Async MongoDB driver |
| Pydantic | Request/response validation |
| slowapi | Rate limiting |
| loguru | Structured logging |

### Database
- **MongoDB** — document store for quizzes, sessions, and analytics events

### DevOps
- **Docker + Docker Compose** — containerized multi-service setup

---

## Dataset & Quiz System

The seed script generates a realistic content hierarchy:

```
3 Exams (e.g. Software Engineering, Data Science, Cloud & DevOps)
  └── 9 Subjects
        └── 27 Chapters
              └── 279+ Questions  (8–12 per chapter)
```

Each question has a difficulty tag (`easy`, `medium`, `hard`) and a written explanation for the correct answer.

**Randomization:** The backend uses MongoDB's `$sample` to pick 5 random questions per quiz session. The answer options are then shuffled in Python before being sent to the client — so the correct answer won't always be in the same position.

---

## Analytics

The dashboard tracks 9 metrics using MongoDB aggregation pipelines:

| Metric | How It Works |
|---|---|
| Daily Active Users | Unique `user_id`s with a session `started_at` >= today |
| Weekly Active Users | Same, but over the past 7 days |
| Questions Served | Sum of `total_questions` across all sessions |
| Questions Answered | Count of `question_answered` events |
| Avg Response Time | `$avg` on `duration_ms` in the events collection |
| Completion Rate | Completed sessions / total sessions × 100 |
| Drop-off Analysis | Groups abandoned sessions by `current_question_index` |
| Peak Activity Hours | Extracts `$hour` from `started_at`, grouped into 24 buckets |
| Avg Questions/Session | Questions answered ÷ total sessions |

The dashboard has two views — **Your Stats** (filtered by anonymous user ID) and **Global Stats** (all users).

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB running locally (`localhost:27017`)

### 1. Clone the repo
```bash
git clone https://github.com/spoorthi2615/skillbytes-whatsapp-quiz-app.git
cd skillbytes-whatsapp-quiz-app
```

### 2. Backend setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=skillbytes_db
PROJECT_NAME=SkillBytes API
```

Seed the database:
```bash
.\venv\Scripts\python -m app.scripts.seed
# Inserted 279 unique questions across 27 chapters.
```

Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the dev server:
```bash
npm run dev
# Runs at http://localhost:5173
```

### 4. Docker (optional)
To run the full stack with Docker:
```bash
docker-compose up --build
```

- Frontend → `http://localhost:3000`
- Backend → `http://localhost:8000`
- MongoDB → `localhost:27017`

---

## Project Structure

```
skillbytes/
├── frontend/
│   ├── src/
│   │   ├── components/      # TypingIndicator and shared UI
│   │   ├── pages/           # Dashboard, QuizSession, Results, Analytics
│   │   ├── services/        # api.js — Axios setup with interceptors
│   │   ├── store/           # quizStore.js — Zustand with persist
│   │   └── App.jsx          # Routes + lazy loading + Toaster
│   ├── .env
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── core/            # DB connection, config
│   │   ├── middleware/      # Rate limiter
│   │   ├── repositories/    # DB abstraction layer
│   │   ├── routes/          # API endpoints
│   │   ├── schemas/         # Pydantic models
│   │   ├── scripts/         # seed.py
│   │   ├── services/        # Business logic + analytics aggregations
│   │   └── main.py
│   ├── .env
│   └── requirements.txt
│
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/exams` | List all exams |
| `GET` | `/api/exams/{id}/subjects` | Subjects for an exam |
| `GET` | `/api/subjects/{id}/chapters` | Chapters for a subject |
| `GET` | `/api/chapters/{id}/questions` | 5 randomized questions |
| `POST` | `/api/quiz/start` | Create a new quiz session |
| `POST` | `/api/quiz/{id}/answer` | Submit an answer and record the event |
| `POST` | `/api/quiz/{id}/complete` | Mark session complete, return results |
| `GET` | `/api/analytics/dashboard` | Full analytics payload |
| `GET` | `/health` | Health check |

---

## Things I'd Add Next

- **Redis caching** for the exam/subject/chapter lists (they don't change often, no need to hit MongoDB every time)
- **WebSocket connection** for the quiz session — would make the chat feel more real-time
- **Proper user accounts** with JWT auth, if this were going to production
- **CI/CD pipeline** with GitHub Actions for automated testing and deployment
- **Deployment** — the Docker setup makes it straightforward to host on a VPS (Railway, Render, or DigitalOcean)

---

## License

MIT License © [Spoorthi](https://github.com/spoorthi2615)
