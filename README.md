# ReadAca Malaysia

An AI-enhanced second-hand book marketplace for Malaysian students, built as a final year
project. ReadAca lets students buy, sell, and rent books with escrow-protected payments, gets
personalised recommendations powered by machine learning, and includes a conversational AI
assistant that actually knows your account.

**Live demo:** [read-aca-zeta.vercel.app](https://read-aca-zeta.vercel.app/)
**Backend API:** [read-aca-library.onrender.com](https://read-aca-library.onrender.com/)

> The backend runs on a free-tier host that sleeps after 15 minutes of inactivity. If the demo
> feels slow to load on first visit, that's a cold start, not a bug, give it a few seconds and
> reload.

---

## Features

### Marketplace
- Dual-mode listings for both direct sale and rental, with search, category filtering,
  condition/price filters, and seller-managed availability
- Content-based "similar books" suggestions using vector embeddings and PostgreSQL's `pgvector`
  extension
- Seller dashboard for creating listings (with cover image upload) and managing inventory

### Escrow-Based Transactions
- A custom wallet and append-only ledger, not just a balance field, every credit and debit is a
  traceable record
- Order payment is held in escrow on creation and only released to the seller once a sale is
  confirmed received or a rental is returned
- Full role-aware order lifecycle: sellers confirm and ship, buyers cancel, receive, or return

### Rental Management
- Rentals track due dates and a daily penalty rate
- Automated overdue detection via a scheduled background job, with a management-command fallback
  for hosting environments without a persistent worker

### AI Assistant
- A Gemini-powered conversational assistant, streamed to the frontend in real time over
  Server-Sent Events
- Each session starts with real context: your actual wallet balance, active rentals, and recent
  orders, not a generic chatbot

### Recommendations
- Collaborative filtering (scikit-learn) over logged user interactions, refreshed as a batch
  process
- Independent content-based similarity search over book embeddings, available even for a
  brand-new listing with no interaction history yet

### Accounts & Access Control
- JWT authentication with in-memory token storage on the frontend (no tokens in
  localStorage/cookies, by design)
- Three roles, buyer, seller, admin, enforced through custom Django REST Framework permission
  classes on every state-changing endpoint

---

## Tech Stack

| | |
|---|---|
| **Backend** | Django, Django REST Framework, PostgreSQL, pgvector |
| **Async / Background Jobs** | Celery, Redis (development), Django management-command fallback (production) |
| **Machine Learning** | scikit-learn (collaborative filtering), pgvector (embedding similarity) |
| **AI** | Google Gemini API, streamed via Server-Sent Events |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS, Zustand |
| **Media** | Cloudinary |
| **Testing** | pytest-django, factory_boy |
| **Deployment** | Render (backend), Vercel (frontend), Supabase (PostgreSQL) |

---

## Architecture

The backend is split into six Django apps, each owning one domain of the marketplace:

```
users            authentication, roles, wallet
inventory        listings, search, category & condition filtering, similarity search
transactions     orders, escrow, wallet ledger
rentals          rental records, due dates, overdue detection
ai_chat          Gemini-powered assistant, session context, SSE streaming
recommendations  interaction logging, collaborative filtering, cached recommendations
```

The frontend is a fully decoupled Next.js application that talks to the backend exclusively
through a JSON REST API, no server-rendered coupling between the two.

---

## Testing

The backend is covered by an automated pytest suite (16 tests) focused on the areas where a
silent defect would matter most: escrow and refund correctness, rental overdue idempotency, and
recommendation caching behaviour. This is backed by extensive manual end-to-end testing of every
user-facing flow against the real, deployed system.

```bash
pytest -v --reuse-db
```

Automated browser-based end-to-end testing (Selenium) was deliberately scoped out given project
time constraints, in favour of the automated suite above plus thorough manual verification. This
is a documented decision, not an oversight.

---

## Running Locally

**Backend**

```bash
git clone https://github.com/Abdulrafay-124/Read_Aca.git
cd Read_Aca
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # fill in your own database, Cloudinary, and Gemini credentials
python manage.py migrate
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL to your backend
npm run dev
```

**Background jobs (optional, for embedding generation and recommendation refresh)**

```bash
celery -A config worker --loglevel=info --pool=solo   # --pool=solo needed on Windows
```

---

## Deployment Notes

The production deployment deliberately does not run a Celery worker or a hosted Redis instance,
free-tier background workers aren't available on Render, and this project has no budget for paid
infrastructure. None of the core interactive features depend on this: async task dispatch is
wrapped so that a missing task queue degrades gracefully rather than blocking a request, and
recommendation refresh, embedding generation, and overdue detection are triggered manually via a
management command in this environment instead.

---

## Author

**Abdul Rafay**
Final Year Project, Bachelor of Information Technology, ALFA University College
[GitHub](https://github.com/Abdulrafay-124) · [LinkedIn](https://linkedin.com/in/rafay-abdul-1b2707271)
