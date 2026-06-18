# Design Document

## Overview

The To-Do Life Dashboard is a single-page application (SPA) built with pure HTML, CSS, and Vanilla JavaScript. All data is persisted to `localStorage`. There is no build step, no framework, and no backend — the project ships as three files: `index.html`, `css/style.css`, and `js/app.js`.

---

## File Structure

```
/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

---

## Architecture

### Module Organization (`js/app.js`)

The JavaScript is organized into self-contained module objects, each responsible for a single feature area. A top-level `App` object bootstraps everything on `DOMContentLoaded`.

```
StorageService       — all localStorage reads/writes with error handling
GreetingWidget       — time/date display, name input, greeting logic
FocusTimer           — countdown timer, duration config, state machine
TaskManager          — task CRUD, deduplication, sorting
LinkLauncher         — quick-link CRUD, rendering
ThemeManager         — light/dark toggle, persistence
App                  — wires all modules together on init
```

No module reaches into another module's internal state directly. Communication is done by calling public methods or by reading/writing through `StorageService`.

### Storage Keys

| Key | Type | Description |
|---|---|---|
| `tld_userName` | `string` | User's display name |
| `tld_theme` | `"light"` \| `"dark"` | Active theme |
| `tld_pomodoroDuration` | `number` | Timer duration in minutes |
| `tld_sortOrder` | `"default"` \| `"alpha"` \| `"completedLast"` | Task sort preference |
| `tld_tasks` | `Task[]` (JSON) | All tasks |
| `tld_links` | `QuickLink[]` (JSON) | All quick links |

### Data Shapes

```js
// Task
{
  id: string,           // crypto.randomUUID() or Date.now() fallback
  description: string,  // trimmed, max 255 chars
  completed: boolean,
  createdAt: number     // Unix timestamp, used for insertion-order sort
}

// QuickLink
{
  id: string,
  label: string,        // trimmed, max 50 chars
  url: string           // validated http(s) URL, max 2048 chars
}
```

---

## Component Design

### 1. StorageService

Thin wrapper around `localStorage`. Every method catches exceptions and calls a shared `onError(message)` callback so the rest of the app never crashes on storage failures.

**Public API:**
```js
StorageService.get(key)              // → value | null
StorageService.set(key, value)       // → boolean (success)
StorageService.remove(key)           // → boolean
StorageService.onError(fn)           // register global error handler
```

All values are JSON-serialized on write and JSON-parsed on read.

---

### 2. GreetingWidget

**DOM Elements:**
- `#clock` — live HH:MM:SS clock
- `#date` — formatted date string
- `#greeting-text` — greeting phrase + name
- `#name-input` — text input, maxlength 50
- `#name-save-btn` — save trigger
- `#greeting-error` — validation/storage error display

**Logic:**
- `setInterval` at 1 000 ms drives clock and date updates.
- Greeting phrase is derived from `new Date().getHours()` at each tick using the ranges defined in Requirements 1.3–1.6.
- On save: trim input → validate (empty → generic greeting, no save) → persist via StorageService → update display.
- On load: read saved name → populate input → render greeting immediately.

**Hour → Greeting mapping:**

| Hour range | Greeting |
|---|---|
| 5–11 | Good Morning |
| 12–17 | Good Afternoon |
| 18–21 | Good Evening |
| 22–23, 0–4 | Good Night |

---

### 3. FocusTimer

**State Machine:**

```
IDLE ──[Start]──► RUNNING ──[Stop]──► PAUSED
 ▲                   │                   │
 │                   │ (reach 00:00)      │
 └──[Reset]──────────┘       │           │
 └──────────────────[Reset]──┘───────────┘
```

**States and control availability:**

| State | Start | Stop | Reset |
|---|---|---|---|
| IDLE | enabled | disabled | disabled |
| RUNNING | disabled | enabled | disabled |
| PAUSED | enabled | disabled | enabled |

**DOM Elements:**
- `#timer-display` — MM:SS countdown
- `#timer-start`, `#timer-stop`, `#timer-reset` — controls
- `#timer-duration-input` — number input, 1–120
- `#timer-duration-save` — applies new duration
- `#timer-complete-msg` — shown when countdown hits 00:00
- `#timer-error` — validation errors

**Logic:**
- `setInterval` at 1 000 ms decrements remaining seconds.
- Duration change mid-session is queued: it writes to storage and updates the display label but does not affect the running countdown. The new duration is applied on the next Reset.
- On completion: clear interval → show `#timer-complete-msg` → transition to IDLE state.

---

### 4. TaskManager

**DOM Elements:**
- `#task-input` — text input, maxlength 255
- `#task-add-btn` — submission trigger
- `#task-sort-select` — `<select>` with options: default, alpha, completedLast
- `#task-list` — `<ul>` container
- `#task-error` — validation/storage error display

**Task item template (rendered as `<li>`):**
```
[checkbox] [description text]  [edit btn] [delete btn]
           ← strikethrough when completed →
```

**Edit flow:**
1. Edit button click → replace `<span>` with `<input>` pre-filled with current text + Confirm/Cancel buttons.
2. Confirm: trim → empty check → duplicate check (excluding self) → update task → persist → re-render item.
3. Cancel: discard, restore read-only view.

**Duplicate check:**  
Case-insensitive `toLowerCase()` comparison against all existing task descriptions.

**Sort logic (in-memory only, does not mutate stored order):**

| Sort_Order | Behavior |
|---|---|
| `default` | `createdAt` ascending |
| `alpha` | `description.toLowerCase()` lexicographic ascending |
| `completedLast` | incomplete first (by `createdAt`), then complete (by `createdAt`) |

---

### 5. LinkLauncher

**DOM Elements:**
- `#link-label-input` — text input, maxlength 50
- `#link-url-input` — text input, maxlength 2048
- `#link-add-btn` — submission trigger
- `#link-list` — container for quick-link buttons
- `#link-error` — validation/storage error display
- `#link-empty-msg` — shown when list is empty

**Quick-link item template:**
```
[🔗 Label]  [✕ delete btn]
```
Clicking the label area opens `url` via `window.open(url, '_blank')`.

**URL Validation:**
```js
/^https?:\/\/.+/.test(url.trim())
```

**Limit enforcement:** If the list already contains 20 items, submission is rejected with a validation message before any storage write.

---

### 6. ThemeManager

**DOM Elements:**
- `#theme-toggle` — button, always visible (fixed position)

**Logic:**
- Applies theme by toggling a `data-theme="dark"` attribute on `<html>`.
- All theme-aware colors are CSS custom properties scoped to `:root` (light) and `[data-theme="dark"]` (dark).
- On load: read saved theme → apply → set toggle label/icon accordingly.
- Default theme when nothing is saved: `light`.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [🌙 / ☀ Theme Toggle]                               (fixed)   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GREETING WIDGET                                          │  │
│  │  HH:MM:SS     Weekday, Month DD, YYYY                    │  │
│  │  Good Morning, Rayhan!                                   │  │
│  │  [Name input________________________] [Save]             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────┐  ┌───────────────────────────────┐ │
│  │  FOCUS TIMER           │  │  QUICK LINKS                  │ │
│  │                        │  │  [Label input] [URL input]    │ │
│  │       25:00            │  │  [Add Link]                   │ │
│  │                        │  │                               │ │
│  │  [Start] [Stop] [Reset]│  │  [🔗 GitHub ✕]               │ │
│  │  Duration: [__] min    │  │  [🔗 Notion  ✕]              │ │
│  │           [Save]       │  │  ...                          │ │
│  └────────────────────────┘  └───────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TASK MANAGER                                             │  │
│  │  [Task description input_____________________] [Add]     │  │
│  │  Sort: [Default ▾]                                       │  │
│  │                                                          │  │
│  │  ☐ Buy groceries                          [Edit][Delete] │  │
│  │  ☑ ~~Read design doc~~                    [Edit][Delete] │  │
│  │  ...                                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

The layout uses CSS Grid. On wider screens, the timer and link launcher sit side-by-side. On narrow screens (< 640 px) they stack vertically.

---

## CSS Design

### Custom Properties

```css
:root {
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-error: #dc2626;
  --color-success: #16a34a;
  --color-completed-text: #9ca3af;
  --radius: 0.5rem;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --color-bg: #111827;
  --color-surface: #1f2937;
  --color-primary: #6366f1;
  --color-primary-hover: #818cf8;
  --color-text: #f9fafb;
  --color-text-muted: #9ca3af;
  --color-border: #374151;
  --color-error: #f87171;
  --color-success: #4ade80;
  --color-completed-text: #6b7280;
}
```

### Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| < 640 px | Single column stack |
| ≥ 640 px | Timer + Link Launcher side-by-side (50/50) |
| ≥ 1024 px | Max-width container centered |

---

## Error Handling Strategy

All error messages are displayed inline in a dedicated `#*-error` element adjacent to the widget that caused the error. They use the `--color-error` token and an `role="alert"` attribute for accessibility. Messages are cleared when the user makes a new valid interaction on the same widget.

StorageService errors surface through the registered `onError` callback, which renders a persistent banner at the top of the page (Requirement 13.5).

---

## Initialization Sequence (`App.init`)

```
1. StorageService.onError → register global error banner handler
2. ThemeManager.init      → apply saved theme before any paint
3. GreetingWidget.init    → start clock, load name, render greeting
4. FocusTimer.init        → load saved duration, set IDLE state
5. TaskManager.init       → load tasks, apply saved sort, render list
6. LinkLauncher.init      → load links, render buttons
```

All init calls read from `localStorage` synchronously before rendering, satisfying Requirement 13.4.
