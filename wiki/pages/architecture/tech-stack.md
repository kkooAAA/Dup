# Tech Stack

## Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| External API | Meta Marketing API v21.0 |
| Auth | JWT (Facebook OAuth login) |
| Testing | Vitest |

Source: `backend/`

## Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component library | shadcn/ui |
| State management | Zustand |
| HTTP client | Axios |
| FB SDK | Facebook JavaScript SDK v21.0 |

Source: `frontend/`

## Key Dependencies

- **Prisma** manages the PostgreSQL schema for drafts (DraftCampaign, DraftAdSet, DraftAd), users, and templates
- **Axios** with JWT interceptor handles all backend API calls; auto-redirects to `/login` on 401
- **Zustand** stores global app state (user, ad accounts, selected account) and wide creation state (template structure)
- **shadcn/ui** provides the base component library (buttons, dialogs, tables, forms)
