# Implementation Plan: To-Do Life Dashboard

## Overview

Build a single-page personal productivity dashboard using pure HTML, CSS, and Vanilla JavaScript. The app ships as three files (`index.html`, `css/style.css`, `js/app.js`) with no build step or framework. All data is persisted to `localStorage` through a shared `StorageService`. Modules are implemented sequentially, wired together by an `App` initializer.

## Tasks

- [x] 1. Scaffold project structure and base HTML
  - Create `index.html` with full semantic structure: `<html>`, `<head>`, `<body>`
  - Add a `data-theme` attribute placeholder on `<html>` (default omitted, applied by JS)
  - Include all required DOM element IDs for every widget:
    - `#clock`, `#date`, `#greeting-text`, `#name-input`, `#name-save-btn`, `#greeting-error`
    - `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-duration-input`, `#timer-duration-save`, `#timer-complete-msg`, `#timer-error`
    - `#task-input`, `#task-add-btn`, `#task-sort-select`, `#task-list`, `#task-error`
    - `#link-label-input`, `#link-url-input`, `#link-add-btn`, `#link-list`, `#link-error`, `#link-empty-msg`
    - `#theme-toggle`, `#storage-error-banner`
  - Add `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer></script>`
  - Create empty `css/style.css` and `js/app.js` placeholder files
  - _Requirements: 14.1, 14.2_

- [x] 2. Implement CSS — layout, custom properties, and theming
  - [x] 2.1 Define CSS custom properties for light and dark themes
    - Write `:root` block with all `--color-*` tokens: `--color-bg`, `--color-surface`, `--color-primary`, `--color-primary-hover`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-error`, `--color-success`, `--color-completed-text`, `--radius`, `--shadow`
    - Write `[data-theme="dark"]` override block with dark-mode values
    - _Requirements: 12.3, 14.1_

  - [x] 2.2 Implement base layout and responsive grid
    - Style `body` background using `--color-bg`, font, and margin
    - Create CSS Grid layout for widget sections: greeting spanning full width; timer and link launcher side-by-side at `≥ 640 px`; task manager spanning full width
    - Add `@media (max-width: 639px)` rule to stack timer and link launcher vertically
    - Add `max-width` container centering for `≥ 1024 px`
    - _Requirements: 14.1, 14.3_

  - [x] 2.3 Style individual widget panels and interactive controls
    - Style card/panel surfaces using `--color-surface`, `--radius`, `--shadow`
    - Style buttons (primary, icon), inputs, select, checkboxes
    - Style `#theme-toggle` as a fixed-position element always visible
    - Add `strikethrough` style class for completed tasks using `text-decoration: line-through` and `--color-completed-text`
    - Style `role="alert"` error elements with `--color-error`
    - Style `#storage-error-banner` as a persistent top-of-page banner
    - _Requirements: 8.4, 12.1, 13.5, 14.1_

- [x] 3. Implement `StorageService` in `js/app.js`
  - [x] 3.1 Write `StorageService` object with `get`, `set`, `remove`, and `onError` methods
    - `get(key)`: JSON-parse the stored string; return `null` on missing key or parse error
    - `set(key, value)`: JSON-stringify then write to `localStorage`; catch and forward exceptions to the registered error handler; return `true`/`false`
    - `remove(key)`: call `localStorage.removeItem`; catch exceptions; return `true`/`false`
    - `onError(fn)`: register a single global error callback that all methods call on exception
    - _Requirements: 13.1, 13.2, 13.5_

  - [ ]* 3.2 Write unit tests for `StorageService`
    - Test `get` returns `null` for missing keys and correctly parses JSON
    - Test `set` serializes objects and arrays correctly
    - Test `onError` callback is invoked when `localStorage` throws
    - _Requirements: 13.1, 13.5_

- [x] 4. Implement `ThemeManager` in `js/app.js`
  - [x] 4.1 Write `ThemeManager` object with `init` and `toggle` methods
    - `init`: call `StorageService.get('tld_theme')`; if result is `"dark"` apply `document.documentElement.setAttribute('data-theme', 'dark')` else remove the attribute; set toggle button label/icon accordingly
    - `toggle`: flip the current theme attribute on `<html>`; call `StorageService.set('tld_theme', newTheme)`; update toggle label
    - Bind `#theme-toggle` click event in `init`
    - Default to `"light"` when saved value is missing, `null`, or unrecognized
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 4.2 Write unit tests for `ThemeManager`
    - Test `init` applies dark theme when storage returns `"dark"`
    - Test `init` defaults to light when storage returns `null` or invalid string
    - Test `toggle` switches from light→dark and dark→light and calls `StorageService.set`
    - _Requirements: 12.2, 12.4, 12.5_

- [x] 5. Implement `GreetingWidget` in `js/app.js`
  - [x] 5.1 Write clock, date, and greeting-phrase logic
    - Implement a `formatTime(date)` helper returning HH:MM:SS from a `Date` object (zero-padded, 24-hour)
    - Implement a `formatDate(date)` helper returning "Weekday, Month DD, YYYY" using `toLocaleDateString`
    - Implement `getGreeting(hour)` mapping: 5–11 → "Good Morning", 12–17 → "Good Afternoon", 18–21 → "Good Evening", 22–23 / 0–4 → "Good Night"
    - Use `setInterval` at 1 000 ms to update `#clock`, `#date`, and `#greeting-text` every second
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Write name save and load logic
    - `init`: call `StorageService.get('tld_userName')`; if truthy, populate `#name-input` and append name to greeting string; start the 1-second interval
    - Name save handler: trim `#name-input` value; if empty/whitespace-only, display generic greeting without saving; else persist via `StorageService.set('tld_userName', trimmedName)`; update `#greeting-text`; show error in `#greeting-error` on storage failure per Requirement 2.7
    - Bind `#name-save-btn` click event in `init`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 5.3 Write unit tests for `GreetingWidget` helpers
    - Test `getGreeting` for all four hour ranges including boundary values (5, 11, 12, 17, 18, 21, 22, 0, 4)
    - Test `formatTime` zero-pads single-digit hours, minutes, seconds
    - Test name-save handler trims whitespace and handles empty input
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.2, 2.3_

- [x] 6. Implement `FocusTimer` in `js/app.js`
  - [x] 6.1 Write timer state machine and countdown logic
    - Define states: `IDLE`, `RUNNING`, `PAUSED`
    - `init`: load `tld_pomodoroDuration` from storage (default 25); set `remainingSeconds = duration * 60`; update `#timer-display`; apply IDLE control states (Start enabled, Stop disabled, Reset disabled)
    - `start`: set state to RUNNING; start `setInterval` at 1 000 ms decrementing `remainingSeconds`; update display each tick; on reaching 0: clear interval → show `#timer-complete-msg` → set state to IDLE with Start enabled / Stop disabled
    - `stop`: clear interval; set state to PAUSED; enable Start and Reset; disable Stop
    - `reset`: clear interval; reload `remainingSeconds` from stored duration; update display; set state to IDLE
    - Bind `#timer-start`, `#timer-stop`, `#timer-reset` click events in `init`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 6.2 Write duration configuration logic
    - Duration save handler: read `#timer-duration-input` value; validate integer in 1–120 range; on invalid: show error in `#timer-error` and retain previous value; on valid: call `StorageService.set('tld_pomodoroDuration', value)`; update display label but do NOT reset a running timer (new duration applies on next Reset)
    - Bind `#timer-duration-save` click event in `init`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 6.3 Write unit tests for `FocusTimer`
    - Test initial state is IDLE with correct button enable/disable states
    - Test that `start` transitions to RUNNING and disables Start/Reset
    - Test that `stop` transitions to PAUSED and enables Start/Reset
    - Test that `reset` restores `remainingSeconds` from stored duration
    - Test duration validation rejects values outside 1–120 and non-integers
    - Test completion: reaching 00:00 shows completion message and returns to IDLE
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.3, 4.7_

- [x] 7. Implement `TaskManager` in `js/app.js`
  - [x] 7.1 Write task data helpers and storage operations
    - Implement `generateId()`: return `crypto.randomUUID()` if available, else `String(Date.now())`
    - Implement `loadTasks()`: `StorageService.get('tld_tasks')` → parse array or return `[]`
    - Implement `saveTasks(tasks)`: `StorageService.set('tld_tasks', tasks)`; on failure show error in `#task-error`
    - Implement sort helper `sortTasks(tasks, order)` supporting `"default"` (by `createdAt` asc), `"alpha"` (case-insensitive label asc), `"completedLast"` (incomplete by `createdAt` first, then complete by `createdAt`)
    - _Requirements: 5.4, 5.5, 9.1, 9.2, 13.1_

  - [x] 7.2 Write task rendering logic
    - Implement `renderTask(task)` that creates a `<li>` containing: checkbox (bound to toggle handler), description `<span>` with strikethrough class when `task.completed`, Edit button, Delete button
    - Implement `renderTaskList()`: call `loadTasks()`, apply current `sortOrder`, clear `#task-list`, append rendered `<li>` for each task
    - _Requirements: 8.1, 8.4, 9.2_

  - [x] 7.3 Write add-task handler with validation and duplicate check
    - Read and trim `#task-input` value
    - If empty/whitespace: show validation message in `#task-error`; return (Requirement 5.6)
    - Case-insensitive duplicate check against all existing tasks: if match found, show duplicate warning in `#task-error`, retain input value; return (Requirement 6.1, 6.2)
    - Create new `Task` object (`id`, `description`, `completed: false`, `createdAt: Date.now()`)
    - Push to tasks array; call `saveTasks`; re-render; clear input
    - Bind `#task-add-btn` click event in `init`
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 6.4_

  - [x] 7.4 Write edit-task handler
    - On Edit button click: replace description `<span>` with `<input>` pre-filled with current description (maxlength 500) and show Confirm/Cancel buttons
    - Confirm: trim input value; if empty show validation error and keep editable state; perform duplicate check excluding self (Requirement 7.3 edit duplicate check is implied by Req 6 scope — edit does case-insensitive check against other tasks); update task; call `saveTasks`; re-render item in read-only state; on storage failure revert and show `#task-error`
    - Cancel: restore read-only `<span>` with original description
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.5 Write complete-toggle and delete handlers
    - Complete toggle: flip `task.completed`; call `saveTasks`; on storage failure revert toggle and show `#task-error`; re-render item strikethrough styling
    - Delete: remove task from array; call `saveTasks`; re-render list; on storage failure restore task and show `#task-error`
    - _Requirements: 8.2, 8.3, 8.5, 8.6, 8.7_

  - [x] 7.6 Write sort-order handler and persistence
    - Bind `#task-sort-select` change event: update `currentSortOrder`; call `StorageService.set('tld_sortOrder', order)`; call `renderTaskList()`; on storage failure show `#task-error` and fall back to `"default"`
    - In `init`: load `tld_sortOrder` from storage; validate against allowed values (`"default"`, `"alpha"`, `"completedLast"`); if invalid or missing default to `"default"`; set `#task-sort-select` value; call `renderTaskList()`
    - _Requirements: 9.1, 9.3, 9.4, 9.5_

  - [ ]* 7.7 Write unit tests for `TaskManager`
    - Test `sortTasks` for all three sort orders including ties and boundary cases
    - Test add handler rejects empty input and whitespace-only input
    - Test add handler rejects case-insensitive duplicates and retains input value
    - Test edit handler rejects empty description and keeps editable state
    - Test complete toggle updates `completed` flag and persists
    - Test delete removes correct task and persists updated list
    - _Requirements: 5.2, 5.6, 6.1, 6.2, 7.3, 7.4, 8.2, 8.6, 9.1, 9.2_

- [x] 8. Checkpoint — Core widgets functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement `LinkLauncher` in `js/app.js`
  - [x] 9.1 Write link data helpers, rendering, and add handler
    - Implement `loadLinks()`: `StorageService.get('tld_links')` → parse array or return `[]`
    - Implement `saveLinks(links)`: `StorageService.set('tld_links', links)`; on failure show `#link-error`
    - Implement `renderLinks()`: if array is empty show `#link-empty-msg`; else hide it and render one button per link with label, `window.open(url, '_blank')` on click, and a Delete (`✕`) button
    - Add handler: trim label and URL; validate label non-empty; validate URL matches `/^https?:\/\/.+/`; if list already has 20 items reject with validation message; create `QuickLink` (`id`, `label`, `url`); push; call `saveLinks`; call `renderLinks`; clear inputs
    - Bind `#link-add-btn` click event in `init`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 9.2 Write delete-link handler
    - On Delete button click: remove link from array; call `saveLinks`; call `renderLinks`; on storage failure restore link and show `#link-error`; if list becomes empty show `#link-empty-msg`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 9.3 Write unit tests for `LinkLauncher`
    - Test add handler validates empty label rejection
    - Test add handler validates URL pattern (rejects `ftp://`, bare text; accepts `http://` and `https://`)
    - Test add handler enforces 20-item limit and rejects 21st item
    - Test delete handler removes correct link and calls `saveLinks`
    - Test `renderLinks` shows empty-state message when list is empty
    - _Requirements: 10.2, 10.4, 10.6, 11.2, 11.4_

- [x] 10. Implement `App` initializer and wire all modules in `js/app.js`
  - [x] 10.1 Write `App.init` with correct initialization sequence
    - Register `StorageService.onError` callback: render a persistent `#storage-error-banner` with the error message (Requirement 13.5)
    - Call `ThemeManager.init()` first (before any paint)
    - Call `GreetingWidget.init()`
    - Call `FocusTimer.init()`
    - Call `TaskManager.init()`
    - Call `LinkLauncher.init()`
    - Wrap entire sequence in `document.addEventListener('DOMContentLoaded', App.init)`
    - _Requirements: 13.3, 13.4, 13.5_

  - [ ]* 10.2 Write integration tests for App initialization sequence
    - Test `ThemeManager.init` is called before other inits (verify DOM attribute set before widgets render)
    - Test all data is read from storage before first render
    - Test `StorageService.onError` callback renders the persistent banner
    - _Requirements: 13.4, 13.5_

- [x] 11. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design has no Correctness Properties section, so property-based tests are not applicable; unit and integration tests cover all validation logic
- All storage reads happen synchronously in `init` methods before rendering, satisfying Requirement 13.4
- `crypto.randomUUID()` is available in all target browsers (Chrome, Firefox, Edge, Safari latest stable); the `Date.now()` fallback covers any edge case

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["5.3", "6.2", "7.1"] },
    { "id": 6, "tasks": ["6.3", "7.2"] },
    { "id": 7, "tasks": ["7.3", "7.4", "7.5", "7.6"] },
    { "id": 8, "tasks": ["7.7", "9.1"] },
    { "id": 9, "tasks": ["9.2"] },
    { "id": 10, "tasks": ["9.3", "10.1"] },
    { "id": 11, "tasks": ["10.2"] }
  ]
}
```
