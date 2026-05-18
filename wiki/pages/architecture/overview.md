# Architecture Overview

CloneZone is a full-stack tool for duplicating, converting, and bulk-managing Meta (Facebook) ad campaigns. It lets users clone existing campaigns, convert between objectives, edit drafts locally, and publish back to Meta.

## High-Level Design

```
┌──────────────────────────────────────────────────┐
│                   Frontend                        │
│  Next.js App Router + Tailwind + shadcn/ui        │
│  Zustand state management                         │
│  Pages: Login, Dashboard, Explorer, Drafts,       │
│         Wide Create, History                      │
└───────────────┬──────────────────────────────────┘
                │ Axios (JWT auth)
                ▼
┌──────────────────────────────────────────────────┐
│                   Backend                         │
│  Express.js + TypeScript                          │
│  Controllers → Services → Meta API / Prisma       │
│                                                   │
│  Core flows:                                      │
│  1. Live Duplication (direct Meta API)             │
│  2. Objective Conversion (direct Meta API)         │
│  3. Draft System (local DB → validate → publish)   │
│  4. Wide Creation (template → bulk drafts)         │
└───────────┬───────────────┬──────────────────────┘
            │               │
            ▼               ▼
     ┌────────────┐   ┌──────────────┐
     │ PostgreSQL  │   │ Meta Graph   │
     │ (Prisma)    │   │ API v21.0    │
     └────────────┘   └──────────────┘
```

## Four Core Flows

1. **Live Duplication** — Clone campaigns/adsets/ads directly on Meta via the Graph API. Handled by [[duplication-controller]] and [[facebook-service]].

2. **Objective Conversion** — Convert a campaign from one objective to another (e.g. Awareness → Sales). Creates new entities on Meta with transformed fields. Handled by [[objective-conversion-service]].

3. **Draft System** — Import Meta campaigns into a local PostgreSQL database as editable drafts. Users modify fields via dynamic forms, validate against Meta constraints, then publish back. Handled by [[draft-system]].

4. **Wide Creation** — Bulk-create campaign structures from templates. Define a template with N campaigns × M adsets × K ads, configure naming patterns and field inheritance, then generate all drafts at once. Handled by [[wide-creation-service]].

## Key Design Decisions

- All new objects are created with `status: PAUSED` to prevent accidental spend
- The [[meta-field-registry]] is the single source of truth for all Meta field definitions, valid enums, and defaults
- The [[field-optimization-engine]] transforms raw Meta data into valid payloads (strips read-only fields, resolves budget conflicts, migrates optimization goals)
- Frontend forms are generated dynamically from backend schemas via [[meta-form-schema-engine]]
