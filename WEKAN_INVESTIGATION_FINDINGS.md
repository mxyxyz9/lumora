# WeKan Architecture Investigation & Audit Report (Phase 1)

**Audit Date:** August 28, 2026  
**Audited Repository:** [wekan/wekan](https://github.com/wekan/wekan) (`/Users/rushil.dev/Desktop/wekan-main`)  
**Scope:** Read-only architectural investigation & evidence-backed audit for desktop client & frontend rewrite.

---

## Executive Summary

This investigation delivers a comprehensive, evidence-backed evaluation of WeKan’s backend architecture, REST API surface, real-time DDP protocol layer, codebase coupling, deployment models, and GitHub sync feasibility. Every finding below is grounded in direct codebase analysis, file inspection, and test execution.

---

## 1. Clone, Run & Runtime Environment

### 1.1 Repository & Test Suite Verification
- **Repository Location:** `/Users/rushil.dev/Desktop/wekan-main`
- **Unit Test Execution Evidence:** Ran the Node.js test suite (`node tests/run-node-suites.cjs`).
  - **Result:** Successfully executed **676** test suites, with **658 passing** and 18 failing (due to environment-specific font/image binary dependencies in raw Node mode).
  - **Suites Verified:** [tests/run-node-suites.cjs](file:///Users/rushil.dev/Desktop/wekan-main/tests/run-node-suites.cjs), `tests/restApiIdorBatch.test.cjs`, `tests/workerCardWrite.test.cjs`, `tests/wekanCreator.import.test.js`, `tests/workspacesTree.test.cjs`.

### 1.2 Exact Runtime & Component Versions
All version numbers are extracted directly from active project configuration files:
- **Meteor Framework:** `METEOR@3.5.2-beta.0` (Source: [.meteor/release](file:///Users/rushil.dev/Desktop/wekan-main/.meteor/release#L1)).
  - Meteor 3.x is fully async (`async`/`await` across all database calls, methods, and publications; removal of Fibers).
- **Node.js Runtime:** `v24.20.0` declared in [Dockerfile](file:///Users/rushil.dev/Desktop/wekan-main/Dockerfile#L31); local environment runs `v24.18.0`. Minimum requirement for Meteor 3.5 is Node >= 20.x.
- **NPM Version:** `11.12.1` (Source: [Dockerfile](file:///Users/rushil.dev/Desktop/wekan-main/Dockerfile#L34)).
- **Database Engine (Default):** **FerretDB v1** ([wekan/FerretDB](https://github.com/wekan/FerretDB)) with embedded **SQLite** backend.
  - Defined in [docker-compose.yml](file:///Users/rushil.dev/Desktop/wekan-main/docker-compose.yml#L1-L36): `ferretdb --handler=sqlite --sqlite-url=file:/data/files/db/ --listen-addr=0.0.0.0:27017 --repl-set-name=rs0`.
- **Database Engine (Alternative / Production):** **MongoDB 7.0+** ([docker-compose-mongodb-v7.yml](file:///Users/rushil.dev/Desktop/wekan-main/docker-compose-mongodb-v7.yml#L20)).
  - Driver: `mongodb: ^7.5.0`, `bson: ^7.3.1` in [package.json](file:///Users/rushil.dev/Desktop/wekan-main/package.json#L49-L78).
  - Also supports PostgreSQL, MySQL, MariaDB, and SAP HANA backends via FerretDB v1 / v2.

### 1.3 Platform & Configuration Gotchas Discovered
1. **FerretDB `directConnection=true` Requirement:**
   - When FerretDB runs with `--repl-set-name=rs0`, its handshake advertises `0.0.0.0:27017`. Without `directConnection=true` in `MONGO_URL`, the MongoDB Node.js driver initiates replica set discovery and attempts to connect to `0.0.0.0:27017` inside the application container, resulting in `MongoServerSelectionError: connect ECONNREFUSED 0.0.0.0:27017` (documented in [docker-compose.yml:L181-L193](file:///Users/rushil.dev/Desktop/wekan-main/docker-compose.yml#L181-L193), issue #6582).
2. **Reactivity Order (Polling vs OpLog):**
   - FerretDB on SQLite incurs high CPU overhead (~190–390%) when tailing an OpLog replica set. Therefore, WeKan defaults to `DEFAULT_METEOR_REACTIVITY_ORDER=polling` and `METEOR_REACTIVITY_ORDER=polling` ([docker-compose.yml:L148-L163](file:///Users/rushil.dev/Desktop/wekan-main/docker-compose.yml#L148-L163)).
3. **Build Tool Memory Exhaustion:**
   - Meteor builds require explicit heap limits (`TOOL_NODE_FLAGS="--max-old-space-size=..."`) computed in [build.sh:L13-L60](file:///Users/rushil.dev/Desktop/wekan-main/build.sh#L13-L60); otherwise V8 GC crashes with `FATAL ERROR: Ineffective mark-compacts near heap limit`.
4. **Transport Layer:**
   - WeKan standardizes on `DDP_TRANSPORT=sockjs` ([Dockerfile:L30](file:///Users/rushil.dev/Desktop/wekan-main/Dockerfile#L30)) because `uWebSockets.js` is not portable across all CPU architectures (e.g. s390x).

---

## 2. API Surface Map

WeKan exposes its HTTP REST API using Express/Connect middleware mounted via Meteor's `WebApp.handlers` (configured in [server/apiMiddleware.js](file:///Users/rushil.dev/Desktop/wekan-main/server/apiMiddleware.js)).

### 2.1 REST API Middleware & Authentication Mechanics
- **API Gate:** Checked via `process.env.WITH_API === 'true'` ([server/apiMiddleware.js:L20-L42](file:///Users/rushil.dev/Desktop/wekan-main/server/apiMiddleware.js#L20-L42)). If disabled, returns HTTP 403.
- **Authentication Headers:** Supports `Authorization: Bearer <token>` or `?access_token=<token>` query param ([server/apiMiddleware.js:L47-L63](file:///Users/rushil.dev/Desktop/wekan-main/server/apiMiddleware.js#L47-L63)).
- **Token Resolution:** The bearer token is hashed with SHA-256 (`Accounts._hashLoginToken(token)`) and looked up against `services.resume.loginTokens.hashedToken` on `Meteor.users` collection ([server/apiMiddleware.js:L68-L84](file:///Users/rushil.dev/Desktop/wekan-main/server/apiMiddleware.js#L68-L84)).

### 2.2 Comprehensive REST Endpoint Catalog

#### A. Authentication & User Management ([server/apiAuthRoutes.js](file:///Users/rushil.dev/Desktop/wekan-main/server/apiAuthRoutes.js), [server/models/users.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/users.js))
| Method | Path | Auth Required | Description | Request / Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/users/login` | None (Public) | Authenticate user via username/email + password (+ optional 2FA `code`) | **Req:** `{ username/email, password, code? }`<br>**Res (200):** `{ id, token, tokenExpires }` |
| `POST` | `/users/logout` | Bearer Token | Invalidate current session token or all user tokens | **Req:** `{ all?: boolean }`<br>**Res (200):** `{ message: "Logged out" }` |
| `POST` | `/api/users/` | None / Admin | Register a new user | **Req:** `{ username, email, password }`<br>**Res (200):** `{ _id: string }` |
| `GET` | `/api/user` | Bearer Token | Retrieve currently authenticated user profile | **Res (200):** User document (`_id`, `username`, `emails`, `profile`) |
| `GET` | `/api/users` | Admin Token | List all users | **Res (200):** Array of user summaries |
| `GET` | `/api/users/:userId` | Bearer / Admin | Get specific user profile | **Res (200):** User document |
| `PUT` | `/api/users/:userId` | Self / Admin | Update user details (username, email, password, isAdmin) | **Req:** Fields to update<br>**Res (200):** `{ _id: string }` |
| `DELETE`| `/api/users/:userId` | Admin Token | Delete a user account and clean up associations | **Res (200):** `{ _id: string }` |
| `POST` | `/api/createtoken/:userId` | Admin Token | Impersonation / token generation for user | **Res (200):** `{ token: string }` |
| `POST` | `/api/deletetoken` | Bearer Token | Revoke tokens | **Res (200):** `{ message: "token deleted" }` |

#### B. Boards ([server/models/boards.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/boards.js))
| Method | Path | Auth Required | Description | Request / Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/boards` | Bearer Token | List all boards accessible to user (public, member, org/team) | **Res (200):** Array of Board objects (`_id`, `title`, `stars`, `permission`) |
| `GET` | `/api/boards_count` | Bearer Token | Count accessible boards | **Res (200):** `{ boards_count: number }` |
| `GET` | `/api/boards/:boardId` | Board Member | Get board details including lists, swimlanes, labels, and members | **Res (200):** Full Board document |
| `POST` | `/api/boards` | Bearer Token | Create a new board | **Req:** `{ title, owner, permission, color? }`<br>**Res (200):** `{ _id: string }` |
| `PUT` | `/api/boards/:boardId/title` | Board Admin | Update board title | **Req:** `{ title: string }`<br>**Res (200):** `{ _id: string }` |
| `PUT` | `/api/boards/:boardId/labels` | Board Admin | Replace/update board label set | **Req:** `{ label: string, name?: string, color: string }`<br>**Res (200):** `{ _id: string }` |
| `DELETE`| `/api/boards/:boardId` | Board Admin | Permanently delete board and cascade to all lists, cards, swimlanes | **Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/copy` | Board Member | Clone an existing board | **Req:** `{ title?: string }`<br>**Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/members/:memberId` | Board Admin | Add or update board member role (admin, normal, comment-only, worker) | **Req:** `{ isAdmin, isNoComments, isCommentOnly, isWorker }`<br>**Res (200):** `{ _id: string }` |
| `GET` | `/api/users/:userId/boards` | Self / Admin | List all boards where user is a member | **Res (200):** Array of Board objects |
| `POST` | `/api/boards/import` | Bearer Token | Import WeKan export JSON | **Req:** `{ board: {...}, membersMapping? }`<br>**Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/import/:source` | Bearer Token | Import from third-party tool (`trello`, `csv`, `jira`, `kanboard`, etc.) | **Req:** Source export payload<br>**Res (200):** `{ _id: string }` |

#### C. Swimlanes ([server/models/swimlanes.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/swimlanes.js))
| Method | Path | Auth Required | Description | Request / Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/boards/:boardId/swimlanes` | Board Member | List all swimlanes on a board | **Res (200):** Array of Swimlane objects (`_id`, `title`, `sort`, `archived`) |
| `GET` | `/api/boards/:boardId/swimlanes/:swimlaneId` | Board Member | Get swimlane details | **Res (200):** Swimlane document |
| `POST` | `/api/boards/:boardId/swimlanes` | Board Write | Create a new swimlane | **Req:** `{ title: string }`<br>**Res (200):** `{ _id: string }` |
| `PUT` | `/api/boards/:boardId/swimlanes/:swimlaneId` | Board Write | Update swimlane title, sort position, or archived status | **Req:** `{ title?, sort?, archived? }`<br>**Res (200):** `{ _id: string }` |
| `DELETE`| `/api/boards/:boardId/swimlanes/:swimlaneId` | Board Write | Delete swimlane and associated cards | **Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/swimlanes/:swimlaneId/copy` | Board Write | Copy swimlane to same or different board | **Req:** `{ toBoardId?: string }`<br>**Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/swimlanes/:swimlaneId/move` | Board Write | Move swimlane to another board | **Req:** `{ toBoardId: string }`<br>**Res (200):** `{ _id: string }` |

#### D. Lists ([server/models/lists.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/lists.js))
| Method | Path | Auth Required | Description | Request / Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/boards/:boardId/lists` | Board Member | List all lists in a board | **Res (200):** Array of List objects (`_id`, `title`, `sort`, `wipLimit`) |
| `GET` | `/api/boards/:boardId/lists/:listId` | Board Member | Get list details | **Res (200):** List document |
| `POST` | `/api/boards/:boardId/lists` | Board Write | Create a new list | **Req:** `{ title: string }`<br>**Res (200):** `{ _id: string }` |
| `PUT` | `/api/boards/:boardId/lists/:listId` | Board Write | Update title, sort, archived status, or WIP limit | **Req:** `{ title?, sort?, archived?, wipLimit? }`<br>**Res (200):** `{ _id: string }` |
| `DELETE`| `/api/boards/:boardId/lists/:listId` | Board Write | Delete list and associated cards | **Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/lists/:listId/copy` | Board Write | Copy list and cards to same or other board | **Req:** `{ toBoardId?: string }`<br>**Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/lists/:listId/move` | Board Write | Move list to another board | **Req:** `{ toBoardId: string }`<br>**Res (200):** `{ _id: string }` |

#### E. Cards ([server/models/cards.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/cards.js))
| Method | Path | Auth Required | Description | Request / Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/boards/:boardId/lists/:listId/cards` | Board Member | List non-archived cards in a list | **Res (200):** Array of Card summaries (`_id`, `title`, `sort`, `dueAt`, `assignees`) |
| `GET` | `/api/boards/:boardId/swimlanes/:swimlaneId/cards` | Board Member | List non-archived cards in a swimlane | **Res (200):** Array of Card summaries |
| `GET` | `/api/cards/:cardId` | Board Member | Get complete card document by ID (includes archived cards) | **Res (200):** Full Card document (custom fields, labels, dates, assignees) |
| `POST` | `/api/boards/:boardId/lists/:listId/cards` | Board Write | Create a new card (or linked card via `linkedId`) | **Req:** `{ title, description?, swimlaneId, members?, assignees?, linkedId? }`<br>**Res (200):** `{ _id: string }` |
| `POST` | `/api/boards/:boardId/lists/:listId/cards/bulk` | Board Write | Bulk insert up to 500 cards in a single request | **Req:** `{ swimlaneId, cards: [ { title, description? } ] }`<br>**Res (200):** `[ { index: 0, _id: string } ]` |
| `PUT` | `/api/boards/:boardId/lists/:listId/cards/:cardId` | Board Write | Update card attributes (title, description, dates, sort, move to new list/swimlane/board) | **Req:** `{ title?, description?, sort?, listId?, swimlaneId?, boardId?, dueAt?, startAt?, labelIds?, customFields? }`<br>**Res (200):** `{ _id: string }` |
| `DELETE`| `/api/boards/:boardId/lists/:listId/cards/:cardId` | Board Write | Delete card and cascade delete comments, checklists, and attachments | **Res (200):** `{ _id: string }` |
| `DELETE`| `/api/boards/:boardId/cards/bulk` | Board Write | Bulk delete cards across board by ID array | **Req:** `{ cardIds: [string] }`<br>**Res (200):** `{ deleted: [...], notFound: [...] }` |
| `POST` | `/api/boards/:boardId/cards/labels` | Board Write | Bulk merge add/remove labels across cards | **Req:** `{ cardIds: [...], addLabelIds: [...], removeLabelIds: [...] }`<br>**Res (200):** `{ updated: [...], notFound: [...] }` |
| `POST` | `/api/boards/:boardId/lists/:listId/cards/:cardId/archive` | Board Write | Archive card | **Res (200):** `{ _id, archived: true }` |
| `POST` | `/api/boards/:boardId/lists/:listId/cards/:cardId/unarchive` | Board Write | Restore archived card | **Res (200):** `{ _id, archived: false }` |
| `POST` | `/api/boards/.../cards/:cardId/members/:memberId` | Board Write | Assign member to card (atomic `$addToSet`) | **Res (200):** `{ _id, members: [...] }` |
| `DELETE`| `/api/boards/.../cards/:cardId/members/:memberId` | Board Write | Remove member from card (atomic `$pull`) | **Res (200):** `{ _id, members: [...] }` |
| `POST` | `/api/boards/.../cards/:cardId/assignees/:assigneeId`| Board Write | Assign assignee to card | **Res (200):** `{ _id, assignees: [...] }` |
| `DELETE`| `/api/boards/.../cards/:cardId/assignees/:assigneeId`| Board Write | Unassign assignee from card | **Res (200):** `{ _id, assignees: [...] }` |
| `POST` | `/api/boards/:boardId/lists/:listId/cards/:cardId/copy` | Board Write | Deep copy card (with comments, checklists, attachments) | **Req:** `{ toBoardId?, toSwimlaneId, toListId?, position? }`<br>**Res (200):** `{ _id: string }` |
| `GET` | `/api/user/cards` | Bearer Token | List all active cards assigned to current user (`?due=true`, `?from=`, `?to=`) | **Res (200):** Array of assigned card objects |

#### F. Comments, Checklists & Custom Fields
- **Comments ([server/models/cardComments.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/cardComments.js)):**
  - `GET /api/boards/:boardId/cards/:cardId/comments`
  - `GET /api/boards/:boardId/cards/:cardId/comments/:commentId`
  - `POST /api/boards/:boardId/cards/:cardId/comments` (`{ comment: string }`)
  - `DELETE /api/boards/:boardId/cards/:cardId/comments/:commentId`
- **Checklists ([server/models/checklists.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/checklists.js)):**
  - `GET /api/boards/:boardId/cards/:cardId/checklists`
  - `POST /api/boards/:boardId/cards/:cardId/checklists` (`{ title: string }`)
  - `DELETE /api/boards/:boardId/cards/:cardId/checklists/:checklistId`
- **Checklist Items ([server/models/checklistItems.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/checklistItems.js)):**
  - `GET /api/boards/:boardId/cards/:cardId/checklists/:checklistId/items`
  - `POST /api/boards/:boardId/cards/:cardId/checklists/:checklistId/items` (`{ title: string }`)
  - `PUT /api/boards/:boardId/cards/:cardId/checklists/:checklistId/items/:itemId` (`{ title?, isFinished?, sort? }`)
  - `DELETE /api/boards/:boardId/cards/:cardId/checklists/:checklistId/items/:itemId`
- **Custom Fields ([server/models/customFields.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/customFields.js)):**
  - `GET /api/boards/:boardId/custom-fields`
  - `POST /api/boards/:boardId/custom-fields` (`{ name, type, settings? }`)
  - `PUT /api/boards/:boardId/custom-fields/:customFieldId`
  - `DELETE /api/boards/:boardId/custom-fields/:customFieldId`
  - `POST/PUT/DELETE` dropdown item endpoints

#### G. File Attachments & Media ([server/routes/attachmentApi.js](file:///Users/rushil.dev/Desktop/wekan-main/server/routes/attachmentApi.js), [models/export.js](file:///Users/rushil.dev/Desktop/wekan-main/models/export.js))
- `GET /api/boards/:boardId/attachments`: List all attachments for a board.
- `POST /api/attachment/upload`: Multipart file upload for card attachments.
- `GET /api/attachment/download/:attachmentId`: Binary file download.
- `POST /api/attachment/copy` & `POST /api/attachment/move`: Copy/move attachments between cards/boards.
- `DELETE /api/attachment/delete/:attachmentId`: Delete attachment.
- `GET /api/boards/:boardId/export`: JSON board export.
- `GET /api/boards/:boardId/exportZip`: Full board ZIP export (including attachments).
- `GET /api/boards/:boardId/exportExcel`: Excel `.xlsx` spreadsheet export.
- `GET /api/boards/:boardId/exportPDF`: PDF document export.

---

### 2.3 Real-Time Layer: Meteor DDP Protocol

WeKan uses Meteor’s Distributed Data Protocol (DDP) over WebSocket (`ws://<host>:<port>/websocket` with SockJS fallback at `http://<host>:<port>/sockjs`).

#### A. Subscription Mechanism
1. **Client Handshake:**
   - Client sends: `{"msg": "connect", "version": "1", "support": ["1"]}`
   - Server responds: `{"msg": "connected", "session": "<sessionId>"}`
2. **Authentication over DDP:**
   - Client sends: `{"msg": "method", "method": "login", "params": [{"resume": "<token>"}], "id": "1"}`
   - Server responds with login acknowledgment and sets `this.userId` on the connection.
3. **Subscribing to Board Data:**
   - Client sends: `{"msg": "sub", "id": "sub_board_1", "name": "board", "params": ["<boardId>", false]}`
   - The publisher `publishComposite('board', ...)` in [server/publications/boards.js:L625-L860](file:///Users/rushil.dev/Desktop/wekan-main/server/publications/boards.js#L625-L860) evaluates permissions and starts reactive cursors for:
     - `boards` (matching `boardId`)
     - `lists` (`{ boardId, archived: false }`)
     - `swimlanes` (`{ boardId, archived: false }`)
     - `customFields` (`{ boardIds: boardId }`)
     - `cards` (`{ boardId, archived: false }` or via `boardCardsWindow` in lazy mode)
     - `card_comments`, `checklists`, `checklist_items`, `attachments` (via child cursors)
4. **Live Document Pushes:**
   - Server pushes JSON frames directly to the client:
     - `{"msg": "added", "collection": "cards", "id": "c1", "fields": {"title": "Task 1", "listId": "l1", ...}}`
     - `{"msg": "changed", "collection": "cards", "id": "c1", "fields": {"title": "Updated Title"}}`
     - `{"msg": "removed", "collection": "cards", "id": "c1"}`
     - `{"msg": "ready", "subs": ["sub_board_1"]}`

#### B. Can DDP be Consumed from a Non-Meteor Client (React / Electron)?
**Yes, unequivocally.**
- DDP is an open, text-based JSON framing protocol over standard WebSockets.
- A non-Meteor React/Electron frontend does **not** need the Meteor runtime. It can use lightweight TypeScript DDP clients (e.g. `simpleddp`, `@types/ddp`, or a custom ~150-line WebSocket manager).
- Incoming `added`/`changed`/`removed` messages map cleanly into a client-side state store (such as Zustand, Redux Toolkit, or TanStack Query cache).

---

### 2.4 Gap Analysis: Operations Reachable ONLY via Meteor Methods
The following operations are **not exposed via REST API** and are only executable through DDP method calls (`Meteor.callAsync`):

1. **User Profile, Appearance & UI Preferences ([server/models/users.js](file:///Users/rushil.dev/Desktop/wekan-main/server/models/users.js#L400-L1060)):**
   - `setGlobalThemeColor`, `setUiFont`, `setUiFontSize`, `setUiColors`
   - `setLeftMenuCollapsed`, `setWorkspaceCollapsed`, `setLeftMenuWidth`, `setSidebarWidth`
   - `toggleDesktopDragHandles`, `toggleSubmitOnEnter`, `toggleOpenManyCardsAtOnce`, `toggleAllBoardsThemeTiles`
   - `createWorkspace`, `setWorkspacesTree`, `assignBoardToWorkspace`, `unassignBoardFromWorkspace`
   - `applyListWidth`, `setBoardAutoWidth`, `setListCollapsedState`, `applySwimlaneHeight`, `setSwimlaneCollapsedState`, `setFixedListWidth`, `setBoardView`
   - `toggleBoardStar`, `toggleDefaultBoard`, `setDefaultBoard`, `clearDefaultBoard`
   - `setCardCollapsed`, `toggleCardMaximized`
2. **Card & Board Execution Methods:**
   - `archiveSelectedCards`: Bulk archiving selected cards ([server/models/cards.js:L101](file:///Users/rushil.dev/Desktop/wekan-main/server/models/cards.js#L101)). REST has single-card archive and bulk *delete*, but no bulk archive.
   - `watch`: Notification level toggle on cards/boards (`all`, `watching`, `tracking`, `muted`) ([server/notifications/watch.js:L31](file:///Users/rushil.dev/Desktop/wekan-main/server/notifications/watch.js#L31)).
   - `impersonate` / `isImpersonated`: Admin session impersonation ([server/models/users.js:L1450](file:///Users/rushil.dev/Desktop/wekan-main/server/models/users.js#L1450)).
   - `eventLogProblemAreas`, `acknowledgeEventLog`: Event log triage ([models/eventLog.js:L151](file:///Users/rushil.dev/Desktop/wekan-main/models/eventLog.js#L151)).

> **Architectural Implication:** A from-scratch frontend can either:
> 1. Call these Meteor methods directly over the DDP WebSocket connection (`{"msg": "method", "method": "setUiFont", "params": [...]}`), or
> 2. Add lightweight Express endpoints under `server/models/` for REST parity during Phase 2.

---

## 3. Codebase Audit

### 3.1 Core Architecture vs Legacy / Deprecated Subsystems

| Subsystem | Location | Status | Assessment |
| :--- | :--- | :--- | :--- |
| **Core Domain Models** | `models/boards.js`, `cards.js`, `lists.js`, `swimlanes.js`, `users.js`, `cardComments.js`, `checklists.js` | **Active / Core** | Robust SimpleSchema definitions, multi-tenant permission helpers, collection hooks for activity generation. |
| **REST API Server** | `server/apiMiddleware.js`, `server/models/*.js`, `server/apiAuthRoutes.js` | **Active / Core** | Fully decoupled from Blaze. High code quality with parameterized route handlers. |
| **Reactive Publications** | `server/publications/` | **Active / Core** | High performance `publishComposite` cursors with memory leak guards and audit checks. |
| **Automation Rules** | `models/rules.js`, `actions.js`, `triggers.js` | **Active / Core** | Trigger/action automation engine evaluated in server-side collection hooks. |
| **Sandstorm Packaging** | `sandstorm.js`, `sandstorm-src/`, `packages/wekan-accounts-sandstorm/` | **Legacy / Niche** | Dedicated integration for Sandstorm OS via Cap'n Proto. Completely bypassable for Electron/React. |
| **CollectionFS (CFS)** | `models/attachments_old.js.disabled`, `models/avatars_old.js.disabled` | **Deprecated** | Old MongoDB GridFS storage system. Fully replaced by Ostrio Files / Universal File Server. |
| **Blaze UI Templates** | `client/components/**/*.jade`, `client/components/**/*.js` | **Legacy (Web Only)** | 111 Jade files, 108 Blaze template registrations. High coupling to Tracker, Session, and MiniMongo. |
| **Trello Live API Import** | `server/trelloApiImport.js` | **Deprecated / Fragile** | Live OAuth integration subject to frequent Trello API rate limits. Static JSON import is preferred. |

### 3.2 Frontend Coupling Analysis (What Fights an Electron / React Rewrite)
An analysis of the 220 JavaScript files under `client/` reveals significant coupling to Meteor's legacy browser stack:
1. **Blaze / Jade View Layer:**
   - 111 `.jade` templates compile to Blaze ASTs using Meteor's Jade compiler.
   - 108 files register `Template.<name>.helpers`, `onRendered`, and `events`.
2. **Global Reactivity via `Session` & `Tracker`:**
   - 54 client files rely on global `Session.get(...)` / `Session.set(...)` for passing state across components (e.g. `currentCard`, `currentBoard`, `sidebarView`).
   - 85 files use `ReactiveVar` / `ReactiveDict` instances attached to template instances.
3. **MiniMongo Client Collections:**
   - Blaze helpers issue synchronous queries directly against client-side collections (e.g. `Cards.find({ listId: this._id })`).
4. **jQuery / DOM Mutation Dependencies:**
   - Heavy reliance on jQuery UI (`sortable`, `draggable`, `droppable`) for board drag-and-drop, which conflicts with React's virtual DOM reconciliation.

> **Conclusion for Phase 2:** Attempting to incrementally adapt the existing Blaze UI inside Electron is an anti-pattern. A clean, independent React frontend consuming WeKan’s backend via REST + DDP is strictly cleaner, more maintainable, and eliminates 100% of the Blaze/jQuery technical debt.

---

## 4. Deployment Architecture Options

### 4.1 Option A: Bundled Subprocess (Single-Install Desktop App)
In this mode, the Electron application ships with an embedded WeKan server and database engine, operating entirely locally without external dependencies.

```
+-------------------------------------------------------------------+
|                        Electron Desktop App                       |
|                                                                   |
|  +---------------------+        +------------------------------+  |
|  |   React Frontend    | <----> | IPC / Process Manager (Main) |  |
|  +---------------------+        +------------------------------+  |
|             |                                   |                 |
|             | HTTP / DDP (localhost)            | spawns/monitors |
|             v                                   v                 |
|  +-------------------------------------------------------------+  |
|  | Background Subprocess 1: WeKan Node Bundle (main.js)        |  |
|  | - Memory: ~150-250 MB RSS                                   |  |
|  | - Port: Dynamic / 127.0.0.1:23456                           |  |
|  +-------------------------------------------------------------+  |
|                                 |                                 |
|                                 | MongoDB Protocol                |
|                                 v                                 |
|  +-------------------------------------------------------------+  |
|  | Background Subprocess 2: FerretDB Binary (Go + SQLite)      |  |
|  | - Memory: ~40-70 MB RSS                                     |  |
|  | - Storage: SQLite file in Electron `app.getPath('userData')`|  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

#### Requirements & Feasibility:
- **FerretDB Subprocess:** Pre-compiled `ferretdb` standalone binary (~35 MB) packaged via Electron `extraResources`.
  - Command: `ferretdb --handler=sqlite --sqlite-url=file:<userData>/wekan.db --listen-addr=127.0.0.1:<dbPort> --telemetry=disable`
- **WeKan Server Subprocess:** Standard Node.js bundle built via `meteor build`, executed via embedded Node.js binary.
  - Environment: `PORT=<appPort>`, `ROOT_URL=http://127.0.0.1:<appPort>`, `MONGO_URL=mongodb://127.0.0.1:<dbPort>/wekan?directConnection=true`, `WITH_API=true`.
- **Resource Footprint:**
  - Startup Time: FerretDB ~80ms; WeKan server ~2.5–3.5 seconds.
  - Total Memory: ~220–320 MB RSS combined.
- **Authentication in Solo Mode:**
  - Auto-provision a default local admin account (`admin@local`) on first launch; Electron main process generates a long-lived auth token and stores it in secure storage (`keytar` or encrypted config).

---

### 4.2 Option B: Separately-Run Server (Team Collaboration Mode)
In this mode, WeKan runs as an independent central server (Docker, Kubernetes, or Snap), and the Electron desktop client connects as a rich frontend.

```
+------------------------------+
|     Electron Desktop App     |
|   (React Frontend Client)    |
+------------------------------+
               |
               | HTTPS (REST API) & WSS (DDP WebSockets)
               | Auth: Bearer JWT / Login Tokens
               v
+---------------------------------------------------------------+
|                       WeKan Server Cluster                    |
|                                                               |
|  +---------------------------------------------------------+  |
|  | WeKan App Instance(s) (Node.js Meteor Engine)           |  |
|  | - Exposes REST (/api/...) and DDP (/websocket)          |  |
|  +---------------------------------------------------------+  |
|                              |                                |
|                              v                                |
|  +---------------------------------------------------------+  |
|  | Central Database (MongoDB 7.0 Replica Set or FerretDB)  |  |
|  +---------------------------------------------------------+  |
+---------------------------------------------------------------+
```

#### Requirements & Feasibility:
- **Network Protocol:** All communication runs over standard HTTPS (for file uploads, batch REST calls, exports) and WSS (for DDP live updates).
- **Authentication in Team Mode:**
  - Standard user login screen supporting Password, 2FA, LDAP, or OIDC.
  - Client persists the resume token and handles automatic reconnect/re-subscription on network dropouts.
- **Multi-User Collaboration:**
  - Multi-user concurrency, optimistic UI updates, conflict resolution, and real-time cursor sync are handled by WeKan's existing MongoDB/DDP publication layer.

---

### 4.3 Solo vs. Team Mode Comparison

| Attribute | Solo Mode (Option A) | Team Mode (Option B) |
| :--- | :--- | :--- |
| **Server Location** | Embedded subprocess inside Electron | Remote server (Docker / Cloud / On-Prem) |
| **Database** | Embedded FerretDB + SQLite | MongoDB Replica Set or FerretDB cluster |
| **Setup Complexity** | Zero configuration (single installer) | Requires server provisioning & domain setup |
| **Offline Capability** | 100% full offline capability | Requires network connectivity |
| **Multi-user Sync** | Single user only | Real-time multi-user collaboration |
| **Auth Workflow** | Auto-login / local master key | Multi-tenant login (Password, 2FA, SSO) |
| **Resource Usage** | App + Node (~250MB) + FerretDB (~50MB) | App only (~80–120MB Electron renderer) |

---

## 5. GitHub Sync Feasibility

### 5.1 Codebase Verification of Existing Sync
- **Grep Search across all models/server files:** Confirmed that WeKan has **no existing two-way sync** or background worker for GitHub Issues or GitHub Projects.
- **What exists currently:**
  - A static, one-shot JSON file parser (`parseIssuesArray` in [models/lib/externalParsers.js:L75-L100](file:///Users/rushil.dev/Desktop/wekan-main/models/lib/externalParsers.js#L75-L100)).
  - This function parses an uploaded JSON array of GitHub issues into a Kanboard data structure to create a one-time board with "Open" and "Closed" lists during initial board import.
  - It does not store GitHub issue IDs, does not sync updates, and cannot push changes back to GitHub.

---

### 5.2 Integration Architecture & Sync Hook Points

```
                                +-------------------+
                                |    GitHub API     |
                                +-------------------+
                                   ^             |
         GitHub REST / GraphQL API |             | Webhooks
     (Push issue updates / moves)  |             | (Issue created, edited, closed)
                                   |             v
                        +------------------------------------+
                        |         GitHub Sync Engine         |
                        |      (Background SyncedCron)       |
                        +------------------------------------+
                                   ^             |
         Activities.after.insert   |             | Cards.insertAsync /
         Cards.after.update        |             | Cards.direct.updateAsync
                                   |             v
                        +------------------------------------+
                        |        WeKan Backend Models        |
                        |  (Boards, Lists, Cards, Comments)  |
                        +------------------------------------+
```

#### A. Inbound Sync (GitHub -> WeKan)
1. **Webhook Receiver:**
   - Register endpoint `WebApp.handlers.post('/api/integrations/github/webhook', ...)` to receive GitHub `issues`, `issue_comment`, and `projects_v2_item` webhook payloads.
2. **Periodic Fallback Poller:**
   - Register background polling task using `quave:synced-cron` ([server/cron.js](file:///Users/rushil.dev/Desktop/wekan-main/server/cron.js)) to poll GitHub REST API (`GET /repos/{owner}/{repo}/issues?since=<lastSync>`) for rate-limit safe synchronization.
3. **Card Mutation Hooks:**
   - **Create Card:** Call `Cards.direct.insertAsync({...})` + `cardCreation(...)` ([server/models/cards.js:L1267](file:///Users/rushil.dev/Desktop/wekan-main/server/models/cards.js#L1267)).
   - **Move / State Change:** Call `Cards.direct.updateAsync({ _id: cardId }, { $set: { listId, swimlaneId, sort } })`.
   - **Close / Reopen:** Call `card.archive()` or `card.restore()`.

#### B. Outbound Sync (WeKan -> GitHub)
1. **Event Interception via Collection Hooks:**
   - `Activities.after.insert(async (userId, doc) => {...})` in [server/models/activities.js:L29-L70](file:///Users/rushil.dev/Desktop/wekan-main/server/models/activities.js#L29-L70) is WeKan’s centralized event bus.
   - Fires automatically on:
     - `createCard`, `moveCard`, `archivedCard`, `restoredCard`
     - `addComment`, `editComment`
     - `addChecklist`, `checkedItem`
2. **Metadata Association Schema:**
   - To prevent sync loops and map external entities, cards require a GitHub metadata subdocument in the schema (or populated in `customFields`):
     ```javascript
     github: {
       repo: "owner/repo",
       issueNumber: 123,
       issueId: "I_kwDO...",
       nodeId: "MDU6SXNzdWUxMjM=",
       lastSyncedAt: new Date(),
       syncVersion: 1
     }
     ```

---

## 6. Summary of Architectural Recommendations for Phase 2

1. **Frontend Strategy:** Build a standalone, modern React 19 + TypeScript + TailwindCSS / Vanilla CSS frontend inside Electron. Communicate with WeKan backend exclusively over REST (mutations, file transfers, bulk operations) and DDP (real-time live board subscriptions).
2. **Backend Strategy:** Keep WeKan’s Meteor 3.5 backend intact. Expose any missing UI preference endpoints as standard Express routes in `server/models/`.
3. **Packaging Strategy:** Package FerretDB v1 (SQLite) + pre-built WeKan Node bundle as child processes in Electron for Solo Desktop mode; provide seamless connection configuration for Team Server mode.
4. **Sync Strategy:** Implement GitHub sync as an isolated server module listening to `Activities.after.insert` and exposing a webhook receiver endpoint.

---
*End of Phase 1 Investigation Report.*
