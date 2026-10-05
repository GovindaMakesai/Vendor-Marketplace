# Intelligent Vendor Recommendation Platform

Operations teams use this platform to keep a vendor register, record compliance document metadata, open work requirements, and rank eligible vendors with a deterministic score. An optional AI summary explains the stored ranking. It does not choose the winner.

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

## Architecture

```text
client/   React + Vite dashboard
server/   Express API, recommendation service, Prisma
PostgreSQL
```

HTTP requests enter Express routes, pass through validation and authentication, and call a service. Controllers do not calculate scores. `RecommendationService` loads vendors and delegates scoring to pure functions in `server/src/services/scoring.ts`. Those functions do not read the database and do not use randomness.

The AI module receives the already stored ranking. If the model is unavailable, the API returns a summary built from the same records and marks it `generatedBy: "fallback"`.

## Technology Stack

- React, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS
- Node.js, Express, TypeScript, Zod, JWT, bcrypt, Helmet, CORS, express-rate-limit
- PostgreSQL and Prisma
- OpenAI Node SDK, used only for the narrative summary
- Swagger UI

## Database Design

| Entity | Responsibility |
| --- | --- |
| User | Operations or admin account. Email is unique. Password is stored as a hash. |
| Vendor | Company profile, location, rating, and status. |
| VendorDocument | Metadata for a compliance document. No file bytes are stored. |
| WorkRequirement | A piece of work that needs a vendor, owned by the user who created it. |
| Recommendation | One stored score for a vendor against a requirement. |

Monetary values and scores use `Decimal`. Reasons and warnings are JSON arrays. Deleting a vendor removes its documents and recommendations. Deleting a work requirement removes its recommendations. Users are not cascade-deleted.

Indexes cover vendor status, category, and city; document vendor, expiry, and status; requirement category, location, status, and priority; and recommendation requirement, vendor, and score. A vendor can have only one recommendation per requirement. A document number is unique for a vendor and document type.

## Database Relationships

```text
User 1 ── * WorkRequirement 1 ── * Recommendation * ── 1 Vendor
Vendor 1 ── * VendorDocument
```

## API Design

All JSON responses use `{ success, data }` or `{ success: false, error: { code, message, details } }`.

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

## Recommendation Algorithm

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

## AI Architecture

```text
Deterministic Recommendation Engine
             ↓
        AI Explanation
             ↓
       Structured Output
```

Business rules stay deterministic. The recommendation engine decides eligibility, compliance, score, and rank. OpenAI is only a decision-support explanation layer. It receives the already calculated result for the leading vendor and must not change the score or the ranking.

`POST /api/work-requirements/:id/ai-summary` is authenticated and is called only when an operator clicks **Generate AI Summary**. Loading the dashboard, vendors, work requirements, or recommendations does not call OpenAI.

The server reads `OPENAI_MODEL` from the environment and calls the OpenAI Responses API with structured output. The model must return `summary`, `strengths`, `risks`, `tradeoffs`, and `recommendation`. The application checks that payload again with Zod. A successful response is marked `generatedBy: "openai"`.

If the API key is missing, AI is disabled, the daily limit is reached, the request times out, the provider returns an error, or the payload is invalid, the API builds the same sections from the stored ranking and marks them `generatedBy: "fallback"`. `AI_PROVIDER=mock` returns a local sample and does not call OpenAI. Automatic retries are disabled. Each summary request makes at most one OpenAI call.

Development usage is limited by `AI_DAILY_REQUEST_LIMIT` (20 by default). The counter is stored in `ai_usage_daily` and resets on the next UTC calendar date. The OpenAI API key stays in the server environment. It is not sent to the browser, written into API responses, or recorded in logs.

## Security

- Passwords are hashed with bcrypt
- JWTs are signed with `JWT_SECRET` and expire according to `JWT_EXPIRES_IN`
- Password hashes are never returned
- Helmet and CORS are enabled. The browser origin must match `CLIENT_URL`
- Auth routes are rate limited
- Request bodies are validated with Zod
- Production error responses do not include stack traces
- Logs do not record passwords, tokens, database URLs, or API keys
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
CLIENT_URL=http://localhost:5173
PORT=5000
```

`DATABASE_URL` should be the pooled Supabase connection. `DIRECT_URL` should be the direct connection used by Prisma migrations. Leave `OPENAI_API_KEY` empty to use the fallback summary. Change `OPENAI_MODEL` to switch models without editing source code. Set `AI_PROVIDER=mock` while building the interface so no OpenAI credit is used.

Frontend:

```text
VITE_API_URL=http://localhost:5000/api
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

Frontend: deploy `client/` to Vercel. Set `VITE_API_URL` to `https://<api-host>/api`. `client/vercel.json` rewrites application routes to `index.html`.

Backend: deploy `server/` to a Render-compatible Node service.

```text
Build:  npm install --include=dev && npm run build
Start:  npm run start
Release: npx prisma migrate deploy
```

Set `CLIENT_URL` to the deployed frontend origin. Do not put database credentials, `JWT_SECRET`, or `OPENAI_API_KEY` in frontend environment variables.

`GET /health` returns `{ "success": true, "message": "API is healthy" }`.

## Assumptions

- The workspace root is the application root. `client/` and `server/` live beside this README.
- Required compliance documents are tax registration, insurance, and trade license.
- A past expiry date overrides a requested status and is stored as `EXPIRED`. `PENDING` and `REJECTED` are kept only while the document has not expired.
- New work requirements default to `OPEN` when the client does not send a status.
- Both authenticated roles can use the operational APIs. Registration cannot self-assign `ADMIN`.
- Displayed money uses Australian dollars. The database stores the number only.
- Rank filters such as `minScore` do not renumber the original ranks.

## Trade-offs

- The service is one Express process. Background queues, caching, and a separate worker are unnecessary at this size.
- Document files are metadata only, so there is no object storage or virus scanning.
- API tests mock Prisma. They prove request handling and scoring integration without requiring Supabase during unit tests. Migration and seed still need the real database.
- Helmet's content security policy is relaxed so Swagger UI can load. The other Helmet headers remain enabled.
- The AI call is short, stateless, and has no retry loop. A failed call returns the deterministic summary instead of blocking the user. The daily counter is the credit-protection limit.

## Future Improvements

- Role checks that limit deletion to administrators
- A scheduled job that marks expired documents without waiting for a read
- Persisted AI summaries so the dashboard can show the last narrative
- File storage for the document metadata that already has a file name and URL
- Audit history for score regeneration
