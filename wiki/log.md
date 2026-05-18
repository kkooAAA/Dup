# Wiki Log

## [2026-05-18] lint + expand | Health check and missing topics

**Lint fixes (8 issues):**
- Fixed 4 broken `[[links]]` in `draft-system.md` — replaced with inline code references since those sub-services don't need dedicated pages
- Fixed 4 inconsistent link names across 5 pages: `[[duplication-controller]]` → `[[controllers]]`, `[[frontend-pages]]` → `[[pages]]`, `[[frontend-components]]` → `[[components]]`, `[[api-client]]` → `[[state-management]]`

**New pages (4):**
- `pages/architecture/database-schema.md` — Full Prisma schema documentation (User, Draft entities, DuplicateJob, NamingTemplate, DraftPublishLog)
- `pages/architecture/auth-flow.md` — Facebook OAuth flow, token exchange, JWT lifecycle
- `pages/architecture/setup.md` — Local dev setup guide, env vars, scripts, FB app requirements
- `pages/concepts/naming-templates.md` — Naming template system (CRUD, default handling)

**Verified accurate:** Test count (1267), coverage (98.85%/99.38%), API version (v21.0), all field definitions, all service files exist

## [2026-05-17] init | Full wiki creation

Initial wiki created from codebase analysis. Generated pages covering:
- Architecture overview and tech stack
- All 11 backend draft services
- Core services (FacebookService, ObjectiveConversionService)
- All 6 Meta objectives with compatibility maps
- Domain concepts (CBO, promoted objects, destination types, optimization goals, Meta API constraints)
- Frontend pages, components, and state management
- API routes and controllers
- Testing strategy and coverage
