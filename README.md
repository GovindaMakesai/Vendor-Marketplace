# Intelligent Vendor Recommendation Platform

Operations teams use this platform to keep a vendor register, record compliance document metadata, open work requirements, and rank eligible vendors with a deterministic score. An optional AI summary explains the stored ranking. It does not choose the winner.

## Live application

| | |
| --- | --- |
| Dashboard | https://vendor-marketplace-chi.vercel.app/login |
| Email | `admin@demo.vendor.local` |
| Password | `DemoAdmin#2026` |
| API | https://vendor-marketplace-cmhd.onrender.com/api |
| API docs | https://vendor-marketplace-cmhd.onrender.com/api/docs |
| GitHub | https://github.com/GovindaMakesai/Vendor-Marketplace |

The free API can take up to a minute to wake before the first login succeeds.

## Overview

The application is a single Node.js API and a React dashboard, backed by PostgreSQL. Recommendation scores are calculated in the API from the current vendor and document records. Regenerating a requirement with the same data produces the same order.

## Features

- Email and password authentication with JWT
- Vendor register with search, filters, and pagination
- Compliance document metadata, including automatic expiry handling
- Work requirements with priority, value, and status
- Explainable 100-point vendor ranking
- AI summary with a deterministic fallback when no API key is configured
- Dashboard counts, recent requirements, and current top recommendations
- OpenAPI documentation at `/api/docs`

## Project Architecture

```text
Browser (React dashboard on Vercel)
        │  HTTPS, JWT in the Authorization header
        ▼
Express API on Render  (/api, /health)
        │
        ├── Zod validation and auth middleware
        ├── Services: vendors, documents, requirements, dashboard
        ├── RecommendationService → pure scoring functions
        └── AI explanation module → OpenAI, or a local fallback
        │
        ▼
PostgreSQL on Supabase, accessed with Prisma
```

The repository is a monorepo. `client/` is the React dashboard. `server/` is the API. They deploy separately: the dashboard is on Vercel, the API is on Render, and the database is Supabase PostgreSQL. The browser calls the Render API directly. Requests to `/api` and `/health` on the Vercel domain are also forwarded to Render, so a same-origin call still reaches the API.

A request passes through Helmet, CORS, rate limits, and a Zod schema before a controller runs. Controllers do not calculate scores. `RecommendationService` loads vendors and documents, then calls pure functions in `server/src/services/scoring.ts`. Those functions do not read the database and do not use randomness. The AI module runs only after a ranking has been stored, and only when an operator clicks **Generate AI Summary**.

## Technology Stack

- React, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS
- Node.js, Express, TypeScript, Zod, JWT, bcrypt, Helmet, CORS, express-rate-limit
- PostgreSQL and Prisma
- OpenAI Node SDK, used only for the narrative summary
- Swagger UI

## Database Design

PostgreSQL stores operational records. Prisma maps each model to a table. Primary keys are CUIDs. Money, ratings, and scores use `Decimal` so totals are not binary floating-point values. Reasons and warnings are JSON arrays.

| Table | What it stores |
| --- | --- |
| `users` | Name, unique email, bcrypt `passwordHash`, and role `ADMIN` or `OPERATIONS`. |
| `vendors` | Profile, category, city, state, country, rating (`Decimal(3,2)`), and status `ACTIVE`, `INACTIVE`, or `SUSPENDED`. |
| `vendor_documents` | Document type, number, issued date, expiry date, status, and optional file name, URL, and notes. The file itself is not stored. |
| `work_requirements` | Title, description, category, one location string, estimated value, priority, expected start date, status, and the user who created it. |
| `recommendations` | One stored score per vendor for a requirement: total, rank, level, the five component scores, reasons, and warnings. |
| `ai_usage_daily` | One row per UTC date and the number of OpenAI summary calls made that day. |

Document types are `TAX_REGISTRATION`, `INSURANCE`, `TRADE_LICENSE`, `SAFETY_CERTIFICATE`, `AGREEMENT`, and `OTHER`. Document status is `VALID`, `EXPIRED`, `PENDING`, or `REJECTED`. Requirement status moves from `DRAFT` or `OPEN` to `RECOMMENDATIONS_GENERATED`, and can later be `AWARDED` or `CLOSED`. Recommendation level is `HIGHLY_RECOMMENDED`, `RECOMMENDED`, `CONSIDER`, or `NOT_RECOMMENDED`.

A vendor and document type can store a document number only once. A vendor can have only one recommendation row per work requirement. Deleting a vendor removes its documents and recommendations. Deleting a work requirement removes its recommendations. Deleting a user is restricted while that user still owns work requirements.

Indexes cover vendor status, category, and city; document vendor, expiry, and status; requirement category, location, status, and priority; and recommendation requirement, vendor, and score. `ai_usage_daily.usageDate` is unique.

## Database Relationships

```text
User 1 ── * WorkRequirement 1 ── * Recommendation * ── 1 Vendor
Vendor 1 ── * VendorDocument
```

## API Design

The API is REST over JSON. Every success response is `{ success: true, data }`. Every failure is `{ success: false, error: { code, message, details } }`. List endpoints use `page` and `limit`. Zod rejects an invalid body with `400 VALIDATION_ERROR` and a field path in `details`. Unknown records return `404`. Awarded or closed requirements return `409` if recommendations are generated again.

Authentication is a bearer JWT. Vendor, document, requirement, recommendation, dashboard, and AI routes require `Authorization: Bearer <token>`. Register and login are public and rate limited. Registration always creates an `OPERATIONS` user. `GET /health` does not touch the database. Interactive documentation is at `/api/docs`.

Dates sent by the client must fall between the years 1900 and 9999. A year outside that range is a validation error, because PostgreSQL cannot store it. An expiry date must be on or after the issued date.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an operations user |
| POST | `/api/auth/login` | Return a bearer token |
| GET | `/api/auth/me` | Current user |
| GET, POST | `/api/vendors` | List or create vendors |
| GET, PUT, DELETE | `/api/vendors/:id` | Read, update, or delete a vendor |
| GET, POST | `/api/vendors/:vendorId/documents` | List or store document metadata |
| GET, PUT, DELETE | `/api/vendors/:vendorId/documents/:documentId` | Read, update, or delete a document |
| GET, POST | `/api/work-requirements` | List or create requirements |
| GET, PUT, DELETE | `/api/work-requirements/:id` | Read, update, or delete a requirement |
| POST | `/api/work-requirements/:id/recommendations` | Calculate and store rankings |
| GET | `/api/work-requirements/:id/recommendations` | Read stored rankings. Supports `limit` and `minScore` |
| POST | `/api/work-requirements/:id/ai-summary` | Explain the stored ranking |
| GET | `/api/dashboard/stats` | Counts, recent requirements, and top rank-1 vendors |
| GET | `/health` | Health check |
| GET | `/api/docs` | Swagger UI |

Vendor, document, requirement, recommendation, and dashboard routes require `Authorization: Bearer <token>`.

## Recommendation Logic

Only `ACTIVE` vendors are ranked. `INACTIVE` and `SUSPENDED` vendors are excluded before scoring.

| Component | Points | Rule |
| --- | --- | --- |
| Category | 30 | Exact category match, otherwise 0 |
| Location | 20 | Exact city match is 20. Same state or broader region is 10. Otherwise 0 |
| Rating | 20 | `(rating / 5) * 20` |
| Compliance | 20 | Required documents: tax registration, insurance, and trade license |
| Status | 10 | Active vendors |

Each required document is worth one third of the compliance points. A valid document receives its full share. A pending document receives half. A missing, expired, or rejected document receives none. A valid document that expires within 30 days adds a warning and does not reduce the score. Optional documents can add warnings, but they do not change the 20-point compliance pool.

The requirement stores a single location string. A vendor scores 20 when that string matches the vendor city, including the city part of `City, State`. The broader region is the text after a comma, the location itself when it names a state, or the single state shared by vendors in the named city. A vendor in that region, but not in the city, scores 10.

Levels:

- 80–100: `HIGHLY_RECOMMENDED`
- 65–79.99: `RECOMMENDED`
- 50–64.99: `CONSIDER`
- Below 50: `NOT_RECOMMENDED`

When scores are equal, the higher vendor rating wins, then the higher compliance score, then the vendor name in alphabetical order.

Generating recommendations replaces the stored rows for that requirement and sets its status to `RECOMMENDATIONS_GENERATED`. Awarded and closed requirements are left unchanged.

## AI Usage

```text
Stored ranking (already calculated)
        ↓
POST /api/work-requirements/:id/ai-summary
        ↓
OpenAI Responses API, structured JSON
        ↓
summary, strengths, risks, tradeoffs, recommendation
```

The model explains the rank-1 vendor. It also receives the names and scores of the top three so the narrative can mention the order. It does not receive tools, and it is instructed not to change eligibility, compliance, score, rank, or the selected vendor. It must not invent documents, certifications, or history that are not in the stored result.

The route is authenticated and runs only when an operator clicks **Generate AI Summary**. Opening the dashboard, vendors, requirements, or the ranking does not call OpenAI. The server reads `OPENAI_MODEL` from the environment. The call uses the official Node SDK, `store: false`, no tools, no automatic retries, a 15 second timeout, and a short output limit. The response is checked again with Zod. A valid response is marked `generatedBy: "openai"`.

One HTTP request makes at most one OpenAI call. The daily cap is `AI_DAILY_REQUEST_LIMIT` (20 by default), counted in `ai_usage_daily` for the current UTC date. If the key is missing, AI is disabled, the limit is reached, the call times out, the provider errors, or the JSON is invalid, the API writes the same five sections from the stored scores and warnings and marks them `generatedBy: "fallback"`. `AI_PROVIDER=mock` returns a local sample and does not call OpenAI or increment the counter. The API key stays in the server environment. It is not sent to the browser or written into API responses. Log lines redact values that look like OpenAI keys.

## Security

- Passwords are hashed with bcrypt
- JWTs are signed with `JWT_SECRET` and expire according to `JWT_EXPIRES_IN`
- Password hashes are never returned
- Helmet and CORS are enabled. The browser origin must match `CLIENT_URL`
- Auth routes are rate limited
- Request bodies are validated with Zod
- Production error responses do not include stack traces
- Application logs do not include passwords or tokens. Values that look like OpenAI keys are redacted
- The frontend receives only `VITE_API_URL`

Self-registration creates an `OPERATIONS` user. The seeded administrator is created by the seed script.

## Testing

Backend tests cover the recommendation rules, authentication, vendor and requirement APIs, the OpenAI explanation provider, fallback and mock behaviour, the daily AI limit, and rejection of unauthenticated summary requests. Recommendation tests call the scoring service directly. API tests use an in-memory stand-in for Prisma so they do not need a running database. AI provider tests use a stand-in client and do not call OpenAI.

```bash
npm test --prefix server
```

## Local Development

Use Node.js 22.

```bash
npm install
npm install --prefix server
npm install --prefix client
```

Copy `server/.env.example` to `server/.env` and fill in the database and JWT values. Copy `client/.env.example` to `client/.env` if the API is not on `http://localhost:5000/api`.

```bash
npm run dev
```

The API listens on port 5000. The dashboard listens on port 5173.

## Environment Variables

Server:

```text
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
AI_ENABLED=true
AI_PROVIDER=openai
AI_DAILY_REQUEST_LIMIT=20
AI_MAX_OUTPUT_TOKENS=300
AI_TIMEOUT_MS=15000
CLIENT_URL=https://vendor-marketplace-chi.vercel.app
PORT=5000
```

`DATABASE_URL` should be the pooled Supabase connection. `DIRECT_URL` should be the direct connection used by Prisma migrations. Leave `OPENAI_API_KEY` empty to use the fallback summary. Change `OPENAI_MODEL` to switch models without editing source code. Set `AI_PROVIDER=mock` while building the interface so no OpenAI credit is used.

Frontend:

```text
VITE_API_URL=https://vendor-marketplace-cmhd.onrender.com/api
```

## Database Setup

From `server/`:

```bash
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

Production applies existing migrations and does not create new ones at startup:

```bash
npx prisma migrate deploy
```

## Seed Data

The seed replaces existing application rows with clearly labelled demo records: one administrator, 12 vendors, 37 documents, and 6 work requirements. The set includes exact city matches, same-state matches, high and low ratings, expired, pending, rejected, and missing documents, plus inactive and suspended vendors.

```text
admin@demo.vendor.local
DemoAdmin#2026
```

## Deployment

The live dashboard is [https://vendor-marketplace-chi.vercel.app](https://vendor-marketplace-chi.vercel.app). The live API is [https://vendor-marketplace-cmhd.onrender.com](https://vendor-marketplace-cmhd.onrender.com). The production dashboard calls `https://vendor-marketplace-cmhd.onrender.com/api`. The API allows the Vercel origin.

On Render, the start command must be `npm run start`. The build command is `npm install --include=dev && npm run build`. Set `CLIENT_URL` to `https://vendor-marketplace-chi.vercel.app`.

On Vercel, leave `VITE_API_URL` unset so the dashboard uses the Render API above. Do not put database credentials, `JWT_SECRET`, or `OPENAI_API_KEY` in Vercel.

```text
Build:  npm install --include=dev && npm run build
Start:  npm run start
Release: npx prisma migrate deploy
```

Do not put database credentials, `JWT_SECRET`, or `OPENAI_API_KEY` in frontend environment variables.

`GET /health` returns `{ "success": true, "message": "API is healthy" }`.

## Assumptions

- The workspace root is the application root. `client/` and `server/` live beside this README.
- Supabase is used as PostgreSQL only. Sign-in is the application's own bcrypt and JWT flow, not Supabase Auth.
- Required compliance documents are tax registration, insurance, and trade license. Safety certificates, agreements, and other files can add warnings only.
- Category match is an exact comparison after trimming and lowercasing. Close names do not score partial category points.
- A work requirement has one location string. A same-city match is 20 points. The same state, or the region inferred from that string, is 10.
- A past expiry date overrides a requested status and is stored as `EXPIRED`. `PENDING` and `REJECTED` are kept only while the document has not expired.
- New work requirements default to `OPEN` when the client does not send a status. The database default, used outside that route, is `DRAFT`.
- Both authenticated roles can use the operational APIs. Registration cannot self-assign `ADMIN`.
- Displayed money uses Australian dollars. The database stores the number only.
- `limit` and `minScore` filter the stored list. They do not renumber the original ranks.
- The AI summary explains the current rank-1 vendor. It is not a second scoring pass.

## Trade-offs

- The API is one Express process. Background queues, caching, and a separate worker are unnecessary at this size.
- The dashboard and API are hosted separately. Render's free instance cannot reach the IPv6-only direct database host, so runtime uses the IPv4 Supabase pooler in session mode. Migrations use `DIRECT_URL`, which must also be a host that the machine running them can reach.
- Document files are metadata only, so there is no object storage or virus scanning.
- Scores are replaced, not versioned. Generating recommendations again deletes the previous rows for that requirement. There is no audit trail of an earlier ranking.
- The AI narrative covers the leading vendor, with the top three names for context. It does not write a separate explanation for every ranked vendor.
- The AI call is short, stateless, and has no retry loop. A failed call returns the deterministic summary instead of blocking the operator. The daily counter is the credit-protection limit, and it is global for the UTC day rather than per user.
- API tests use an in-memory stand-in for Prisma. They prove request handling and scoring integration without requiring Supabase. Migration and seed still need the real database.
- Helmet's content security policy is relaxed so Swagger UI can load. The other Helmet headers remain enabled.

## Future Improvements

- Role checks that limit deletion to administrators
- A scheduled job that marks expired documents without waiting for a read
- Persisted AI summaries so the dashboard can show the last narrative
- File storage for the document metadata that already has a file name and URL
- Audit history for score regeneration
