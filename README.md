# WhatsApp CRM Plugin

A production-ready, modular **WhatsApp CRM Plugin** designed to integrate into an existing SaaS application. The plugin provides a shared team inbox, messaging, contacts, tags, analytics, voice calling (Meta-supported), and realtime updates — with strict multi-tenant isolation and backend-enforced RBAC.

## Implementation Status

**Phase 1–8 initial implementation is complete.** The repository contains:

- `backend/` — Express + TypeScript API (port 5000) with MongoDB models, RBAC, Meta webhooks, Socket.IO, S3 media
- `frontend/` — Next.js App Router UI (port 3000) with three-column inbox, chat, contacts, tags, analytics, settings
- `shared/` — Shared TypeScript types and constants
- `docker-compose.yml` — MongoDB + MinIO for local development

### Quick Start

```bash
# Infrastructure
docker compose up -d

# Backend
cd backend && cp .env.example .env && npm install && npm run seed && npm run dev

# Frontend (separate terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Open http://localhost:3000/whatsapp/inbox

---

## Phase 0 — Project Inspection

### Current Repository State

| Item | Finding |
|------|---------|
| Existing SaaS codebase | **Not present** in this repository |
| Authentication system | **To be integrated** via adapter layer (see below) |
| Tenant/workspace model | **To be integrated** via adapter layer |
| Database | **Greenfield** — MongoDB for WhatsApp CRM data |
| UI framework | **Greenfield** — Next.js frontend (port 3000) |
| API infrastructure | **Greenfield** — Express backend (port 5000) |

### Integration Strategy (No Duplicate Auth)

Because no host SaaS application exists in this repo, the plugin will expose a **pluggable authentication adapter** that the host application configures at deploy time:

```
Host SaaS (JWT / Session / OAuth)
        ↓
Authorization Header / Session Cookie
        ↓
Backend authenticate.ts middleware
        ↓
Auth Adapter (configurable)
        ↓
Resolved: userId, tenantId, role, permissions
```

The backend **never trusts** `tenantId`, `userId`, `role`, or `permissions` from request bodies or query params. These are resolved exclusively from the validated session/token via the adapter.

**Supported adapter modes (V1):**

| Mode | Description |
|------|-------------|
| `JWT` | Verify signed JWT from host SaaS (`Authorization: Bearer <token>`) |
| `SESSION` | Forward session cookie to host SaaS `/api/me` introspection endpoint |
| `MOCK` | Development-only adapter with env-configured user (never in production) |

---

## 1. Architecture Proposal

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Host SaaS Application                           │
│  (Existing auth, billing, user management — NOT duplicated here)        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Auth token / session
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Next.js Frontend  (port 3000)                              │
│  /whatsapp/inbox · /calls · /contacts · /team · /tags · /analytics     │
│  TanStack Query · Socket.IO Client · shadcn/ui · Tailwind               │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                │ REST API                       │ WebSocket
                ▼                                ▼
┌───────────────────────────────┐   ┌─────────────────────────────────────┐
│  Express Backend (port 5000)  │   │  Socket.IO Server                   │
│  REST · Zod · Pino · RBAC     │   │  Tenant rooms · Permission filter   │
└───────┬───────────┬───────────┘   └─────────────────────────────────────┘
        │           │
        ▼           ▼
┌───────────────┐  ┌──────────────────────────────────────────────────────┐
│   MongoDB     │  │  S3-Compatible Object Storage                        │
│   (Mongoose)  │  │  Presigned URLs for media access                     │
└───────────────┘  └──────────────────────────────────────────────────────┘
        ▲
        │ Webhook POST
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Meta WhatsApp Cloud API                              │
│  Messages · Media · Status · Calls (where supported)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

| Flow | Path |
|------|------|
| **Outgoing message** | Frontend → Backend (auth + RBAC) → Meta API → Customer → Meta status webhook → MongoDB → Socket.IO → Frontend |
| **Incoming message** | Customer → WhatsApp → Meta → Backend webhook → MongoDB → Socket.IO → Authorized users |
| **Media** | Meta media ID → Backend download → S3 upload → storageKey → Presigned URL → Frontend |
| **Realtime** | Backend event → Socket.IO (tenant + RBAC filtered) → Frontend |

### Multi-Tenant Model (V1)

```
Tenant
  └── WhatsAppAccount[]     ← V1 uses one active account; schema supports many
        └── Contact[]
        └── Conversation[]
              └── Message[]
              └── InternalNote[]    ← NEVER sent to Meta
              └── Call[]
```

Every MongoDB query filters by `tenantId`. Cross-tenant access is blocked at middleware and query level.

---

## 2. MongoDB Database Design

### Collections & Relationships

```
WhatsAppAccount ──< Contact
       │               │
       └───────< Conversation >──── Contact
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Message   InternalNote   Call
          │
    ┌─────┴─────┐
    ▼           ▼
MessageMedia  MessageReaction

Tag (tenant-scoped, referenced by Contact[] and Conversation[])
ConversationAssignment (history)
ConversationRead (per-user read state)
ActivityLog (audit trail)
CallEvent (call lifecycle events)
```

### Collection Schemas

#### WhatsAppAccount
| Field | Type | Notes |
|-------|------|-------|
| tenantId | ObjectId/String | Indexed |
| phoneNumberId | String | Meta phone number ID, indexed |
| businessAccountId | String | WABA ID, indexed |
| displayPhoneNumber | String | Human-readable |
| encryptedAccessToken | String | AES-256-GCM encrypted |
| connectionStatus | Enum | `CONNECTED`, `DISCONNECTED`, `PENDING` |
| webhookConfigured | Boolean | |
| createdAt / updatedAt | Date | |

**Indexes:** `tenantId`, `phoneNumberId`, `businessAccountId`, `{ tenantId: 1, phoneNumberId: 1 }` (unique)

#### Contact
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| whatsappAccountId | ObjectId | |
| name | String | |
| phone | String | E.164 |
| whatsappId | String | Meta wa_id |
| profileImage | String | S3 key or URL |
| assignedUserId | String | Nullable |
| tags | ObjectId[] | Ref Tag |
| createdAt / updatedAt | Date | |

**Indexes:** `{ tenantId: 1, phone: 1 }`, `{ tenantId: 1, whatsappId: 1 }`

#### Conversation
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| whatsappAccountId | ObjectId | |
| contactId | ObjectId | |
| assignedUserId | String | Nullable |
| permittedUsers | String[] | Explicit agent access |
| status | Enum | `OPEN`, `PENDING`, `RESOLVED`, `CLOSED` |
| priority | Enum | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| tags | ObjectId[] | |
| unreadCount | Number | |
| lastMessage | String | Preview text |
| lastMessageAt | Date | |
| createdAt / updatedAt | Date | |

**Indexes:** `{ tenantId: 1, assignedUserId: 1 }`, `{ tenantId: 1, status: 1 }`, `{ tenantId: 1, lastMessageAt: -1 }`

#### Message
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| conversationId | ObjectId | |
| contactId | ObjectId | |
| metaMessageId | String | Unique per tenant |
| direction | Enum | `INCOMING`, `OUTGOING` |
| type | Enum | `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `VOICE`, `DOCUMENT`, `STICKER`, `LOCATION`, `CONTACT`, `INTERACTIVE` |
| content | Mixed | Text or structured payload |
| replyToMessageId | ObjectId | Nullable |
| status | Enum | `SENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED` |
| sentByUserId | String | Outgoing only |
| isPinned | Boolean | |
| isStarred | Boolean | |
| createdAt / updatedAt | Date | |

**Indexes:** `{ conversationId: 1, createdAt: -1 }`, `{ tenantId: 1, metaMessageId: 1 }` (unique, sparse)

#### MessageMedia
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| messageId | ObjectId | |
| metaMediaId | String | |
| mediaType | String | |
| mimeType | String | |
| fileName | String | |
| fileSize | Number | |
| storageKey | String | S3 object key |
| createdAt | Date | |

#### MessageReaction
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| messageId | ObjectId | |
| emoji | String | |
| reactedBy | String | userId or wa_id |
| reactedAt | Date | |

#### ConversationAssignment
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| conversationId | ObjectId | |
| assignedUserId | String | |
| assignedBy | String | |
| assignedAt | Date | |

#### InternalNote
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| conversationId | ObjectId | |
| content | String | **Never sent to Meta** |
| createdBy | String | |
| createdAt / updatedAt | Date | |

#### Tag
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| name | String | |
| createdBy | String | |
| createdAt | Date | |

**Default tags (seeded per tenant):** VIP, New Customer, Refund, Urgent, Order, Lead, Payment, Complaint

#### ConversationRead
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| conversationId | ObjectId | |
| userId | String | |
| lastReadMessageId | ObjectId | |
| lastReadAt | Date | |

#### ActivityLog
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| userId | String | |
| action | String | e.g. `conversation.assigned` |
| resourceType | String | |
| resourceId | String | |
| metadata | Mixed | |
| createdAt | Date | |

#### Call
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| whatsappAccountId | ObjectId | |
| conversationId | ObjectId | |
| contactId | ObjectId | |
| initiatedByUserId | String | |
| direction | Enum | `INCOMING`, `OUTGOING` |
| status | Enum | `INITIATING`, `RINGING`, `CONNECTED`, `ENDED`, `MISSED`, `REJECTED`, `FAILED` |
| metaCallId | String | |
| startedAt / endedAt | Date | |
| duration | Number | Seconds |
| failureReason | String | |
| createdAt / updatedAt | Date | |

#### CallEvent
| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | |
| callId | ObjectId | |
| eventType | String | |
| metadata | Mixed | |
| createdAt | Date | |

### Tenant Isolation Strategy

1. **Every query** includes `{ tenantId: req.user.tenantId }`
2. **Compound indexes** lead with `tenantId`
3. **Middleware chain** validates tenant before any resource access
4. **Socket.IO rooms** scoped as `tenant:{tenantId}` with per-event RBAC filtering
5. **S3 keys** prefixed: `{tenantId}/{whatsappAccountId}/{uuid}`

---

## 3. RBAC Flow

### Request Pipeline

```
API Request
    ↓
authenticate.ts        → Validate token/session via auth adapter
    ↓
tenantAccess.ts        → Attach tenantId from auth (never from client)
    ↓
requireRole.ts         → Check route-level role (admin-only routes)
    ↓
requirePermission.ts   → Check granular permissions
    ↓
conversationAccess.ts  → Per-conversation access check
    ↓
Controller / Service
    ↓
ALLOW (200) or DENY (403)
```

### Admin Access

```
IF currentUser.role === 'ADMIN'
   AND conversation.tenantId === currentUser.tenantId
THEN ALLOW
```

Admin can: view all conversations, assign/reassign, manage tags/team/settings, view all analytics and call history.

### Agent Access

```
IF conversation.tenantId === currentUser.tenantId
   AND (
     conversation.assignedUserId === currentUser.userId
     OR currentUser.userId IN conversation.permittedUsers
   )
THEN ALLOW
ELSE 403 Forbidden
```

Agent cannot: view unassigned/unpermitted conversations, manage team, manage tenant-wide WhatsApp settings.

### Frontend Route Protection

| Route | Admin | Agent |
|-------|-------|-------|
| `/whatsapp` | ✓ | Redirect to inbox |
| `/whatsapp/inbox` | ✓ | ✓ |
| `/whatsapp/calls` | ✓ | ✓ (permitted) |
| `/whatsapp/contacts` | ✓ | ✓ (permitted) |
| `/whatsapp/team` | ✓ | ✗ |
| `/whatsapp/tags` | ✓ | ✓ (read/add where permitted) |
| `/whatsapp/analytics` | ✓ | ✗ |
| `/whatsapp/settings` | ✓ (full) | ✓ (personal only) |

Frontend navigation is UX-only; **backend always enforces RBAC**.

---

## 4. WhatsApp Message & Webhook Flow

### Incoming Message Flow

```
Customer sends WhatsApp message
    ↓
Meta WhatsApp Cloud API
    ↓
POST /api/whatsapp/webhook
    ↓
Verify X-Hub-Signature-256 (HMAC SHA256)
    ↓
Parse webhook payload
    ↓
Identify phone_number_id → Find WhatsAppAccount → Resolve tenantId
    ↓
Find or create Contact (by whatsappId / phone)
    ↓
Find or create Conversation (OPEN status)
    ↓
If media: download from Meta → upload to S3 → save MessageMedia
    ↓
Save Message (direction: INCOMING, status: DELIVERED)
    ↓
Update Conversation (lastMessage, lastMessageAt, unreadCount++)
    ↓
Emit Socket.IO: message.created, conversation.updated
    ↓
Deliver only to authorized users in tenant
```

### Outgoing Message Flow

```
Agent/Admin composes message in Next.js
    ↓
POST /api/whatsapp/conversations/:id/messages
    ↓
Auth → Tenant → RBAC → Conversation access
    ↓
Create Message (status: SENDING)
    ↓
If media: upload to S3 → upload to Meta → get media ID
    ↓
POST to Meta Cloud API (/{phone-number-id}/messages)
    ↓
Save metaMessageId, update status: SENT
    ↓
Emit Socket.IO: message.created
    ↓
Meta sends status webhook (sent → delivered → read)
    ↓
Update Message.status from webhook (never faked)
    ↓
Emit Socket.IO: message.status.updated
```

### Webhook Events Handled

| Meta Event | Action |
|------------|--------|
| `messages` | Create incoming message |
| `statuses` | Update message status (sent/delivered/read/failed) |
| `calls` | Process call events (if Meta Calling enabled) |
| GET verification | Hub challenge response |

---

## 5. Voice Calling Architecture

### Meta API Reality (Important)

WhatsApp Business Calling via Cloud API is **region/account-dependent** and requires explicit Meta approval. The plugin will:

| Layer | Status |
|-------|--------|
| **Data models** (Call, CallEvent) | ✅ Implemented in V1 |
| **Call history UI** | ✅ Implemented in V1 |
| **REST endpoints** (start/accept/reject/end) | ✅ Scaffolded with Meta API guard |
| **Actual Meta Calling API calls** | ⚠️ Only when `CALLING_ENABLED=true` and account verified |
| **WebRTC / unofficial calling** | ❌ Never implemented |

### Supported Functionality (V1)

- Call record creation and persistence
- Call event logging (CallEvent collection)
- Incoming call webhook processing (when Meta sends events)
- Call history list and detail views
- Realtime call state via Socket.IO
- RBAC on call access (same rules as conversations)

### Meta API-Dependent Functionality

- `POST /api/whatsapp/calls/start` → Meta Calling API (requires enabled account)
- `POST /api/whatsapp/calls/:id/accept` → Meta accept endpoint
- `POST /api/whatsapp/calls/:id/reject` → Meta reject endpoint
- `POST /api/whatsapp/calls/:id/end` → Meta end endpoint

When Meta Calling is not enabled, endpoints return `503 Service Unavailable` with clear message; UI shows call history only.

### Call State Machine

```
OUTGOING: INITIATING → RINGING → CONNECTED → ENDED
                              ↘ MISSED / REJECTED / FAILED

INCOMING: RINGING → CONNECTED → ENDED
                 ↘ MISSED / REJECTED
```

---

## 6. API List

### Conversations
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/conversations` | Admin: all; Agent: assigned/permitted |
| GET | `/api/whatsapp/conversations/:id` | RBAC |
| POST | `/api/whatsapp/conversations/:id/assign` | Admin |
| PUT | `/api/whatsapp/conversations/:id/status` | RBAC |
| PUT | `/api/whatsapp/conversations/:id/priority` | Admin |
| PUT | `/api/whatsapp/conversations/:id/tags` | Admin / permitted Agent |
| GET | `/api/whatsapp/conversations/:id/activity` | RBAC |
| POST | `/api/whatsapp/conversations/:id/notes` | RBAC |
| GET | `/api/whatsapp/conversations/:id/notes` | RBAC |

### Messages
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/conversations/:id/messages` | RBAC |
| POST | `/api/whatsapp/conversations/:id/messages` | RBAC |
| POST | `/api/whatsapp/messages/:id/reactions` | RBAC |
| POST | `/api/whatsapp/messages/:id/pin` | RBAC |
| POST | `/api/whatsapp/messages/:id/star` | RBAC |
| POST | `/api/whatsapp/messages/:id/retry` | RBAC |

### Calls
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/whatsapp/calls/start` | RBAC + Meta enabled |
| POST | `/api/whatsapp/calls/:id/accept` | RBAC + Meta enabled |
| POST | `/api/whatsapp/calls/:id/reject` | RBAC + Meta enabled |
| POST | `/api/whatsapp/calls/:id/end` | RBAC + Meta enabled |
| GET | `/api/whatsapp/calls` | Admin: all; Agent: permitted |
| GET | `/api/whatsapp/calls/:id` | RBAC |

### Contacts
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/contacts` | Admin: all; Agent: assigned/permitted |
| GET | `/api/whatsapp/contacts/:id` | RBAC |
| PUT | `/api/whatsapp/contacts/:id` | Admin / assigned Agent |
| PUT | `/api/whatsapp/contacts/:id/assign` | Admin |

### Tags
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/tags` | All authenticated |
| POST | `/api/whatsapp/tags` | Admin |
| PUT | `/api/whatsapp/tags/:id` | Admin |
| DELETE | `/api/whatsapp/tags/:id` | Admin |

### Team
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/team` | Admin |
| GET | `/api/whatsapp/team/workload` | Admin |

### Analytics
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/analytics/conversations` | Admin |
| GET | `/api/whatsapp/analytics/messages` | Admin |
| GET | `/api/whatsapp/analytics/agents` | Admin |
| GET | `/api/whatsapp/analytics/calls` | Admin |

### Settings
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/settings/account` | Admin |
| PUT | `/api/whatsapp/settings/account` | Admin |
| POST | `/api/whatsapp/settings/account/verify` | Admin |
| GET | `/api/whatsapp/settings/webhook` | Admin |

### Media
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/whatsapp/media/upload` | RBAC |
| GET | `/api/whatsapp/media/:id/url` | RBAC (presigned URL) |

### Webhook
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/whatsapp/webhook` | Meta verification (public) |
| POST | `/api/whatsapp/webhook` | Meta events (signature verified) |

### Health
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/health` | Public |

---

## 7. Frontend Components

### Pages (`frontend/app/whatsapp/`)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `page.tsx` | Admin overview / redirect |
| Inbox | `inbox/page.tsx` | Three-column inbox layout |
| Calls | `calls/page.tsx` | Call history and active calls |
| Contacts | `contacts/page.tsx` | Contact list and detail |
| Team | `team/page.tsx` | Team management (Admin) |
| Tags | `tags/page.tsx` | Tag management |
| Analytics | `analytics/page.tsx` | Dashboards (Admin) |
| Settings | `settings/page.tsx` | WhatsApp account config |

### Components (`frontend/components/whatsapp/`)

```
shared/
  ├── Sidebar.tsx              # Role-aware navigation
  ├── Header.tsx
  ├── LoadingSpinner.tsx
  └── RoleGuard.tsx

inbox/
  ├── ConversationList.tsx     # Left panel
  ├── ConversationFilters.tsx  # Admin/Agent filters
  └── ConversationSearch.tsx

chat/
  ├── ChatWindow.tsx           # Center panel
  ├── MessageBubble.tsx
  ├── MessageComposer.tsx
  ├── EmojiPicker.tsx
  ├── AttachmentUpload.tsx
  ├── MessageActions.tsx       # Reply, react, pin, star
  └── DeliveryStatus.tsx

calls/
  ├── CallPanel.tsx
  ├── CallHistory.tsx
  └── ActiveCallBanner.tsx

contacts/
  ├── ContactList.tsx
  └── ContactDetail.tsx

CustomerDetails.tsx            # Right panel
InternalNotes.tsx              # Right panel
PinnedMessages.tsx
StarredMessages.tsx
MediaGallery.tsx
```

### Hooks

| Hook | Purpose |
|------|---------|
| `useConversations.ts` | List, filter, select conversations |
| `useMessages.ts` | Fetch, send, react, pin, star messages |
| `useSocket.ts` | Socket.IO connection and event handlers |
| `useCalls.ts` | Call history and actions |
| `useContacts.ts` | Contact management |
| `useAnalytics.ts` | Analytics data (Admin) |
| `useAuth.ts` | Current user role/permissions from host SaaS |

---

## 8. Files to Create

### Root
```
whatsapp-crm-plugin/
├── README.md
├── .gitignore
├── docker-compose.yml          # MongoDB + MinIO for local dev
└── shared/
    ├── types/
    │   ├── conversation.ts
    │   ├── message.ts
    │   ├── call.ts
    │   └── user.ts
    ├── constants/
    │   ├── messageTypes.ts
    │   ├── conversationStatus.ts
    │   └── permissions.ts
    └── validation/
        ├── conversation.schema.ts
        └── message.schema.ts
```

### Backend (~80 files)
```
backend/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── server.ts
    ├── config/
    │   ├── database.ts
    │   ├── env.ts
    │   └── logger.ts
    ├── routes/                  # 8 route files
    ├── controllers/             # 8 controller files
    ├── middleware/
    │   ├── authenticate.ts
    │   ├── requireRole.ts
    │   ├── requirePermission.ts
    │   ├── tenantAccess.ts
    │   ├── conversationAccess.ts
    │   ├── callAccess.ts
    │   └── rateLimiter.ts
    ├── models/                  # 11 Mongoose models
    ├── services/
    │   ├── whatsapp/            # Meta API client, token encryption
    │   ├── messages/
    │   ├── conversations/
    │   ├── calls/
    │   ├── media/               # S3 + presigned URLs
    │   ├── rbac/
    │   └── realtime/
    ├── webhook/
    │   └── whatsappWebhook.ts
    ├── socket/
    │   └── socketServer.ts
    ├── validators/              # Zod schemas
    ├── utils/
    │   ├── encryption.ts
    │   └── pagination.ts
    └── types/
```

### Frontend (~60 files)
```
frontend/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.example
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── whatsapp/               # 8 page routes
├── components/
│   └── whatsapp/               # ~25 components
├── hooks/                      # 7 hooks
├── lib/
│   ├── api.ts
│   ├── socket.ts
│   └── utils.ts
└── types/
```

---

## 9. Implementation Phases

| Phase | Scope | Deliverables |
|-------|-------|--------------|
| **0** | Inspection + Architecture | This README ✅ |
| **1** | MongoDB + Tenant + RBAC | Models, indexes, auth adapter, middleware chain |
| **2** | Meta WhatsApp API + Webhooks | Account config, encrypted tokens, webhook, send/receive, media |
| **3** | Next.js Inbox + Chat + Media | Three-column UI, composer, attachments, delivery status |
| **4** | Voice Calling | Call models, Meta-guarded endpoints, call history UI |
| **5** | Team + Assignment | Assign/reassign, workload, permission enforcement |
| **6** | Contacts + Tags + Notes | Full CRM features, pin/star, activity log |
| **7** | Analytics | Conversation, message, agent, call dashboards |
| **8** | Realtime + Security + Testing | Socket.IO, rate limiting, audit logging, tests |

### V1 Exclusions

- Chatbot / Flow Builder / AI Agent
- Broadcast messaging / Marketing automation
- Multiple active WhatsApp numbers (schema ready, not V1 UI)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, App Router, Tailwind CSS, shadcn/ui, TanStack Query, Socket.IO Client |
| Backend | Node.js, TypeScript, Express.js, Socket.IO, Zod, Pino |
| Database | MongoDB, Mongoose ODM |
| Storage | S3-compatible (AWS S3 / MinIO), presigned URLs |
| External | Meta WhatsApp Cloud API |

## Local Development Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 5000 |
| MongoDB | 27017 |
| MinIO (S3) | 9000 |

---

## Getting Started (After Implementation)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:5000

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:3000

# Infrastructure
docker compose up -d  # MongoDB + MinIO
```

---

## Security Checklist

- [ ] Auth adapter validates every request
- [ ] tenantId never from client input
- [ ] RBAC on every protected route
- [ ] Conversation-level access for agents
- [ ] Webhook HMAC verification
- [ ] WhatsApp tokens encrypted at rest (AES-256-GCM)
- [ ] Meta tokens never exposed to frontend
- [ ] S3 presigned URLs with short TTL
- [ ] Rate limiting on API and webhook
- [ ] Pino structured logging
- [ ] ActivityLog audit trail
- [ ] Internal notes isolated from Meta API calls

---

## Approval

Architecture approved. Implementation complete for V1 scaffold.

## License

Proprietary — integrate into your SaaS application under your existing license terms.
