# MOMS — Media Operations Management System

> **This README describes the current state of the codebase.** Every section was verified against the source. Where the code and the schema disagree, the code is documented as-is and the discrepancy is called out in [Known Issues](#16-known-issues--pending-work).

---

## 1. Project Overview

### Purpose

MOMS is an internal operations platform for a **media production agency**. It manages the full lifecycle of client content production: shoot scheduling, graphic design requirements, task assignment and execution, equipment custody, multi-stage managerial review, and client sign-off.

### Main problem it solves

Production work at an agency fragments across spreadsheets, chat, and file shares. MOMS centralises it into one auditable pipeline where every task has an owner, an acceptance step, a review chain, and a permanent history of who did what and when.

### Intended users

Agency staff and managers, plus a client-facing surface for the marketing manager acting as the client liaison. Users are internal employees of the agency; there is no external multi-tenant client login.

### High-level workflow

```
Media Calendar Event  ──(approved)──▶  Shoot Project  ──▶  Graphic Requirement
        │                                   │                        │
        └──────────────▶ Task ◀──────────────┴────────────────────────┘
                             │
                             ▼
                    Assigned staff ACCEPTS the task
                             │
                             ▼
                  Production → Technical Review → Media Review
                             │                          │
                             └──── reject ────────────────┤
                                                        ▼
                                              Client Confirmation
                                                        │
                                                        ▼
                                                      COMPLETED
```

The central business rule is the **task acceptance gate**: a staff member must explicitly accept a task assignment before any work on it is permitted, and the project is invisible to them until they do.

---

## 2. Technology Stack

### Frontend

| Technology | Version | Notes |
|---|---|---|
| Next.js | `14.1.0` | App Router, `export const dynamic = 'force-dynamic'` (`app/layout.tsx`) |
| React / React DOM | `18.2` | All pages are client components (`'use client'`) |
| TypeScript | `^5.3.3` | |
| Tailwind CSS | `^3.4.1` | Plus PostCSS + autoprefixer; no CSS-in-JS, no component library |
| lucide-react | `^0.316.0` | Icon set |
| xlsx | `^0.18.5` | Excel/CSV export |
| jspdf + jspdf-autotable | `^4.2.1` / `^5.0.8` | PDF export |
| recharts | `^2.10.4` | Report charts |
| react-hook-form, zod | `^7.50.0`, `^3.22.4` | Declared dependencies; **not** used on the login page |

### Backend

| Technology | Version | Notes |
|---|---|---|
| NestJS | `^10.3.0` | |
| Passport + passport-jwt | `^0.7.0` / `^4.0.1` | JWT bearer auth |
| @nestjs/jwt | `^10.2.0` | |
| bcrypt | `^5.1.1` | Password hashing, cost factor **12** for new passwords |
| class-validator / class-transformer | `^0.14.1` / `^0.5.1` | Global `ValidationPipe` |
| @nestjs/swagger | `^7.2.0` | Declared; no Swagger UI is mounted in `main.ts` |

### Database / ORM

- **PostgreSQL** (`prisma/schema.prisma` `datasource.provider = "postgresql"`), documented in `backend/.env.example` as "e.g. Neon PostgreSQL".
- **Prisma** `^5.9.0`, client generator `prisma-client-js`.
- Schema-only: `backend/prisma/` contains `schema.prisma`, `seed.ts`, and a stale `dev.db`. **There is no `migrations/` directory** — the project uses `prisma db push`, not versioned migrations.

### External services

None are actually integrated. See [Known Issues](#16-known-issues--pending-work) — the notification channel adapters (email, WhatsApp, Slack, Teams, push, mobile) are logging stubs.

### File storage

Local filesystem. Uploads land in `backend/uploads/` (overridable with `UPLOAD_DIR`), served under `/uploads/*`. Default assumed max size is 15 MB.

---

## 3. System Architecture

```
┌──────────────────────────┐
│  Next.js 14 App Router   │
│  (frontend, port 3000)   │
│                          │
│  React Context state     │
│  fetchApi() wrapper      │
└───────────┬──────────────┘
            │ HTTPS, Authorization: Bearer <JWT>
            │ NEXT_PUBLIC_API_URL
            ▼
┌──────────────────────────────────────────┐
│  NestJS 10 (backend, port 4000)          │
│  base path: /api/v1                      │
│                                          │
│  Global guards:                          │
│    JwtAuthGuard → RolesGuard →           │
│    PermissionsGuard                      │
│  + AllExceptionsFilter                   │
│  + ValidationPipe (whitelist, transform) │
│  + RestResponseInterceptor (pass-through)│
│                                          │
│  Controllers → Services → PrismaService  │
└───────┬──────────────────────┬───────────┘
        │                      │
        ▼                      ▼
┌──────────────────┐   ┌────────────────────┐
│   PostgreSQL     │   │ Local FS uploads   │
│   (Prisma ORM)   │   │ backend/uploads/   │
└──────────────────┘   └────────────────────┘
```

**Key architectural notes, verified in code:**

- **The browser talks to the backend cross-origin.** There is no Next.js rewrite or proxy; the frontend uses the absolute `NEXT_PUBLIC_API_URL`.
- **A URL-normalizer middleware** in `main.ts` rewrites `/api/...` → `/api/v1/...` and bare `/auth/login` → `/api/v1/auth/login`, so un-versioned frontend URLs still resolve.
- **`RestResponseInterceptor` is pass-through** — it does *not* wrap responses in an envelope. The frontend consumes raw arrays/objects.
- **CORS effectively allows everything.** The origin callback falls through to `callback(null, true)` on mismatch, and also allows all origins when `NODE_ENV !== 'production'`.
- **File upload is the only multipart endpoint**: `POST /files/upload` (`FileInterceptor('file')`). `POST /tasks/:id/upload-deliverable` accepts a JSON `fileUrl` link only, not binary.
- **Responses are large by design.** Task list and detail endpoints deeply include project, calendar event, equipment, files, timelines, remarks, revisions, and approvals.

---

## 4. User Roles & Permissions

### 4.1 The `Role` enum (`backend/src/common/enums.ts`)

Ten values, all identity string mappings:

`MEDIA_MANAGER` · `TECHNICAL_MANAGER` · `STAFF` · `SOCIAL_MEDIA_MANAGER` · `HR_MANAGER` · `FINANCE_MANAGER` · `MARKETING_MANAGER` · `SALES_MANAGER` · `CLIENT_COORDINATOR` · `ADMINISTRATOR`

**Important:** `User.role` is a plain `String @default("STAFF")` column with **no database enum constraint**. Additionally, the string `'ADMIN'` is hardcoded as an alias for `ADMINISTRATOR` in ~40 service-level checks but is **not** a member of the enum — see [Known Issues](#16-known-issues--pending-work).

**`HR_MANAGER`, `FINANCE_MANAGER`, `SALES_MANAGER`, and `CLIENT_COORDINATOR` are dormant.** They exist in the enum and in both permission matrices, but appear in no `@Roles()` decorator, no service role filter, and no sidebar entry.

### 4.2 Effective capabilities by role

This table reflects **enforced** behavior (guards + service checks), not the permission matrix alone.

#### ADMINISTRATOR / `ADMIN`
- Bypasses all row-level visibility in `canUserViewTask` / `canUserViewProject` / `canUserViewRequirement` / `canUserViewEvent`.
- Bypasses the task acceptance gate entirely (`verifyTaskAcceptance` returns early).
- Full CRUD across modules; the `ROLE_PERMISSION_MATRIX` entry is byte-identical to `MEDIA_MANAGER`'s full-access block.
- Can create users, projects, tasks, graphic requirements, clients, brands, products.
- **Caveat:** a user whose `role` column literally reads `ADMIN` passes every service check but is rejected by any `@Roles(...)`-decorated route, because `RolesGuard` does a strict string match against enum members.

#### MEDIA_MANAGER — *de facto system administrator*
The code comment in `permissions.constants.ts` states "Media Manager serves as System Administrator", and the backend matrix grants it effectively full access.
- **Creates:** tasks, projects, graphic requirements, clients, brands, products, users, equipment records, attendance records for others, system settings, output formulas.
- **Approves:** media-stage review (`POST /approvals/media-review`), client confirmation recording, equipment requests.
- **Exclusive:** task create/reassign is `@Roles(MEDIA_MANAGER)`; "Add Equipment" nav is Media Manager only; settings writes are Media Manager only.
- **Sees:** all projects, tasks, requirements, events.

#### TECHNICAL_MANAGER
- **Approves:** technical review stage (`POST /approvals/tech-review`).
- **Creates:** equipment reservations, allocations, requests, issues, damage reports, maintenance records, handovers.
- **Row-level scoping (verified):** for **tasks**, a Technical Manager only sees tasks whose status is in the technical-review-onward list (`WAITING_FOR_TECHNICAL_REVIEW`, `WAITING_FOR_MEDIA_REVIEW`, `WAITING_FOR_REVIEW`, `WAITING_FOR_CLIENT_CONFIRMATION`, `COMPLETED`, `CLOSED`, …) **or** that have `technicalReviewApproved = true`. For **graphic requirements**, similar status-scoped visibility applies.
  - **Exception:** for **projects**, the Technical Manager status filter is dead code — an earlier branch already returns `true` for all Technical Managers, so they effectively see **every** project.
- **Blocked from:** attendance records entirely (`403` on both attendance endpoints).
- **Cannot** request a revision while an entity is in `MEDIA_REVIEW`.
- Cannot see financial settings keys or output formulas (stripped in `settings.service.ts`).

#### MARKETING_MANAGER
- **Approves:** calendar events (`POST /calendar/:id/client-review`, `/approve`), marketing-stage project review (`POST /projects/:id/review-marketing`), graphic-requirement client confirmation.
- **Creates:** clients, brands, products, calendar events.
- **Sees:** clients/brands/products restricted to rows in their `clientAssignment` list; calendar events, projects, requirements.
- **Cannot** see tasks, equipment, staff, or graphic requirements through the permission matrix (empty entries), though inline service checks still allow viewing ones they created or are assigned to.
- Owns the `/client-review` page (a manual redirect blocks any other role).

#### STAFF
- **Sees:** only tasks they are assigned to — enforced in the Prisma `where` clause (`assignedEmployees.some.userId`), not just filtered afterwards. Also self-scoped attendance and self-scoped reports (`employeeId` is force-overridden to their own id).
- **Must accept** a task assignment before working on it; the project itself stays hidden until one assignment is accepted.
- **Blocked from:** requesting revisions (`403`), completing a task (unless it is a revision task), creating clients/brands/products, creating tasks or projects, marking attendance for others, viewing the tech/media review queues.
- **Blocked from** attendance summary; limited to self.
- **Equipment:** may reserve, and may request equipment only for projects they created, are on the team of, or have a task on.
- **Cannot** see graphic requirements in the SQL query unless the requirement has an `ACCEPTED` assignment for them.

#### SOCIAL_MEDIA_MANAGER
- Behaves like STAFF for task visibility (hard `assignedEmployees` filter) and attendance self-scoping.
- Full access to calendar events, communications, projects, graphic requirements.
- Has its own dashboard component.

### 4.3 Frontend gating (advisory only)

Real enforcement is entirely server-side. The frontend hides navigation and buttons, but any user can call the API directly.

- **`MainLayout`** redirects unauthenticated users to `/login` and wraps `<main>` in a global `RoleGuard`.
- **`RoleGuard`** — route-level check via `canAccessRoute(user.role, pathname)`; renders the `/unauthorized` screen.
- **`RouteGuard`** — opt-in per page, checks `module` + `permission` (default `VIEW`); renders an inline 403 card. Used on 8 pages only.
- **`PermissionGate`** — conditional rendering, no 403.
- **`Sidebar`** filters sections and items by a `roles` array; empty sections are dropped. Section titles are rebranded per role (e.g. "Overview" → "Client Portal" for Marketing, "Workspace" for Staff).

The sidebar exposes five roles: `MEDIA_MANAGER`, `TECHNICAL_MANAGER`, `STAFF`, `SOCIAL_MEDIA_MANAGER`, `MARKETING_MANAGER`.

---

## 5. Modules

All modules below exist in both the backend module directory and (where applicable) a frontend page.

### 5.1 Dashboard (`/`, `components/dashboard/*`)

Role-dispatched landing page. Calls `GET /reports/dashboard`, which branches server-side: STAFF → personal dashboard, TECHNICAL_MANAGER → technical dashboard, everyone else → org-wide summary. Distinct components exist for `StaffPersonalizedDashboard`, `TechnicalManagerDashboard`, `SocialMediaManagerDashboard`, and `ClientDashboard`. Widget layout is user-configurable (`utils/dashboardWidgets.ts`, persisted in `localStorage` and system settings).

### 5.2 Projects (`/projects`, `/projects/[id]`)

Shoot project management — the parent entity for tasks, graphic requirements, equipment, and communications.

- **Purpose:** plan and track a shoot from creation to client sign-off.
- **Main functionality:** create/edit/archive projects; indoor/outdoor shoot detail records; team assignment; equipment allocation; script management (multi-script, read-only list); revisions; files; communications; the four-stage review chain.
- **Who can access:** all roles, subject to row-level scoping (see §4.2). Project detail is a workspace with quick-jump sections: Overview, Revisions, Team, Equipment, Scripts, Graphic Requirements.
- **Business rules:**
  - `PLANNED` on create. `progressPercentage` is recomputed as the **arithmetic mean of all task `completionPercentage` values** on every task progress update, and set to `100` on client confirmation.
  - **Completion gate:** setting a project to `COMPLETED` throws unless the completion checklist passes — all tasks complete, technical review approved, media review approved, and client confirmation recorded. A `forceComplete` flag bypasses it.
  - A separate `lifecycle` field (`ACTIVE`/`CLOSED`/`ARCHIVED`) is auto-derived on update and is independent of `status`.
  - Review order: technical → media → **marketing** → client confirmation.
  - **Clip codes:** the Scripts tab's **Attached Script Documents** grid carries a clip-code field on **each uploaded document** (not on a separate script list). Each card shows a "Clip Codes (N)" chip list plus a single number-code input. The write is **strictly restricted to staff assigned to the project** (`isAssignedToProject`) — there is **no admin or manager bypass**; every other role sees the codes read-only with a "Read-only" marker. Codes are stored per document in `FileMetadata.clipCodes` (a JSON array of `{ code, description, addedBy, addedAt }`), written only via `POST /files/:id/clip-codes` (`FilesService.updateFileClipCode()`), which returns **403** for a caller with no `ProjectAssignment` on the parent project and **409** for a duplicate code. Every add/remove is recorded in `ActivityLog`. Scripts are added at project creation; there is no per-script add/delete UI.
- **Note:** the review pipeline here has **four** stages, including a marketing stage that does not exist for tasks.

### 5.3 Media Calendar (`/calendar`)

- **Purpose:** schedule shoot/content events and route them into production.
- **Main functionality:** month/week/day views; create, update, submit for client approval; client review decisions; edit-request workflow with revision history and approval audit trail.
- **Who can access:** all roles.
- **Business rules:**
  - Creating an event as `MARKETING_MANAGER`/`ADMIN`/`ADMINISTRATOR` → `APPROVED` immediately; **everyone else → `PENDING_MARKETING_APPROVAL`**. `saveAsDraft` → `DRAFT`.
  - Only `MARKETING_MANAGER` can perform client review, and only against clients in their `clientAssignment` list.
  - `REQUEST_CHANGES` / `REJECT` require a comment.
  - Single assigned staff member (`assignedStaffId`), not a join table.
- **Conversion to a task:** there is **no calendar-owned conversion endpoint**. `ConvertEventToTaskModal` posts to `POST /tasks` with a `calendarEventId`; the logic lives in `TasksService.create`, which **refuses to attach staff to an event that is not yet approved** and sets the event to `TASK_ASSIGNED` when a task is created.

### 5.4 Graphic Requirements (`/graphic-reqs`)

- **Purpose:** design deliverables scoped to a project, with their own three-stage review.
- **Main functionality:** create/edit; remarks history; deliverable CRUD; technical review; media review; client confirmation; auto-creation of assigned tasks.
- **Who can access:** all roles, with status-scoped visibility; STAFF only see requirements with an `ACCEPTED` assignment.
- **Business rules:**
  - **A Graphic Requirement must have a parent ShootProject** — creation throws otherwise.
  - Editing is **locked while under review** unless `bypassReviewLock` is passed in the request body.
  - Auto-completes when deliverables exist and all three flags (`technicalReviewApproved`, `mediaManagerApproved`, `clientConfirmed`) are true.
  - Creating a requirement **auto-creates one Task per assigned user** with a pre-accepted assignment — this bypasses the acceptance gate by design.
  - Only one non-completed task per requirement is permitted.

### 5.5 Tasks (`/tasks`)

The operational core of the system.

- **Purpose:** assign, accept, execute, and review individual work items.
- **Main functionality:** create/assign/reassign; **accept**; start production; remarks; deliverable upload; progress updates; request technical review; capacity/reassignment recommendations; revisions; deliverable version history.
- **Who can access:** all roles. Creation and reassignment are `MEDIA_MANAGER` only.
- **Business rules:** see [Task Lifecycle](#61-task-lifecycle) and [The Acceptance Gate](#62-the-acceptance-gate-read-only-mode).

### 5.6 Equipment (`/equipment` + 10 sub-pages)

See [§11 Equipment Management](#11-equipment-management) for the full current state.

### 5.7 Attendance (`/attendance`)

- **Purpose:** daily staff attendance register.
- **Main functionality:** mark attendance, view by date, monthly dashboard summary.
- **Who can access:** `MEDIA_MANAGER` records for others; STAFF and `SOCIAL_MEDIA_MANAGER` are hard-scoped to their own record; `TECHNICAL_MANAGER` is **blocked entirely** (`403`).
- **Business rules:** one row per user per day (`@@unique([userId, date])`). Statuses: `PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`.

### 5.8 Reviews & Approvals (`/approvals`, `/client-review`)

- **Purpose:** the multi-stage managerial review chain and its queue.
- **Main functionality:** pending approval queue; technical decisions; media decisions; client confirmation recording; client-facing calendar review.
- **Who can access:** Technical Manager (tech stage), Media Manager (media stage + client confirmation), Marketing Manager (calendar client review).
- **Note:** there are **three separate, partly duplicated** review implementations — `approvals.service.ts` (2 stages), `projects.service.ts` (4 stages), and `graphic-reqs.service.ts` (3 stages). They do not agree on stage count or order. See [Known Issues](#16-known-issues--pending-work).

### 5.9 Notifications (`/notifications`)

- **Purpose:** in-app notification inbox and operational alert feed.
- **Main functionality:** filtered inbox; read/unread; archive; per-entity lookup; system alerts with acknowledge/resolve; bulk dispatch by scope; reminder triggers; activity history.
- **Who can access:** all authenticated users; queries are scoped to the caller's own rows.
- **Business rules:** the canonical `notifyOperationalEvent` service requires `eventType` **and** `entityType` + `entityId` ("Notifications shall never exist independently") and writes a permanent `ActivityLog` mirror. **However, most call sites bypass this service** and write `prisma.notification.create` directly.
- **Channel delivery is not implemented** — see §11 and Known Issues.

### 5.10 Communications (`/communication`)

- **Purpose:** threaded notes, remarks, blockers, and announcements attached to any entity.
- **Main functionality:** entity-scoped threads; replies; blocker create/resolve; announcements; attachments; status changes; read marking.
- **Who can access:** all roles, with a non-trivial visibility filter — a non-admin sees messages they sent, are assigned to, are announcements, name them in recipients/content/replies, or address their role title.
- **Business rules:** announcements may only be published by `MEDIA_MANAGER`/`ADMIN`; only Media Manager may edit; hard delete is **prohibited by policy** (`DELETE` always returns `403`).

### 5.11 Staff (`/staff`)

- **Purpose:** user and employee register.
- **Main functionality:** list/search/filter users; create employee; edit; activate/deactivate/suspend/archive lifecycle; departments; capabilities; skills; workload targets.
- **Who can access:** `MEDIA_MANAGER` manages; others may **edit only themselves** and only non-restricted fields.
- **Business rules:** `EmployeeProfile` carries `dailyCapacityHours` (default 8.0) and daily/weekly/monthly targets, which drive workload and productivity scoring.

### 5.12 Clients (`/clients`), Brands (`/brands`), Products (`/products`)

- **Purpose:** the client → brand → product catalog that all other entities reference.
- **Main functionality:** CRUD; favorites; logo upload; GST/contact fields; product codes.
- **Who can access:** `MARKETING_MANAGER`/`ADMINISTRATOR` create/update. Clients is the **only** module that also uses `@RequirePermission` (the `PermissionsGuard` path). There are no DELETE endpoints for brands or products; clients soft-delete and are blocked while active projects exist.
- **Business rules:** `MARKETING_MANAGER` results are restricted to their `clientAssignment` rows. `Client.brand` cascades — deleting a client deletes its brands.

### 5.13 Reports & Analytics (`/reports`)

- **Purpose:** performance and analytics dashboards.
- **Main functionality:** production, graphic analytics, productivity, employee analytics, brand/client/product/department/project performance, attendance analytics, equipment, approvals, capacity, revisions, timelines; plus a role-dispatched main dashboard and a global search.
- **Who can access:** most endpoints are `MEDIA_MANAGER`/`ADMINISTRATOR`; five are also open to `TECHNICAL_MANAGER`; everyone gets the self-service `my_*` tabs.
- **Business rules:** all reports return **JSON only** — there is no server-side file export. Excel/CSV/PDF export happens client-side. Every export is recorded via `POST /reports/audit-export`. STAFF and `SOCIAL_MEDIA_MANAGER` have `employeeId` force-overridden to their own id.

### 5.14 Settings (`/settings`)

- **Purpose:** system configuration, output formulas, dashboard widgets.
- **Main functionality:** read settings; upsert system key/value; set output formula values; dashboard widget configuration.
- **Who can access:** writes are `MEDIA_MANAGER` only. `TECHNICAL_MANAGER` and `STAFF` receive filtered settings — `formulas: []` and all keys starting with `TARGET_OUTPUT_POINTS*`, `FINANCIAL_HOURLY_RATE`, `BILLING_FORMULA`, `CLIENT_COMMERCIAL_RULES`, `EMPLOYEE_SALARY_WEIGHTS` are stripped.

### 5.15 Search, Activity, Favorites, Recent Access, Files

- **Search** — cross-entity search with an Advanced Search modal. **Role filtering is incomplete** (see Known Issues).
- **Activity** — a filtered activity timeline and dashboard feed over `ActivityLog`.
- **Favorites / Recent Access** — per-user star and visited-record lists, synced across components via a `moms:favorites-updated` window event.
- **Files** — the only multipart upload path, plus metadata-only records. Non-privileged roles are blocked from uploading while a project or requirement is in a review state.

---

## 6. Workflows

### 6.1 Task Lifecycle

Enum `TaskStatus` (`common/enums.ts`):
`PENDING_MARKETING_APPROVAL` · `APPROVED` · `PENDING` · `ASSIGNED` · `ACCEPTED` · `IN_PROGRESS` · `ON_HOLD` · `WAITING_FOR_TECHNICAL_REVIEW` · `WAITING_FOR_MEDIA_REVIEW` · `WAITING_FOR_REVIEW` · `REVISION_REQUESTED` · `COMPLETED` · `CANCELLED`

```
create (MEDIA_MANAGER only)
   ├─ direct task, no assignee ─────▶ APPROVED
   ├─ direct task, with assignee ───▶ ASSIGNED   (acceptanceStatus = NOT_YET_ACCEPTED)
   └─ from unapproved calendar event ▶ PENDING_MARKETING_APPROVAL

ASSIGNED
   │  POST /tasks/:id/accept   ← assignee clicks "Accept Task"
   ▼
IN_PROGRESS            (progress: 25 if 0/100, else min(p, 45))
   │  upload deliverable (activeDeliverableUrl required)
   │  POST /tasks/:id/request-technical-review
   ▼
WAITING_FOR_TECHNICAL_REVIEW   (progress := 50)
   │  POST /approvals/tech-review     @Roles(TECHNICAL_MANAGER)
   ├─ REJECT ──▶ IN_PROGRESS  (technicalReviewApproved = false)
   ▼ APPROVE (sets technicalReviewApproved)
WAITING_FOR_MEDIA_REVIEW
   │  POST /approvals/media-review    @Roles(MEDIA_MANAGER)
   ├─ REJECT ──▶ IN_PROGRESS
   ▼ APPROVE (sets mediaManagerApproved)
COMPLETED              (progress := 100)
```

**Gate rules enforced in `updateProgress`:**
- Moving to `WAITING_FOR_MEDIA_REVIEW` requires `technicalReviewApproved`, unless the caller is `TECHNICAL_MANAGER`/`ADMINISTRATOR`.
- Moving to `COMPLETED` is **blocked for STAFF** unless the task is a `REVISION` type, and requires `mediaManagerApproved` otherwise.
- Rejecting a **project** at the media stage bulk-resets all its tasks to `IN_PROGRESS`.

**`ACCEPTED` is effectively write-only.** No task service path sets it except graphic-requirement creation; `acknowledgeTaskAcceptance` goes `ASSIGNED → IN_PROGRESS` directly. It survives as a fallback condition in the acceptance check.

**Progress side effect:** every `updateProgress` recomputes the parent project's `progressPercentage` as the mean of all its task percentages.

### 6.2 The Acceptance Gate (read-only mode)

The most consequential business rule in the system.

**Backend — `verifyTaskAcceptance(task, user)`:**
- Bypassed for `ADMINISTRATOR`/`ADMIN`.
- Applies **only if the caller is assigned** to the task.
- Passes if the matching `TaskAssignment` has `acceptanceStatus === 'ACCEPTED'` (legacy `'Accepted'` also accepted), or — only when no assignment row exists — `task.status === 'ACCEPTED'`.
- Otherwise throws **403**: *"Task acceptance is required before you can perform this action. The task is currently in read-only mode."*

**It gates exactly four operations:** `updateProgress`, `addRemark`, `uploadDeliverable`, `requestTechnicalReview`.

**A second, independent lock** makes tasks read-only for STAFF and `SOCIAL_MEDIA_MANAGER` while under review — statuses `WAITING_FOR_TECHNICAL_REVIEW`, `WAITING_FOR_MEDIA_REVIEW`, `WAITING_FOR_REVIEW`, `PENDING_MARKETING_APPROVAL`, `COMPLETED`. This list is duplicated in three places.

**Project-level consequence:** `canUserViewProject` returns `false` for a staff member assigned to project tasks until at least one of their assignments is `ACCEPTED`. Acceptance is therefore a **visibility** gate, not just a work gate.

**Frontend:** `isPendingAcceptance` drives disabled remark/progress/upload controls and shows the acceptance banner. Staff can still *read* a task they haven't accepted — that is intentional and matches the backend comment.

**Performance note (recently changed):** the accept endpoint now performs one lean `select` read for authorization, issues its side effects concurrently via `Promise.all`, and re-reads the full task payload only once for the response. The frontend applies the acceptance state optimistically and refreshes in the background.

### 6.3 Project Review Pipeline (4 stages)

```
PLANNED / IN_PRODUCTION
   │  POST /projects/:id/submit-technical
   ▼
WAITING_FOR_TECHNICAL_REVIEW     + Approval(PENDING)
   │  POST /projects/:id/review-technical   @Roles(TECHNICAL_MANAGER | ADMIN)
   ├─ REJECT ──▶ returnStatus, revisionCount + 1
   ▼
WAITING_FOR_MEDIA_REVIEW
   │  POST /projects/:id/review-media       (must be in WAITING_FOR_MEDIA_REVIEW)
   ├─ REJECT ──▶ IN_PROGRESS, revisionCount + 1
   ▼
WAITING_FOR_MARKETING_APPROVAL
   │  POST /projects/:id/review-marketing
   ├─ REJECT ──▶ returnStatus
   ▼
WAITING_FOR_CLIENT_CONFIRMATION
   │  POST /projects/:id/confirm-client
   ▼
COMPLETED                        (progressPercentage := 100)
```

### 6.4 Graphic Requirement Pipeline (3 stages)

```
(APPROVED by default on create)
   │  POST /graphic-reqs/:id/submit-technical
   ▼
WAITING_FOR_TECHNICAL_REVIEW     (technicalReviewRound++, all approval flags reset)
   │  POST /graphic-reqs/:id/review-technical   @TECHNICAL_MANAGER | ADMIN
   ├─ REJECT ──▶ IN_PROGRESS
   ▼
WAITING_FOR_MEDIA_REVIEW
   │  POST /graphic-reqs/:id/review-media
   ├─ REJECT ──▶ IN_PROGRESS
   ▼
WAITING_FOR_CLIENT_CONFIRMATION
   │  POST /graphic-reqs/:id/client-confirmation   @MARKETING_MANAGER | ADMIN
   ▼
COMPLETED                        (all child tasks → COMPLETED / 100)
```

### 6.5 Revision Workflow

**Revisions do not create a new task.** The service states this explicitly: *"Do NOT create a new task. Restart existing task workflow in-place."*

```
Request (STAFF is hard-blocked; reason + detailedRequest mandatory)
   │  POST /revisions/request
   ▼
REVISION_REQUESTED
   • Parent task  → status ASSIGNED, completionPercentage 0, approval flags false,
                     and its TaskAssignment is DELETED and RECREATED as NOT_YET_ACCEPTED
                     → re-triggers the acceptance gate
   • Project / GR → ALL child tasks reset the same way
   • Calendar     → status CHANGES_REQUESTED, version + 1
   • revisionCount + 1
   ▼
ACCEPTED → IN_PROGRESS → SUBMITTED (parent → WAITING_FOR_TECHNICAL_REVIEW)
   ▼
REVIEW
   ├─ TECHNICAL_MANAGER APPROVE ──▶ WAITING_FOR_MEDIA_REVIEW
   └─ MEDIA_MANAGER/ADMIN APPROVE ──▶ COMPLETED
   • REJECT → returns to work
```

**Ownership rule:** only the user recorded in the task's `TASK_CREATED` timeline event (or an admin) may request/reassign a revision on a task. Reassignment requires `MEDIA_MANAGER`/`ADMIN`.

**Two competing revision state machines** exist: `Revision.status` and the parent entity's `REVISION_REQUESTED` flag are both written, and the accept endpoint also flips `REVISION_REQUESTED → IN_PROGRESS` as a side effect.

### 6.6 Equipment Lifecycle

Two independent status fields plus archival:

- **`availability`:** `AVAILABLE` · `RESERVED` · `CHECKED_OUT` · `IN_USE` · `UNDER_MAINTENANCE` · `DAMAGED` · `LOST` · `RETIRED`
- **`maintenanceStatus`:** `OPERATIONAL` · `NEEDS_SERVICE` · `UNDER_REPAIR` · `DECOMMISSIONED`
- **Archival:** `isArchived` via `retire`; archived items are rejected by every downstream operation.

**Reservation flow (date-window hold):**
`RESERVED` → `CHECKED_OUT` (issue) → `RETURNED` (return inspection)

**Request flow (approval + handover workflow):**
`PENDING` → `APPROVED` | `REJECTED` → `CHECKED_OUT`

`createRequest` **immediately sets `availability = RESERVED` before approval** to hold the item. On rejection, availability is released back to `AVAILABLE` and the holder cleared.

**Damage / repair:** filing a damage report forces `availability = DAMAGED` and sets `repairStatus = PENDING`. `repairStatus` moves `PENDING → IN_REPAIR → `REPAIRED` / `UNREPAIRABLE`.

**Return inspection** derives status from a checklist, **including substring matching on free-text condition notes** (e.g. the word "damage" → `DAMAGED`).

**Integrity rules:** every equipment child record uses `onDelete: Restrict` so history is never destroyed. Hard delete (`DELETE /equipment/:id`) and bulk delete are **always 403 by policy**.

### 6.7 Event → Task Conversion

```
Calendar Event (must be APPROVED)
   │  ConvertEventToTaskModal → POST /tasks { calendarEventId, parentEntityType }
   ▼
Task created; event → TASK_ASSIGNED
```

`TasksService.create` **rejects** attaching staff to an event that is not yet approved: *"Media Calendar Event must be approved by Marketing Manager before task assignment."*

Creating a task with `parentEntityType: 'PROJECT'` and no existing project **auto-creates a ShootProject** with a generated `SP-######` id.

---

## 7. Database

- **Engine:** PostgreSQL
- **ORM:** Prisma `^5.9.0`
- **Schema:** `backend/prisma/schema.prisma` — ~1100 lines, **50 models**, and **zero native `enum` blocks**. Every status is a `String` with an `@default` plus a trailing comment. The authoritative value lists live in `backend/src/common/enums.ts`, which means **schema comments and TypeScript enums have drifted** in several places (documented in Known Issues).
- **Migrations:** none. No `migrations/` directory exists; the project relies on `prisma db push`.

### 7.1 Models by domain

| Domain | Models |
|---|---|
| Identity & HR | `User`, `EmployeeProfile`, `Department`, `Skill`, `EmployeeSkill`, `Attendance`, `ClientAssignment` |
| Catalog | `Client`, `Brand`, `Product`, `Campaign` |
| Projects | `ShootProject`, `IndoorShootDetails`, `OutdoorShootDetails`, `ProjectAssignment` |
| Graphic requirements | `GraphicRequirement`, `GraphicRequirementDeliverable`, `GraphicRequirementTimeline`, `GraphicRequirementRemark` |
| Tasks | `Task`, `TaskAssignment`, `TaskTimeline`, `TaskDeliverableHistory`, `TaskRemark` |
| Equipment | `Equipment`, `EquipmentCategory`, `EquipmentReservation`, `EquipmentRequest`, `EquipmentMovement`, `EquipmentDamageReport`, `EquipmentHandoverAuthorization`, `EquipmentMaintenanceRecord` |
| Review & revisions | `Approval`, `ClientConfirmation`, `Revision` |
| Calendar | `MediaCalendarEvent`, `CalendarEventRevision`, `CalendarApprovalHistory`, `CalendarEditRequest`, `CalendarEditHistory` |
| Files & comms | `FileMetadata` (with a `clipCodes` JSON column), `Communication`, `CommunicationAttachment` |
| Platform | `Notification`, `ActivityLog`, `OutputFormula`, `SystemSetting`, `SavedFilter`, `Favorite`, `RecentAccess` |

### 7.2 Relationships that carry the business logic

**Task ↔ TaskAssignment — the accept flow.**
`Task.assignedEmployees: TaskAssignment[]`. Acceptance is modeled **per assignee**, not on the Task: each row carries `acceptanceStatus` (default `NOT_YET_ACCEPTED`) and `acceptedAt`, with `@@unique([taskId, userId])`. This is why the acceptance gate can be per-user.

**Task ↔ Revision.** `Task.revisions[]` and `Revision.taskId?` with `onDelete: SetNull` — deleting a task orphans the revision rather than destroying it. Note `Task.revisionId` is a **plain scalar with no relation** and is not a real FK.

**Task → Project / Requirement.** `Task.projectId` → `ShootProject` (Cascade); `Task.graphicRequirementId` → `GraphicRequirement`. Client/brand/product are denormalized onto `Task` for list filtering.

**Approval — polymorphic.** `Approval.entityType` (`PROJECT`|`GRAPHIC_REQ`|`TASK`|`EQUIPMENT`) + `entityId`, alongside real optional FKs to `projectId` and `graphicRequirementId`. Carries `approvalType`, `stage`, `targetRole`, `round`, `returnedStatus` (so a rejection can push the parent back to a recorded status), and `status` (`PENDING`/`APPROVED`/`REJECTED`).

**Calendar assignment is a scalar, not a join table.** `MediaCalendarEvent.assignedStaffId` → a single `User`. The approver is separate (`approvalAssignedToId`). Provenance is bidirectional: the event points at `graphicRequirementId`/`shootId`, while `ShootProject.sourceForCalendarEvents` and `GraphicRequirement.sourceForCalendarEvents` hold the back-relation.

**Equipment integrity.** Every child FK on `Equipment` uses `onDelete: Restrict` — reservations, requests, movements, damage reports, handovers, and maintenance records are all protected so history is never destroyed. `EquipmentRequest → EquipmentHandoverAuthorization` cascades.

**User ↔ EmployeeProfile.** 1:1 via `EmployeeProfile.userId @unique`, Cascade. `EmployeeProfile.departmentId` has **no** onDelete, so a populated department blocks user deletion. `additionalDepartments` is an unnormalized comma-separated/JSON string.

### 7.3 Indexes and integrity constraints

Human-readable IDs are `@unique` and are the identifiers surfaced in the UI: `ShootProject.projectId`, `Task.taskId`, `GraphicRequirement.requirementId`, `Equipment.equipmentId`, `Equipment.serialNumber`, `EquipmentHandoverAuthorization.authorizationId`, `EquipmentMaintenanceRecord.maintenanceId`, `Brand.shortCode`, `User.email`, `EmployeeProfile.employeeCode`.

Composite `@@unique`: `TaskAssignment [taskId, userId]`, `ProjectAssignment [projectId, userId]`, `Attendance [userId, date]`, `ClientAssignment [userId, clientId]`, `Favorite [userId, entityType, entityId]`, `RecentAccess [userId, entityType, entityId]`, `Product [brandId, productCode]`, `EmployeeSkill [employeeId, skillId]`.

Explicit `@@index` exists on equipment request/damage/handover/maintenance, `SavedFilter`, `Favorite`, `RecentAccess`, and the calendar edit-request/history tables.

**Performance gap:** the hot list-query filters — `Task.status`, `ShootProject.status`, `Task.projectId`, `ShootProject.clientId`, `Approval.status` — have **no indexes**.

### 7.4 Cascade behavior worth knowing

- **Deleting a ShootProject cascades** to its tasks, graphic requirements, indoor/outdoor details, project assignments, equipment reservations and requests, approvals, client confirmations, revisions, files, and communications. This is a large blast radius.
- **Deleting a User cascades** to their employee profile, task assignments, remarks, deliverable history, attendance, notifications, communications, and client assignments.
- **Deleting Equipment is Restrict everywhere** — intentional business rule.

---

## 8. API

**Base path:** `/api/v1` (excluding `/health` and `/`). The URL-normalizer middleware also accepts un-versioned `/api/...` paths.

### 8.1 Global request pipeline

```
Request
  → URL normalizer (/api/* → /api/v1/*)
  → JwtAuthGuard      (401 unless @Public())
  → RolesGuard       (403 unless role ∈ @Roles(...))
  → PermissionsGuard (403 unless ROLE_PERMISSION_MATRIX allows it)
  → ValidationPipe (whitelist: true, transform: true)
  → Controller → Service → Prisma
  → AllExceptionsFilter  (normalizes error shape)
  → RestResponseInterceptor (pass-through)
```

**Error shape** (uniform, from `AllExceptionsFilter`):
`{ statusCode, timestamp, path, method, error, message, remediation }`
where 401 → `AuthenticationError`, 403 → `AuthorizationError` (with a remediation string), 400 → `ValidationError`/`BadRequest`, 404 → `NotFoundError`.

**Public endpoints** (only three): `POST /auth/login`, `GET /`, `GET /health` (plus `/api/health` and `/api/v1/health` aliases).

### 8.2 Routes by module

Format: `METHOD /path` → purpose · access

#### auth
| Route | Purpose | Access |
|---|---|---|
| `POST /auth/login` | Issue JWT | **Public** |
| `POST /auth/logout` | Write LOGOUT audit; no server-side revocation | auth |
| `GET /auth/profile` | Current user + role + department + skills | auth |
| `PATCH /auth/change-password` | Verify old, set new (bcrypt cost 12) | auth |

#### users
| Route | Purpose | Access |
|---|---|---|
| `GET /users` | List; `role`,`status`,`includeArchived`,`search` | auth |
| `GET /users/:id` | Single user | auth |
| `PATCH /users/:id` | Update; self-edit allowed, field-restricted | auth (role in service) |
| `POST /users` | Create employee | MEDIA_MANAGER, ADMINISTRATOR |
| `POST /users/:id/activate\|deactivate\|suspend\|archive` | Lifecycle transitions | MEDIA_MANAGER, ADMINISTRATOR |
| `GET/POST/PUT/DELETE /users/departments[/:id]` | Department CRUD | read auth / write MEDIA_MANAGER |
| `GET/POST /users/capabilities` | Capability list / create | auth / MEDIA_MANAGER |

#### projects
| Route | Purpose | Access |
|---|---|---|
| `GET /projects` | List; 13 filters incl. `search`,`clientId`,`brandId`,`shootType`,`status`,`assignedUserId`,`archived` | auth |
| `GET /projects/:id` | Project detail | auth |
| `POST /projects` | Create | MEDIA_MANAGER |
| `PUT`/`PATCH /projects/:id` | Update; unknown/non-column keys are stripped so a control flag cannot 500 the request | 6 roles incl. STAFF, MEDIA_MANAGER, MARKETING_MANAGER, TECHNICAL_MANAGER |
| `POST /files/:id/clip-codes` | `{action: 'add'\|'remove', code, description?}` on an uploaded script document; **403 unless the caller has a ProjectAssignment on the parent project**, 409 on duplicate | all roles can read; only assigned staff can write |
| `POST /projects/:id/archive` | Archive | MEDIA_MANAGER |
| `POST /projects/:id/submit-technical` | Enter technical review | auth |
| `POST /projects/:id/review-technical` | `{action: APPROVE\|REJECT, comment?}` | auth (role in service) |
| `POST /projects/:id/review-media` | Media decision | auth (role in service) |
| `POST /projects/:id/review-marketing` | Marketing decision | auth (role in service) |
| `POST /projects/:id/confirm-client` | `{action: CONFIRM\|REQUEST_CHANGES}` | auth (role in service) |

#### tasks
| Route | Purpose | Access |
|---|---|---|
| `GET /tasks` | List; 12 filters incl. `dateFrom/To`,`departmentId`,`employeeId` | auth |
| `GET /tasks/:id` | Task detail | auth |
| `POST /tasks` | Create | MEDIA_MANAGER |
| `PUT /tasks/:id/reassign` | Bulk reassign `assignedUserIds[]` + reason | MEDIA_MANAGER |
| `PATCH /tasks/:id/progress` | `status`, `completionPercentage`, `remarks` | auth (acceptance-gated) |
| `POST /tasks/:id/accept` | **Accept assignment** | auth |
| `POST /tasks/:id/start-production` | Start production | auth (assignee only for STAFF) |
| `POST /tasks/:id/remarks` | Append remark | auth (acceptance-gated) |
| `POST /tasks/:id/upload-deliverable` | Link existing file (`fileUrl`, JSON only) | auth (acceptance-gated) |
| `POST /tasks/:id/request-technical-review` | Submit for tech review | auth (acceptance-gated) |
| `GET /tasks/capacity/overview` | Team capacity | auth |
| `GET /tasks/capacity/alternatives/:userId` | Alternatives for overloaded user | auth |
| `GET /tasks/:id/reassign-recommendations` | Reassignment suggestions | auth |
| `PUT /tasks/capacity/:userId` | Set `dailyCapacityHours` | MEDIA_MANAGER |

#### graphic-reqs
| Route | Purpose | Access |
|---|---|---|
| `GET /graphic-reqs` | List; 12 filters incl. `projectId`,`employeeId`,`all` | auth |
| `GET /graphic-reqs/:id` | Detail | auth |
| `POST /graphic-reqs` | Create (requires parent project) | MEDIA_MANAGER, ADMINISTRATOR |
| `PUT /graphic-reqs/:id` | Update; locked during review unless bypass | auth |
| `POST /graphic-reqs/:id/remarks` | Add remark | auth |
| `GET/POST /graphic-reqs/:id/deliverables` | List / add deliverable | auth |
| `PUT /graphic-reqs/deliverables/:id` · `PATCH .../status` · `DELETE .../:id` | Update / set status / delete | auth |
| `POST /graphic-reqs/:id/submit-technical` | Submit to tech review | auth |
| `POST /graphic-reqs/:id/review-technical` | Tech decision | auth (TECHNICAL_MANAGER/ADMIN in service) |
| `POST /graphic-reqs/:id/review-media` | Media decision | auth (role in service) |
| `POST /graphic-reqs/:id/client-confirmation` | Confirm / request changes | auth (MARKETING_MANAGER/ADMIN in service) |

#### revisions
All routes are `auth`-only at the controller level; **role checks are inline in the service**.

| Route | Purpose |
|---|---|
| `POST /revisions/request` | Raise revision (STAFF blocked) |
| `GET /revisions` · `GET /revisions/metrics` | List; metrics |
| `GET /revisions/entity/:entityType/:entityId` | Revisions for an entity |
| `PATCH /revisions/:id/accept` · `/start` · `/submit` · `/reassign` · `/review` | Lifecycle actions |

#### calendar
| Route | Purpose | Access |
|---|---|---|
| `GET /calendar` · `GET /calendar/:id` · `GET /calendar/:id/history` | List, detail, history | auth |
| `POST /calendar` · `PUT /calendar/:id` | Create / update | MEDIA_MANAGER, MARKETING_MANAGER, ADMINISTRATOR, SOCIAL_MEDIA_MANAGER |
| `POST /calendar/:id/submit` | Submit for client approval | same 4 roles |
| `POST /calendar/:id/client-review` · `/approve` | Client decision | MARKETING_MANAGER |
| `PUT /calendar/:id/deadline` · `/priority` | Adjust with reason | MARKETING_MANAGER |
| `GET /calendar/edit-requests/all` · `/:id/edit-requests` | Edit requests | auth |
| `POST /calendar/:id/edit-request` | Raise edit request | MEDIA_MANAGER, SOCIAL_MEDIA_MANAGER |
| `POST /calendar/edit-requests/:id/approve` · `/reject` | Decide | MARKETING_MANAGER |

#### equipment
| Route | Purpose | Access |
|---|---|---|
| `GET /equipment` · `GET /equipment/:id` · `GET /equipment/categories` | Inventory | auth |
| `GET /equipment/monitoring` · `/dashboard` · `/archived` · `/reports/summary` | Ops views | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `POST /equipment` · `PATCH /equipment/:id` · `POST /equipment/:id/retire` | Master record CRUD | MEDIA_MANAGER, ADMINISTRATOR |
| `GET /equipment/my` | Own equipment + handovers | auth |
| `POST /equipment/:id/reserve` | Reserve | 6 roles incl. STAFF |
| `POST /equipment/allocate` · `/:id/allocate` | Direct allocation | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `POST /equipment/requests` · `GET /equipment/requests` | Request flow | auth (STAFF project-scoped) |
| `DELETE /equipment/requests/:id` | Delete own request | auth (manager or requester) |
| `PATCH /equipment/requests/:id/review` | Approve / reject + notes | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `POST /equipment/requests/:id/prepare` · `/issue-handover` · `/issue` · `/acknowledge` | Handover flow | prepare/issue: managers; acknowledge: auth |
| `POST /equipment/:id/movement` | Log movement | auth |
| `POST /equipment/check-availability` · `POST /equipment/lost` | Availability / loss | auth / managers |
| `POST /equipment/maintenance-records` · `/:id/clear` · `PATCH /equipment/:id/maintenance` | Maintenance | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `POST /equipment/:id/return-inspection` | Return + condition checklist | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `POST /equipment/damage-reports` · `PATCH /equipment/damage-reports/:id/repair` | Damage / repair | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `PATCH /equipment/:id/status` | Set availability (no transition rules) | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `DELETE /equipment/reservations/:id` | Cancel reservation | managers, STAFF, MARKETING_MANAGER, SOCIAL_MEDIA_MANAGER |
| `DELETE /equipment/:id` · `DELETE /equipment` | **Always 403 — prohibited** | — |

#### approvals, attendance, catalog
| Route | Purpose | Access |
|---|---|---|
| `GET /approvals` · `GET /approvals/queue` | List; pending queue | auth |
| `POST /approvals/tech-review` | Technical decision | TECHNICAL_MANAGER |
| `POST /approvals/media-review` | Media decision | MEDIA_MANAGER |
| `POST /approvals/client-confirmation` | Record client confirmation | MEDIA_MANAGER |
| `GET /attendance` · `GET /attendance/dashboard` | Register; summary | auth (TECHNICAL_MANAGER blocked) |
| `POST /attendance` | Record for others | MEDIA_MANAGER |
| `GET /clients` · `GET /clients/:id` | List / detail | `CLIENTS.VIEW` permission |
| `POST/PATCH/DELETE /clients[/:id]` | Create / update / soft-delete | MARKETING_MANAGER, ADMINISTRATOR + permission |
| `GET/POST/PUT /brands[/:id]` · `GET/POST/PUT /products[/:id]` | Catalog CRUD | read auth / write MARKETING_MANAGER, ADMINISTRATOR |

#### notifications, communications, reports, activity, settings, files, misc
| Route | Purpose | Access |
|---|---|---|
| `GET /notifications` · `/summaries` · `/activity-history` · `/system-alerts` | Inbox, counts, history, alerts | auth |
| `POST /notifications/system-alerts/scan\|acknowledge\|resolve` | Alert lifecycle | auth |
| `GET /notifications/channels` · `POST /notifications/channels/test` | Channel status / test | auth (test is the only path to the dispatcher) |
| `PATCH /notifications/:id/read` · `/read-all` · `/archive` · `/archive-all` | Read/archive | auth |
| `POST /notifications/dispatch` | Bulk dispatch by scope | auth |
| `GET /communications` · `/announcements` · `/:id/timeline` | Threads | auth |
| `POST /communications` · `PATCH /:id/status` · `/mark-as-read` · `/resolve-blocker` | Create / mutate | auth |
| `POST /communications/announcements` | Publish | MEDIA_MANAGER/ADMIN in service |
| `DELETE /communications[/:id]` | **Always 403 — prohibited** | — |
| `GET /reports/dashboard` | Role-dispatched dashboard | auth |
| `GET /reports/my-dashboard` | Self-service dashboard | auth (self-scoped for STAFF/SMM) |
| `GET /reports/technical-dashboard` | Tech manager dashboard | MEDIA_MANAGER, TECHNICAL_MANAGER, ADMINISTRATOR |
| `GET /reports/search?q=` | Global search | auth |
| `GET /reports/{production,graphic-analytics,productivity,employee-analytics,brands,clients,products,departments,projects,attendance-analytics,timelines}` | Analytics | MEDIA_MANAGER, ADMINISTRATOR |
| `GET /reports/{equipment,approvals,capacity,revisions}` | Analytics | + TECHNICAL_MANAGER |
| `POST /reports/audit-export` | Record a client-side export | auth (role-checked) |
| `GET /activity` · `/feed` · `/stats` | Activity log views | auth |
| `GET /settings` · `/default-page-size` · `/health` | Read config | auth |
| `PUT /settings/system` · `PUT /settings/formula/:id` | Upsert setting / formula | MEDIA_MANAGER |
| `POST /files/upload` | **Only multipart endpoint** (`file` + `projectId` + optional ids) | auth |
| `GET /files/project/:projectId` · `POST /files` · `DELETE /files/:id` | File metadata | auth |
| `GET /favorites` · `POST /favorites/toggle` · `DELETE /favorites/:id` | Favorites | auth |
| `GET /recent-access` · `POST /recent-access` | Recent records | auth |
| `GET /search` | Cross-entity search | auth |
| `GET /permissions/overview` · `/check` | Permission tree / check | auth |

---

## 9. Frontend Structure

### 9.1 Routing (`frontend/src/app/`)

Next.js App Router. All pages are client components.

| Route | Purpose | Guard |
|---|---|---|
| `/login` | Email/password login | shell bypass |
| `/` | Role-dispatched dashboard | `RoleGuard` (shell) |
| `/activity` | Activity timeline | `RouteGuard ACTIVITY_LOGS` |
| `/approvals` | Tech/media/client approval queues | `RoleGuard` |
| `/archive` | Archived projects (read-only) | — |
| `/attendance` | Daily register | — |
| `/brands` | Brand CRUD | `RouteGuard BRANDS` |
| `/calendar` | Media calendar | — |
| `/client-review` | Client-facing review (Marketing Manager only) | manual redirect |
| `/clients` | Client CRUD | `RouteGuard CLIENTS` |
| `/communication` | Notes/remarks/blockers | — |
| `/equipment` | Master inventory | `RoleGuard` |
| `/equipment/[id]` | Item detail (overview, assignment, maintenance, damage, timeline) | `RoleGuard` |
| `/equipment/assignments` | Per-project allocation | `RoleGuard` |
| `/equipment/create` | New asset (Media Manager only) | `RoleGuard` |
| `/equipment/damage` · `/maintenance` · `/history` · `/reports` · `/reservations` · `/monitoring` · `/dashboard` | Equipment sub-views | `RoleGuard` |
| `/equipment/my` | Staff self-service view | — |
| `/favourites` | Favorites list | — |
| `/favorites` | **Spelling alias** — re-exports `/favourites` (128 B stub) | — |
| `/graphic-reqs` | Requirement board | — |
| `/notifications` | Notification inbox | — |
| `/products` | Product CRUD | `RouteGuard PRODUCTS` |
| `/projects` | Project list + create | — |
| `/projects/[id]` | Project workspace | — |
| `/reports` | Analytics with export | tab-gated by role |
| `/revisions` | **Redirect stub** — revisions live in Tasks; redirects to `/tasks` | — |
| `/settings` | Settings editor | `RouteGuard SETTINGS` |
| `/staff` | User register | `RouteGuard STAFF` |
| `/tasks` | Task board | `RouteGuard TASKS` |
| `/unauthorized` | 403 screen | — |
| `/workload` | Per-employee workload | `RouteGuard STAFF` |

### 9.2 State management

**There is no global store library** — no Redux, Zustand, Jotai, or Recoil, and no SWR/React Query. State is local `useState`/`useReducer` plus four React Context providers:

| Provider | Holds | Exposes |
|---|---|---|
| `AuthProvider` | `user`, `token` (lazily from localStorage), `isLoading` | `login`, `logout`, `quickSwitchUser`, `useAuth` |
| `BreadcrumbsProvider` | Custom crumbs, auto-derived from pathname | `setBreadcrumbs`, `useBreadcrumbs` |
| `FavoritesProvider` | Favorites list; optimistic add/remove; `moms:favorites-updated` event for cross-component sync | `isFavorite`, `toggleFavorite`, `removeFavorite`, `refreshFavorites` |
| `KeyboardShortcutsProvider` | Global `keydown` listener; dispatches `moms:*` window events | `shortcuts`, `setShowHelpModal` |

Permission data is a **module constant**, not context: `lib/permissions.ts` exports `ROLE_PERMISSION_MATRIX`, `MODULE_SUPPORTED_PERMISSIONS`, and helpers `hasModuleAccess` / `canPerformAction` / `canAccessRoute`.

### 9.3 Data fetching (`lib/api.ts`)

`fetchApi(endpoint, options, timeoutMs = 30000)` is the single HTTP entry point:

- **Base URL** — `getApiBaseUrl()` normalizes `NEXT_PUBLIC_API_URL` (appends `/api/v1` if missing), falling back to `http://localhost:4000/api/v1`.
- **Auth** — reads `moms_token` from `localStorage` per call; sets `Authorization: Bearer <token>`.
- **Caching** — in-memory `Map` for GETs; TTL **60 s** for reference endpoints (`/clients`, `/brands`, `/products`, `/users`, `/settings`, …) and **10 s** otherwise; `structuredClone` on read/write so callers can't mutate cached data.
- **In-flight dedup** — concurrent GETs to the same endpoint share one promise.
- **Invalidation** — any non-GET **flushes the entire cache** before the request.
- **Timeout** — per-request `AbortController`.
- **Error normalization** — non-2xx throws an `Error` carrying `.statusCode` and `.remediation`; `AbortError` and network failures get bespoke messages (including a Render cold-start hint and a Vercel misconfiguration hint).
- **401** — clears `moms_token`/`moms_user` and hard-redirects to `/login` (except on the login endpoint itself).

### 9.4 Hooks

- **`usePagination`** — client-side pagination; fetches `/settings/default-page-size` once (module-level cached, concurrent-mount safe) and falls back to 10.
- **`usePermissions`** — memoizes `ROLE_PERMISSION_MATRIX[role]`; exposes `can`, `canAny`, `canAll`, `getModulePermissions`, `isModuleSupported`. `can()` returns `false` for permissions the module doesn't declare.

### 9.5 Shared components (`components/common/`)

`StatusBadge` (~30 status mappings), `PriorityBadge`, `TableSortHeader` + `SortSelector`, `PaginationControls` (+ `paginateData`), `TimelineView` (activity timeline with field diffs), `RouteGuard`, `RoleGuard`, `PermissionGate`, `ConfirmationModal` (typed destructive confirmations), `PermissionsMatrixModal`, `EmptyState` (+ `ModuleEmptyStates` presets), `LoadingSpinner` / `LoadingOverlay`, `ModuleSearchHeader`, `Breadcrumbs`, `FavoriteButton`, `KeyboardShortcutsModal`, `DatePicker`.

### 9.6 Utilities

`utils/dashboardWidgets.ts` (widget config), `utils/exportUtils.ts` (Excel/CSV/PDF), `utils/notificationCategories.ts` (14 categories), `utils/settingsCategories.ts` (10 setting categories), `utils/sortUtils.ts` (`sortData`), `lib/project-scripts.ts` (script serialization), `lib/recent-access.ts` (`useRecentAccess`), `lib/report-permissions.ts` (18 report tabs).

### 9.7 Styling and config

- Tailwind CSS 3.4 + PostCSS/autoprefixer. `tailwind.config.js` scans `src/pages`, `src/components`, `src/app` and extends colors. No plugins, no CSS-in-JS.
- `next.config.js` is minimal: `reactStrictMode: true` and `images.domains: ['images.unsplash.com']`. **No rewrites, no proxy, no custom headers, no static export.**
- `app/layout.tsx` sets `dynamic = 'force-dynamic'`.
- Light theme throughout, with a leftover unused shadcn-style HSL token block in `globals.css`.

### 9.8 Client-side storage

`localStorage` keys (names only): `moms_token` (JWT), `moms_user` (user object), `moms_dashboard_widgets_config` (widget layout).

---

## 10. Backend Structure

```
backend/src/
├── main.ts                     Bootstrap: prefix, URL normalizer, CORS, pipe, filter, interceptor
├── app.module.ts               Global guards (Jwt → Roles → Permissions) + module registration
├── common/
│   ├── enums.ts                Authoritative enum definitions (the real source of status values)
│   ├── decorators/             @Roles, @Public, @CurrentUser
│   ├── guards/                 JwtAuthGuard, RolesGuard
│   ├── permissions/            permissions.guard, permissions.decorator, ROLE_PERMISSION_MATRIX, report-permissions
│   ├── filters/                http-exception.filter (normalizes all errors)
│   ├── interceptors/           transform.interceptor (pass-through)
│   └── utils/event-auth.ts     canUserViewTask / canUserViewProject / canUserViewRequirement / canUserViewEvent
├── prisma/prisma.service.ts    PrismaClient provider
└── modules/<name>/
    ├── <name>.controller.ts    Routes, @Roles, validation DTOs
    ├── <name>.service.ts       Business logic + Prisma
    └── <name>.module.ts        DI wiring
```

**24 modules, each with a controller, service, and module file.** The two heaviest services are `reports.service.ts` (~106 KB) and `tasks.service.ts` (~93 KB).

### 10.1 Authentication flow

1. `POST /api/v1/auth/login` (public) → `AuthService` looks up by lowercased email.
2. Rejects if the user is missing, `isArchived`, or `status ∈ {INACTIVE, SUSPENDED, ARCHIVED}` (**401**).
3. `bcrypt.compare` against the stored hash (**401** on mismatch).
4. Signs a JWT with payload `{ sub, email, role }`, expiry **7 days**.
5. Returns `{ accessToken, user }` (user minus password) and writes a `LOGIN` ActivityLog.

On every request, `JwtStrategy.validate()` **re-queries Prisma by `sub`**, so the role always comes from the live DB row, not the token, and it re-checks archive/status. That user object becomes `request.user`, consumed by `@CurrentUser()` and both guards.

**Logout is client-side only** — the server writes an audit row but never revokes the token.

### 10.2 Authorization layers

| Layer | Mechanism | Failure |
|---|---|---|
| 1. `JwtAuthGuard` | Passport JWT; skips `@Public()` | 401 |
| 2. `RolesGuard` | `ROLES_KEY` metadata; strict `includes(user.role)` | 403 |
| 3. `PermissionsGuard` | `ROLE_PERMISSION_MATRIX[role][module]` includes permission | 403 |
| 4. Service-level row scoping | `event-auth.ts` + inline `user.role` checks | 403 / filtered-out rows |
| 5. Business gates | acceptance, review locks, approval prerequisites | 400 / 403 |

**`@RequirePermission` is nearly unused** — only `ClientsController` applies it, so `PermissionsGuard` effectively only gates the Clients module. Class-level `@UseGuards(...)` declarations are redundant since the guards are global.

### 10.3 Row-level visibility (`common/utils/event-auth.ts`)

The real security boundary. Four exported predicates, evaluated in a fixed order:

- **`canUserViewEvent`** — admin → creator → direct assignment → manager roles → Technical Manager (status-scoped) → client (own client + status-scoped) → approved-status fallback.
- **`canUserViewRequirement`** — admin → **STAFF early-return: assigned or creator only, no status gate** → Technical Manager (status-scoped) → creator → assignment chain → managers → status fallback.
- **`canUserViewProject`** — admin → creator → **STAFF acceptance gate** → team member → task/requirement assignment (STAFF entry must be `ACCEPTED`) → managers → calendar-event gate → status fallback.
- **`canUserViewTask`** — admin → Technical Manager (status-scoped) → creator → media/marketing managers → **STAFF: assigned only** → everyone else.

**`canUserViewTask` deliberately has no acceptance condition** — staff may read a task they have not yet accepted. Only projects apply the acceptance gate to visibility.

### 10.4 Validation and error handling

- **DTO validation** via `class-validator`; the global `ValidationPipe` runs with `whitelist: true` (strips unknown properties) and `transform: true`.
- **`AllExceptionsFilter`** catches everything, maps Prisma's known error codes to 404/409/400, strips stack traces into a `technicalDetails` field, logs a `SYSTEM LOG ENTRY`, and returns the uniform error shape.
- **No custom body-parser limits** are configured; Express defaults apply.

---

## 11. Equipment Management

Documented to match the current code only.

### 11.1 Routes

Ten frontend pages back a single controller:

| Page | Purpose |
|---|---|
| `/equipment` | Master inventory — dashboard, requests, reserve/allocate/retire |
| `/equipment/[id]` | Item detail: overview, assignment, maintenance, damage, timeline |
| `/equipment/assignments` | Per-project allocation (`POST /equipment/allocate`) |
| `/equipment/create` | New asset; auto-generates `EQ-######`; Media Manager only |
| `/equipment/my` | Staff self-service: own handovers + request form |
| `/equipment/dashboard` · `/monitoring` · `/reports` | Ops metrics, live status board, utilization |
| `/equipment/damage` · `/maintenance` · `/history` · `/reservations` | Damage reports, maintenance CRUD, audit trail, reservation table |

Sidebar exposure: managers and technical managers see the full Equipment Management section; staff see only `/equipment/my`; "Add Equipment" is Media Manager only.

### 11.2 Current functionality

- **Two independent status fields** — `availability` and `maintenanceStatus` — plus `isArchived` for retirement.
- **Reservation flow** — a date-window hold (`RESERVED → CHECKED_OUT → RETURNED`) created directly or implicitly by task/project creation.
- **Request flow** — `PENDING → APPROVED | REJECTED → CHECKED_OUT`, with a prepare step, accessory checklist, handover authorization record, and staff acknowledgement statement.
- **Damage and repair** — damage reports force `availability = DAMAGED` and drive `repairStatus` through `PENDING → IN_REPAIR → REPAIRED | UNREPAIRABLE`.
- **Return inspection** — a checklist that derives final availability.
- **Maintenance records** — `ROUTINE_SERVICE`, `REPAIR`, `INSPECTION`, `CLEANING` with scheduling and cost.
- **Movement log** — a permanent audit trail (`ISSUED`, `USED`, `RETURNED`, `RETIRED`).
- **Archive/retire** — soft delete; archived items are rejected by every downstream operation.
- **Hard delete is prohibited** — `DELETE /equipment/:id` and `DELETE /equipment` always return `403`.

### 11.3 Project → Equipment section (`components/projects/ProjectEquipmentTab.tsx`)

**As it stands today, this tab is deliberately minimal.** Documented precisely so it is not over-claimed:

- **Data source:** only the `project` prop — `project.equipmentRequests` and `project.equipmentReservations`. It issues no fetches of its own.
- **Unified list:** requests are the base list; reservations with no matching request are appended as synthetic `res-*` entries.
- **There is no filtering.** `const filteredItems = unifiedItems;` is a no-op alias. No status filter, no search, no category or date filter.
- **There are no summary/stat boxes.** The header renders only a title and heading; the only count is the item total in "Allocated Equipment (N)".
- **There is no grouping.** A flat three-column responsive grid.
- **Per item it shows:** name, `equipmentId`, category, a status badge, rejection reason with reviewer notes, an approved banner, purpose, schedule range, and requester.
- **Manager actions:** inline approve/reject on pending items, and "Issue Gear" on approved non-reservation items. Cancel is shown to anyone on pending/rejected items.
- **Note:** plain reservations are relabelled `APPROVED` client-side for display, so they show an "Approved" banner without having gone through request review.

### 11.4 Business rules

- `reserve()` rejects archived, `DAMAGED`, non-`AVAILABLE`, and anything with an existing `RESERVED` reservation.
- `createRequest()` requires `equipmentId + projectId + purpose` and `expectedReturnDate >= requiredDate`; it holds the item by setting `availability = RESERVED` **before** approval. STAFF may only request for projects they created, are on the team of, or have a task on.
- `reviewRequest()` only accepts `APPROVED`/`REJECTED`, only from `PENDING`; rejection releases the item back to `AVAILABLE`.
- All equipment child records are `onDelete: Restrict`.
- `updateStatus` is a manager-only escape hatch that validates the enum but imposes **no transition rules** — a manager can set any availability directly.

---

## 12. Project Structure

```
MOMS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        ~1100 lines, 50 models (no migrations dir)
│   │   ├── seed.ts
│   │   └── dev.db               stale artifact
│   ├── scripts/                 (empty)
│   ├── seed-approve-all.ts      one-off utility
│   ├── seed-score-weights.ts    one-off utility
│   ├── update-formulas.ts       one-off utility
│   ├── uploads/                 local file storage (gitignored)
│   ├── src/                     see §10 (24 modules)
│   ├── Dockerfile               node:20, prisma generate → nest build
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                 App Router pages (37 routes)
│   │   ├── components/
│   │   │   ├── common/          shared UI + guards
│   │   │   ├── dashboard/       role dashboards + widgets
│   │   │   ├── layout/          shell, header, sidebar
│   │   │   ├── notifications/   detail modal
│   │   │   ├── projects/        project equipment tab
│   │   │   ├── revisions/       revision tab + request modal
│   │   │   ├── tasks/           event→task conversion modal
│   │   │   └── communications/  activity thread
│   │   ├── lib/                 api, contexts, hooks, permissions
│   │   ├── styles/globals.css
│   │   └── utils/               sort, export, categories, widgets
│   ├── Dockerfile               node:20-alpine
│   └── package.json
├── docker-compose.yml           postgres + backend + frontend
├── .gitignore
└── README.md
```

---

## 13. Environment Variables

**Backend** (`backend/.env`, template in `backend/.env.example`) — names only:

```env
DATABASE_URL=      # PostgreSQL connection string
JWT_SECRET=        # JWT signing secret
JWT_EXPIRES_IN=    # Token lifetime
PORT=              # Server port (default 4000)
NODE_ENV=          # production | development
FRONTEND_URL=      # CORS origin(s), comma-separated, or '*'
UPLOAD_DIR=        # Optional local storage directory override
```

**Frontend** (`frontend/.env`, template in `frontend/.env.example`) — names only:

```env
NEXT_PUBLIC_API_URL=   # Backend base URL, e.g. https://host/api/v1
```

**Client-side (browser) storage keys** — not env vars, but part of the contract:

```text
moms_token, moms_user, moms_dashboard_widgets_config
```

> **Security note:** `docker-compose.yml` and `auth.module.ts` both ship a **hardcoded fallback JWT secret**. For any real deployment, set `JWT_SECRET` explicitly — do not rely on the default.

---

## 14. Deployment

### 14.1 Docker Compose (present in the repo)

`docker-compose.yml` defines three services:

| Service | Image / build | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:15-alpine` | 5432 | Named volume `postgres_data` |
| `backend` | `./backend/Dockerfile` (node:20) | 4000 | `prisma generate` → `nest build` → `node dist/main` |
| `frontend` | `./frontend/Dockerfile` (node:20-alpine) | 3000 | `next build` → `next start` |

⚠ The compose file hardcodes a database password, a JWT secret, and sets `NEXT_PUBLIC_API_URL` to `http://localhost:4000/api` (note: `/api`, not `/api/v1` — it works only because of the URL-normalizer middleware). Replace these before any real use.

### 14.2 Hosted deployment (implied, not configured in-repo)

There is **no `render.yaml` or `vercel.json`** in the repository. However, code comments and error messages make the intended targets explicit:

- **Frontend → Vercel.** `lib/api.ts` error remediation says: *"Go to Vercel Project Settings → Environment Variables → Add NEXT_PUBLIC_API_URL … and trigger a Redeploy."*
- **Backend → Render.** The same file references a Render backend and gives a "free tier cold start (~50s)" hint, and `backend/.env.example` names Neon as the database.
- **Database → Neon PostgreSQL** (per `backend/.env.example`).

`main.ts` CORS additionally special-cases `*.vercel.app` suffixes. Treat Vercel + Render + Neon as the **intended** topology, not a verified running configuration.

### 14.3 Running locally

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push      # no migrations directory exists
npm run start:dev       # http://localhost:4000/api/v1

# Frontend (separate shell)
cd frontend
npm install
npm run dev             # http://localhost:3000
```

Or `docker compose up` for all three.

---

## 15. Current Status

### Implemented and working

- JWT auth with login/logout/profile/change-password; live role re-check on every request.
- Three-layer authorization: JWT → roles → permission matrix, plus service-level row scoping.
- Task lifecycle end to end: create → assign → **accept** → produce → technical review → media review → complete, with rejection paths back to `IN_PROGRESS`.
- The **task acceptance gate** and its project-level visibility consequence.
- Revisions: request → accept → in progress → submit → review, with in-place task reset and acceptance re-trigger.
- Projects: creation, indoor/outdoor detail, team, scripts, the 4-stage review chain, completion checklist, archive.
- Graphic requirements: 3-stage review, deliverable CRUD, remarks, timeline, auto task creation.
- Media calendar: event lifecycle, marketing approval, client review, edit-request workflow with revision/approval history.
- Equipment: full reservation + request + handover + damage + repair + maintenance + movement + retirement lifecycle.
- Communications, notifications inbox, activity log, favorites, recent access, file upload.
- Role-dispatched dashboards, 18-tab reports with client-side Excel/CSV/PDF export, workload and capacity views.
- Staff register with departments, skills, and employee lifecycle.

### Partially implemented

- **Notification channels** — the architecture and adapters exist, but all six are logging stubs and the dispatcher is unreachable from business code (only `POST /notifications/channels/test` reaches it).
- **Calendar → project conversion** — no calendar-owned endpoint; projects are created via the tasks service or the projects module instead.
- **Technical Manager project scoping** — the status filter is dead code, so the role sees all projects rather than the intended subset.
- **Graphic requirement deliverable authorization** — the `isStaff` term makes the check pass for any staff user, not just the assignee.
- **Search role filtering** — projects, graphic requirements, and equipment results are unfiltered by role.
- **Settings** — financial/pricing keys and output formulas are seeded and stored but the surrounding calculations are not exercised by any current workflow.

### Pending / not implemented

- Real email/WhatsApp/Slack/Teams/push/mobile delivery.
- Server-side report export (all exports are client-side).
- Server-side token revocation on logout.
- Database migrations (the project uses `prisma db push`).
- Any automated test suite — **there is no test framework, no `*.spec.ts`, and no test script** in either package.

---

## 16. Known Issues / Pending Work

All items below were verified in code, not inferred.

### Correctness

1. **Graphic requirement deliverable gate is a no-op for staff.** The check is `!isAssigned && !isCreator && !isManager && !isStaff`. Because `isStaff` is in the OR, **any** `STAFF` user can add/update/delete deliverables on any requirement, despite the error message saying "Only the assigned staff member …". (`graphic-reqs.service.ts`, deliverable mutations)
2. **Technical Manager project visibility is unscoped.** In `canUserViewProject`, an earlier branch returns `true` for all Technical Managers, making the later `TECH_MANAGER_ALLOWED_PROJECT_STATUSES` filter unreachable dead code.
3. **`ADMINISTRATOR` gets no client/brand search results.** `search.service.ts` checks `role === 'MEDIA_MANAGER' || 'TECHNICAL_MANAGER' || 'ADMIN'` — `ADMINISTRATOR` is missing, so the canonical admin role is excluded.
4. **Global search leaks unfiltered results.** `getGlobalSearch` applies no role filter to `projects`, `graphicReqs`, or `equipment` providers.
5. **Route shadowing on `GET /calendar/edit-requests/all`.** It is declared after `GET /calendar/:id`, so the literal path is captured by the `:id` param route.
6. **`bypassReviewLock` is unchecked.** The graphic-requirement review lock is defeated by a boolean in the request body with no role check.
7. **Equipment return inspection uses substring matching on free text** to decide `DAMAGED` / `UNDER_MAINTENANCE`.
8. **`PATCH /equipment/:id/status` has no transition rules** — a manager can set any availability directly, bypassing the reservation/repair invariants.
9. **Bulk notification delete endpoints are identical.** `DELETE /notifications` and `DELETE /notifications/:id` both call the service with no arguments.
10. **Dead code:** `UNAPPROVED_CALENDAR_STATUSES` is exported but never referenced; `MainLayout` installs a click listener for date pickers; `Header.tsx` destructures `quickSwitchUser`/`showRoleMenu` with no UI.

### Security

11. **Hardcoded JWT secret fallback.** `auth.module.ts` falls back to a literal secret when `JWT_SECRET` is unset; the same value is committed in `docker-compose.yml`.
12. **`quickSwitchUser(email)` logs in with a hardcoded password** in `auth-context.tsx` and is imported by `Header.tsx`. No UI currently triggers it, but the code path ships.
13. **CORS effectively allows all origins** — the callback falls through to `callback(null, true)` on mismatch, and allows everything when `NODE_ENV !== 'production'`.
14. **Legacy `token` localStorage key** is still read in `projects/[id]/page.tsx` alongside `moms_token`.

### Consistency / data model

15. **Schema comments vs. TypeScript enums have drifted** in several places, with **no database enum constraint** to catch it. Notable divergences:
    - `User.role` comment lists 3 roles; the enum has 10.
    - `Equipment.availability` comment lists `MAINTENANCE`/`RETIRED`; the enum uses `UNDER_MAINTENANCE`/`LOST`.
    - `EquipmentMovement.action` comment lists 9 values; the enum has 4.
    - `Approval.approvalType` uses `MEDIA_MANAGER_REVIEW` in the schema but `MEDIA_REVIEW` in the enum.
    - `TaskSourceType` lacks the `REVISION` member that the schema comment documents.
16. **Statuses are written that aren't in any enum**, e.g. `APPROVED` on graphic-requirement create, `TASK_ASSIGNED` and `IN_PRODUCTION` on projects, `WAITING_FOR_MARKETING_APPROVAL` and `PENDING_APPROVAL` on projects.
17. **Three divergent review pipelines** (approvals: 2 stages, projects: 4, graphic requirements: 3) with duplicated and inconsistent transition logic.
18. **Two competing revision state machines** — `Revision.status` and the parent entity's `REVISION_REQUESTED` flag, both of which can write `IN_PROGRESS`.
19. **`'ADMIN'` is used in ~40 service checks but is not in the `Role` enum**, so a user whose role column literally reads `ADMIN` passes service-level checks but is rejected by `@Roles(...)` routes.
20. **Four roles are entirely dormant** — `HR_MANAGER`, `FINANCE_MANAGER`, `SALES_MANAGER`, `CLIENT_COORDINATOR` appear in no guard, filter, or nav item.
21. **The review-lock status list is duplicated** in three places in `tasks.service.ts`.
22. **Graphic requirements bypass the acceptance gate by design** — creation auto-creates pre-accepted tasks.

### Performance

23. **No indexes on the hot filter columns** — `Task.status`, `ShootProject.status`, `Task.projectId`, `ShootProject.clientId`, `Approval.status`.
24. **High measured latency against a remote database.** Against Neon over the internet, even a bare `SELECT 1` costs ~290 ms cold and ~290 ms–580 ms warm, so every request pays that round-trip. Measured API latencies (staff token, 2 runs each): `/tasks` ~11–12 s, `/reports/my-dashboard` ~7–12 s, `/projects` ~6.9 s, `/equipment` ~4–5 s, `/notifications` ~3–4 s. Even trivial endpoints inherit the cost (`/users/departments` ~11 s, `/settings/default-page-size` ~2.5 s), so the network round-trip — not the query shape alone — dominates. Mitigation options: connection pooling (PgBouncer is already in the Neon host), reducing round-trips per request, and caching.
25. **List endpoints are extremely heavy.** Task list and detail deeply include project, calendar event, equipment, files, timelines, remarks, revisions, and approvals. The accept flow was recently optimized (lean authorization read + concurrent side effects + one detail re-read, and the N+1 approval lookup in `syncTaskSourceTypes` was batched), but the same pattern remains elsewhere.
26. **Frontend cache is flushed on every mutation** — any non-GET clears the entire in-memory cache, so a single save re-fetches every cached reference list.
27. **Very large page components** — `tasks/page.tsx` ~234 KB, `calendar/page.tsx` ~193 KB, `projects/[id]/page.tsx` ~192 KB, `graphic-reqs/page.tsx` ~171 KB, `app/page.tsx` ~155 KB.

### Infrastructure

28. **No migrations** — `prisma db push` only, so schema changes are not versioned or reversible.
29. **No automated tests** — no test runner, no spec files, no `test` script in either package. The system's correctness was verified during startup via ad-hoc scripted probes, not a repeatable suite.
30. **Upload limits are inconsistent** — the service assumes 15 MB but no body-parser limit is configured, and the only multipart endpoint is `POST /files/upload`; task deliverable upload takes a JSON `fileUrl` instead.
31. **Frontend routes not in the sidebar** — `/attendance` and `/archive` are reachable but not exposed in navigation for some roles.

---

## Change History

### 2026-09-28
- Initial README created from a full code audit of the current codebase.
- Documented the current state of all modules, roles, permissions, workflows, API surface, database models, and deployment setup.
- Recorded the task-acceptance latency fix: batched the N+1 approval lookup in `syncTaskSourceTypes`, replaced the heavyweight `findOne()` authorization read in `acknowledgeTaskAcceptance` with a lean select, ran side-effect writes concurrently via `Promise.all`, and made the frontend accept flow optimistic with a non-blocking background refresh (removing the blocking success `alert()`).
- **Per-script Clip Codes** on the project Scripts tab: a single number-code input per script, with a remove button. **Strictly restricted to staff assigned to the project** — no admin or manager bypass; every other role sees a read-only list plus an explanatory note.
- **Moved clip codes onto uploaded script documents.** The separate "Shooting Scripts" list on the Scripts tab was removed; each card in **Attached Script Documents** now has its own clip-code field. Codes are stored per document in the new `FileMetadata.clipCodes` column (JSON) instead of inside the project `notes` script blob, and are written only through `POST /files/:id/clip-codes`.
- Access is **strictly assigned staff only** — no admin or manager bypass. The check is a `ProjectAssignment` lookup on the parent project; non-assigned callers get 403 and a duplicate code gets 409. Adds and removes are written to `ActivityLog`.
- Removed the now-unused script-level clip-code endpoint (`POST /projects/:id/scripts/:scriptId/clip-codes` and `updateScriptClipCode()`). `preservePersistedClipCodes()` is kept as a safety net so any legacy codes still inside `notes` survive a generic project update.
- Verified end to end against the running stack: assigned staff add/remove return 201, codes persist across a re-read of the file, all 7 non-assigned accounts get 403, a duplicate returns 409, and removal returns the list to empty.
- **Fixed a pre-existing 500** on `PUT /projects/:id`: the control flag `bypassReviewLock` (sent by the frontend since commit ffc6372) is not a `ShootProject` column, so it reached Prisma and failed with `PrismaClientValidationError`. It is now stripped, along with any other unknown key, so an unrecognised field can no longer break the whole update. Verified: 8/8 payload shapes now return 200.
- Verified the clip-code permission rule end to end against the running stack: assigned staff add/remove succeed (201), all 7 non-assigned accounts including Media Manager get 403, and a smuggled code sent through the generic PUT is stripped while the legitimately-added code survives.
- Recorded that the Project → Equipment tab (`ProjectEquipmentTab.tsx`) currently has **no filtering, no summary boxes, and no grouping** — it is a flat unified list of requests and reservations with manager approve/reject/issue actions.
- Catalogued verified defects: the graphic-requirement deliverable authorization no-op, unscoped Technical Manager project visibility, `ADMINISTRATOR` excluded from client/brand search, global-search role leakage, `bypassReviewLock` without a role check, hardcoded JWT secret fallback, and the dormant `ADMIN`/4 unused roles.
