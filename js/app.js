/* To-Do Life Dashboard — Main Application Script
   All JavaScript modules (StorageService, ThemeManager, GreetingWidget,
   FocusTimer, TaskManager, LinkLauncher, App) will be implemented here
   in subsequent tasks (3 – 10).
*/

// =============================================================================
// StorageService — thin localStorage wrapper with centralised error handling
// Requirements: 13.1, 13.2, 13.5
// =============================================================================
const StorageService = {
  /** @type {((message: string) => void) | null} */
  _errorHandler: null,

  /**
   * Register a single global error callback.
   * All other methods invoke it when an exception occurs.
   * @param {(message: string) => void} fn
   */
  onError(fn) {
    this._errorHandler = fn;
  },

  /**
   * Internal helper — forwards an error to the registered handler, if any.
   * @param {unknown} err
   */
  _handleError(err) {
    const message = err instanceof Error ? err.message : String(err);
    if (typeof this._errorHandler === 'function') {
      this._errorHandler(message);
    }
  },

  /**
   * Read and JSON-parse the value stored under `key`.
   * Returns `null` when the key is missing or the stored value cannot be parsed.
   * @param {string} key
   * @returns {*} parsed value or null
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      this._handleError(err);
      return null;
    }
  },

  /**
   * JSON-stringify `value` and write it to localStorage under `key`.
   * Calls the error handler and returns `false` on any exception; `true` on success.
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      this._handleError(err);
      return false;
    }
  },

  /**
   * Remove the item stored under `key` from localStorage.
   * Calls the error handler and returns `false` on any exception; `true` on success.
   * @param {string} key
   * @returns {boolean}
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      this._handleError(err);
      return false;
    }
  },
};

// =============================================================================
// ThemeManager — light/dark theme toggle with localStorage persistence
// Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
// =============================================================================
const ThemeManager = {
  /** @type {HTMLButtonElement | null} */
  _toggleBtn: null,

  /**
   * Return the currently active theme by inspecting the <html> attribute.
   * @returns {"light" | "dark"}
   */
  _currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  },

  /**
   * Apply `theme` to the document and update the toggle button label.
   * @param {"light" | "dark"} theme
   */
  _applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    this._updateToggleLabel(theme);
  },

  /**
   * Set the toggle button icon: 🌙 when light (click → go dark),
   * ☀️ when dark (click → go light).
   * @param {"light" | "dark"} theme
   */
  _updateToggleLabel(theme) {
    if (!this._toggleBtn) return;
    if (theme === 'dark') {
      this._toggleBtn.textContent = '☀️';
      this._toggleBtn.setAttribute('aria-label', 'Switch to light theme');
    } else {
      this._toggleBtn.textContent = '🌙';
      this._toggleBtn.setAttribute('aria-label', 'Switch to dark theme');
    }
  },

  /**
   * Flip the active theme, persist it, and update the button label.
   * Requirement 12.2, 12.3, 12.4
   */
  toggle() {
    const newTheme = this._currentTheme() === 'dark' ? 'light' : 'dark';
    this._applyTheme(newTheme);
    StorageService.set('tld_theme', newTheme);
  },

  /**
   * Read the saved theme, apply it, and bind the toggle button click.
   * Defaults to "light" when the saved value is missing, null, or unrecognized.
   * Requirements: 12.1, 12.5
   */
  init() {
    this._toggleBtn = document.getElementById('theme-toggle');

    // Requirement 12.5 — restore saved theme or default to light
    const saved = StorageService.get('tld_theme');
    const theme = saved === 'dark' ? 'dark' : 'light';
    this._applyTheme(theme);

    // Requirement 12.1 — bind toggle; button is fixed-position in HTML
    if (this._toggleBtn) {
      this._toggleBtn.addEventListener('click', () => this.toggle());
    }
  },
};

// =============================================================================
// FocusTimer — Pomodoro-style countdown timer with state machine
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
// =============================================================================
const FocusTimer = {
  /** @type {'IDLE' | 'RUNNING' | 'PAUSED'} */
  _state: 'IDLE',

  /** @type {number} Remaining seconds in the current countdown. */
  _remainingSeconds: 0,

  /** @type {number | null} setInterval handle for the countdown tick. */
  _intervalId: null,

  // ── DOM element references ──────────────────────────────────────────────

  /** @returns {HTMLElement | null} */
  _display()          { return document.getElementById('timer-display'); },
  /** @returns {HTMLButtonElement | null} */
  _startBtn()         { return document.getElementById('timer-start'); },
  /** @returns {HTMLButtonElement | null} */
  _stopBtn()          { return document.getElementById('timer-stop'); },
  /** @returns {HTMLButtonElement | null} */
  _resetBtn()         { return document.getElementById('timer-reset'); },
  /** @returns {HTMLElement | null} */
  _completeMsg()      { return document.getElementById('timer-complete-msg'); },
  /** @returns {HTMLInputElement | null} */
  _durationInput()    { return document.getElementById('timer-duration-input'); },
  /** @returns {HTMLElement | null} */
  _timerError()       { return document.getElementById('timer-error'); },

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Format a total-seconds value as zero-padded MM:SS.
   * Requirement 3.1
   * @param {number} totalSeconds
   * @returns {string}
   */
  _formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  /**
   * Read the saved Pomodoro duration in minutes from storage.
   * Falls back to 25 when nothing is saved or the value is invalid.
   * Requirement 3.2
   * @returns {number} duration in minutes
   */
  _loadDuration() {
    const saved = StorageService.get('tld_pomodoroDuration');
    if (typeof saved === 'number' && saved >= 1 && saved <= 120) {
      return saved;
    }
    return 25;
  },

  /**
   * Update #timer-display with the current _remainingSeconds value.
   * @private
   */
  _updateDisplay() {
    const el = this._display();
    if (el) el.textContent = this._formatTime(this._remainingSeconds);
  },

  /**
   * Apply the enabled/disabled state of the three control buttons to match
   * the current timer state.
   *
   * | State   | Start    | Stop     | Reset    |
   * |---------|----------|----------|----------|
   * | IDLE    | enabled  | disabled | disabled |
   * | RUNNING | disabled | enabled  | disabled |
   * | PAUSED  | enabled  | disabled | enabled  |
   *
   * Requirements: 3.3, 3.8, 3.9
   * @private
   */
  _applyControlState() {
    const start = this._startBtn();
    const stop  = this._stopBtn();
    const reset = this._resetBtn();

    if (!start || !stop || !reset) return;

    switch (this._state) {
      case 'IDLE':
        start.disabled = false;
        stop.disabled  = true;
        reset.disabled = true;
        break;
      case 'RUNNING':
        start.disabled = true;
        stop.disabled  = false;
        reset.disabled = true;
        break;
      case 'PAUSED':
        start.disabled = false;
        stop.disabled  = true;
        reset.disabled = false;
        break;
    }
  },

  /**
   * Clear the running countdown interval (safe to call when none is active).
   * @private
   */
  _clearInterval() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  // ── State-machine actions ────────────────────────────────────────────────

  /**
   * Start the countdown.
   * Transitions: IDLE → RUNNING, PAUSED → RUNNING
   * Requirements: 3.4, 3.8
   */
  start() {
    if (this._state === 'RUNNING') return;

    // Hide any lingering completion message
    const msg = this._completeMsg();
    if (msg) msg.hidden = true;

    this._state = 'RUNNING';
    this._applyControlState();

    this._intervalId = setInterval(() => {
      this._remainingSeconds -= 1;
      this._updateDisplay();

      if (this._remainingSeconds <= 0) {
        // Countdown reached 00:00
        this._remainingSeconds = 0;
        this._updateDisplay();
        this._clearInterval();

        // Show completion message — Requirement 3.7
        if (msg) msg.hidden = false;

        // Return to IDLE — Requirement 3.7
        this._state = 'IDLE';
        this._applyControlState();
      }
    }, 1000);
  },

  /**
   * Pause the countdown.
   * Transitions: RUNNING → PAUSED
   * Requirement 3.5, 3.9
   */
  stop() {
    if (this._state !== 'RUNNING') return;

    this._clearInterval();
    this._state = 'PAUSED';
    this._applyControlState();
  },

  /**
   * Reset the countdown to the stored (or default) duration and return to IDLE.
   * Transitions: RUNNING | PAUSED → IDLE
   * Requirement 3.6
   */
  reset() {
    this._clearInterval();

    const duration = this._loadDuration();
    this._remainingSeconds = duration * 60;
    this._updateDisplay();

    // Hide completion message if visible
    const msg = this._completeMsg();
    if (msg) msg.hidden = true;

    this._state = 'IDLE';
    this._applyControlState();
  },

  // ── Duration configuration ───────────────────────────────────────────────

  /**
   * Validate and persist a new Pomodoro duration from #timer-duration-input.
   *
   * Validation rules (Req 4.2, 4.3):
   *  - Must be a non-empty string that parses to a finite number
   *  - Must be a whole integer (no decimals allowed)
   *  - Must be in the range [1, 120]
   *
   * On invalid: show error in #timer-error, retain previous value (Req 4.3).
   * On valid:
   *  - Persist via StorageService (Req 4.4)
   *  - Clear #timer-error
   *  - Update the input display value to the validated integer
   *  - Do NOT reset a running/paused timer — new duration applies on next Reset (Req 4.7)
   *
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.7
   */
  _saveDuration() {
    const input    = this._durationInput();
    const errorEl  = this._timerError();
    const rawValue = input ? input.value : '';

    // Parse the raw string value
    const numValue = Number(rawValue);

    // Reject non-numeric, non-integer, out-of-range, or empty values
    if (
      rawValue.trim() === '' ||
      !Number.isFinite(numValue) ||
      !Number.isInteger(numValue) ||
      numValue < 1 ||
      numValue > 120
    ) {
      // Show validation error and retain the previous valid value in the input
      if (errorEl) {
        errorEl.textContent = 'Duration must be a whole number between 1 and 120.';
        errorEl.hidden = false;
      }
      // Restore the input to the currently saved (valid) duration
      if (input) {
        input.value = String(this._loadDuration());
      }
      return;
    }

    const parsedValue = numValue; // already a valid integer in [1, 120]

    // Persist the valid duration (Req 4.4)
    StorageService.set('tld_pomodoroDuration', parsedValue);

    // Clear any error message
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    // Update the input to show the clean integer value (normalises e.g. "025" → "25")
    if (input) {
      input.value = String(parsedValue);
    }

    // Req 4.7 — do NOT touch _remainingSeconds or reset a running/paused timer.
    // The new duration will take effect on the next Reset via _loadDuration().
  },

  // ── Initialisation ───────────────────────────────────────────────────────

  /**
   * Set up the timer:
   *  - Load saved duration and initialise _remainingSeconds
   *  - Pre-populate #timer-duration-input with the loaded duration (Req 4.5, 4.6)
   *  - Render the display
   *  - Apply IDLE control states
   *  - Bind button click events
   * Requirements: 3.1, 3.2, 3.3, 4.1, 4.5, 4.6
   */
  init() {
    const duration = this._loadDuration();
    this._remainingSeconds = duration * 60;
    this._updateDisplay();

    // Pre-populate the duration input with the loaded/default value (Req 4.5, 4.6)
    const durationInput = this._durationInput();
    if (durationInput) {
      durationInput.value = String(duration);
    }

    this._state = 'IDLE';
    this._applyControlState();

    // Bind controls
    const startBtn    = this._startBtn();
    const stopBtn     = this._stopBtn();
    const resetBtn    = this._resetBtn();
    const saveBtn     = document.getElementById('timer-duration-save');

    if (startBtn) startBtn.addEventListener('click', () => this.start());
    if (stopBtn)  stopBtn.addEventListener('click',  () => this.stop());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    if (saveBtn)  saveBtn.addEventListener('click',  () => this._saveDuration());
  },
};

// =============================================================================
// GreetingWidget — clock, date, greeting phrase, and name persistence
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
// =============================================================================
const GreetingWidget = {
  /** @type {string} The current saved name (empty string means no name). */
  _currentName: '',

  /** @type {number | null} setInterval handle for the clock tick. */
  _intervalId: null,

  /**
   * Format a Date into zero-padded HH:MM:SS (24-hour).
   * Requirement 1.1
   * @param {Date} date
   * @returns {string}
   */
  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },

  /**
   * Format a Date into "Weekday, Month DD, YYYY" using the user's local timezone.
   * Requirement 1.2
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Return the appropriate greeting phrase for a given hour (0–23).
   * Requirements 1.3, 1.4, 1.5, 1.6
   * @param {number} hour — integer 0–23
   * @returns {string}
   */
  getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 21) return 'Good Evening';
    return 'Good Night'; // 22–23 and 0–4
  },

  /**
   * Build the full greeting string, optionally appending the saved name.
   * @param {number} hour
   * @returns {string}
   */
  _buildGreetingText(hour) {
    const phrase = this.getGreeting(hour);
    return this._currentName
      ? `${phrase}, ${this._currentName}!`
      : `${phrase}!`;
  },

  /**
   * Update #clock, #date, and #greeting-text with current values.
   * Called once immediately on init, then every second via setInterval.
   */
  _tick() {
    const now = new Date();

    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    const greetingEl = document.getElementById('greeting-text');

    if (clockEl) clockEl.textContent = this.formatTime(now);
    if (dateEl) dateEl.textContent = this.formatDate(now);
    if (greetingEl) greetingEl.textContent = this._buildGreetingText(now.getHours());
  },

  /**
   * Handle the name-save button click.
   * Requirements 2.2, 2.3, 2.4, 2.6, 2.7
   */
  _handleSave() {
    const nameInput = document.getElementById('name-input');
    const greetingEl = document.getElementById('greeting-text');
    const errorEl = document.getElementById('greeting-error');

    const trimmed = nameInput ? nameInput.value.trim() : '';

    if (!trimmed) {
      // Empty / whitespace-only — show generic greeting, do not save
      // Requirements 2.2, 2.6
      this._currentName = '';
      if (greetingEl) {
        greetingEl.textContent = this._buildGreetingText(new Date().getHours());
      }
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = '';
      }
      return;
    }

    // Valid name — persist via StorageService
    // Requirements 2.3, 2.4
    const saved = StorageService.set('tld_userName', trimmed);

    if (!saved) {
      // StorageService returned false — storage error
      // Requirement 2.7
      if (errorEl) {
        errorEl.textContent = 'Error: your name could not be saved.';
        errorEl.hidden = false;
      }
      return;
    }

    // Persisted successfully
    this._currentName = trimmed;

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    if (greetingEl) {
      greetingEl.textContent = this._buildGreetingText(new Date().getHours());
    }
  },

  /**
   * Initialise the widget:
   *  - Load saved name and populate #name-input
   *  - Start the 1-second clock interval (and tick immediately)
   *  - Bind the save button
   * Requirements: 2.1, 2.5
   */
  init() {
    // Requirement 2.5 — restore saved name
    const savedName = StorageService.get('tld_userName');
    if (savedName && typeof savedName === 'string' && savedName.trim()) {
      this._currentName = savedName.trim();
      const nameInput = document.getElementById('name-input');
      if (nameInput) nameInput.value = this._currentName;
    }

    // Tick immediately to avoid a 1-second blank display, then every second
    this._tick();
    this._intervalId = setInterval(() => this._tick(), 1000);

    // Bind save button — Requirement 2.1
    const saveBtn = document.getElementById('name-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._handleSave());
    }
  },
};

// =============================================================================
// TaskManager — task CRUD, deduplication, sorting
// Requirements: 5.4, 5.5, 9.1, 9.2, 13.1
// =============================================================================
const TaskManager = {
  /** @type {"default" | "alpha" | "completedLast"} */
  _currentSortOrder: 'default',

  /**
   * Generate a unique task ID.
   * Uses crypto.randomUUID() when available; falls back to String(Date.now()).
   * Requirement 13.1
   * @returns {string}
   */
  generateId() {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
    return String(Date.now());
  },

  /**
   * Load all tasks from localStorage.
   * Returns the stored array, or an empty array if nothing is saved or parsing fails.
   * Requirement 5.5, 13.1
   * @returns {Array<{id: string, description: string, completed: boolean, createdAt: number}>}
   */
  loadTasks() {
    const data = StorageService.get('tld_tasks');
    return Array.isArray(data) ? data : [];
  },

  /**
   * Persist the task array to localStorage.
   * On failure, shows an error message in #task-error.
   * Requirement 5.4, 13.1
   * @param {Array<{id: string, description: string, completed: boolean, createdAt: number}>} tasks
   */
  saveTasks(tasks) {
    const success = StorageService.set('tld_tasks', tasks);
    if (!success) {
      const errorEl = document.getElementById('task-error');
      if (errorEl) {
        errorEl.textContent = 'Error: tasks could not be saved.';
        errorEl.hidden = false;
      }
    }
    return success;
  },

  /**
   * Return a sorted copy of the tasks array based on the given sort order.
   * Does NOT mutate the original array or the stored data.
   *
   * Supported orders (Requirement 9.1, 9.2):
   *  - "default"       : by createdAt ascending (insertion order)
   *  - "alpha"         : by description.toLowerCase() lexicographic ascending
   *  - "completedLast" : incomplete tasks first (by createdAt), then complete (by createdAt)
   *
   * @param {Array<{id: string, description: string, completed: boolean, createdAt: number}>} tasks
   * @param {"default" | "alpha" | "completedLast"} order
   * @returns {Array<{id: string, description: string, completed: boolean, createdAt: number}>}
   */
  sortTasks(tasks, order) {
    const copy = tasks.slice();

    switch (order) {
      case 'alpha':
        copy.sort((a, b) => {
          const aLower = a.description.toLowerCase();
          const bLower = b.description.toLowerCase();
          if (aLower < bLower) return -1;
          if (aLower > bLower) return 1;
          return 0;
        });
        break;

      case 'completedLast':
        copy.sort((a, b) => {
          // Incomplete (false) sorts before complete (true)
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // Within the same completion group, sort by createdAt ascending
          return a.createdAt - b.createdAt;
        });
        break;

      case 'default':
      default:
        copy.sort((a, b) => a.createdAt - b.createdAt);
        break;
    }

    return copy;
  },

  /**
   * Create and return a <li> element representing a single task.
   * Contains: completion checkbox, description span, Edit button, Delete button.
   * Requirements: 8.1, 8.4
   *
   * @param {{id: string, description: string, completed: boolean, createdAt: number}} task
   * @returns {HTMLLIElement}
   */
  renderTask(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;

    // ── Completion checkbox (Req 8.1) ──────────────────────────────
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => {
      // Stub: wired to toggle handler (implemented in task 7.5)
      if (typeof this.toggleComplete === 'function') {
        this.toggleComplete(task.id);
      }
    });

    // ── Description span (Req 8.4) ─────────────────────────────────
    const span = document.createElement('span');
    span.className = 'task-item__text' + (task.completed ? ' strikethrough' : '');
    span.textContent = task.description;

    // ── Actions container ──────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'task-item__actions';

    // Edit button (wired to edit handler — implemented in task 7.4)
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-icon';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
    editBtn.addEventListener('click', () => {
      if (typeof this.editTask === 'function') {
        this.editTask(task.id, li);
      }
    });

    // Delete button (wired to delete handler — implemented in task 7.5)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-icon';
    deleteBtn.textContent = '🗑️';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
    deleteBtn.addEventListener('click', () => {
      if (typeof this.deleteTask === 'function') {
        this.deleteTask(task.id);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(actions);

    return li;
  },

  /**
   * Load all tasks, apply the current sort order, clear #task-list,
   * and append a rendered <li> for each task.
   * Requirements: 8.1, 8.4, 9.2
   */
  renderTaskList() {
    const tasks = this.loadTasks();
    const sorted = this.sortTasks(tasks, this._currentSortOrder);

    const listEl = document.getElementById('task-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    sorted.forEach((task) => {
      listEl.appendChild(this.renderTask(task));
    });
  },

  /**
   * Handle the Add Task button click.
   * Validates input, checks for duplicates, creates and persists the new task.
   * Requirements: 5.2, 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 6.4
   */
  addTask() {
    const inputEl  = document.getElementById('task-input');
    const errorEl  = document.getElementById('task-error');
    const trimmed  = inputEl ? inputEl.value.trim() : '';

    // Req 5.6 / 6.4 — reject empty / whitespace-only input
    if (!trimmed) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a task description.';
        errorEl.hidden = false;
      }
      return;
    }

    // Req 6.1, 6.2 — case-insensitive duplicate check
    const tasks = this.loadTasks();
    const isDuplicate = tasks.some(
      (t) => t.description.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      if (errorEl) {
        errorEl.textContent = 'A task with this description already exists.';
        errorEl.hidden = false;
      }
      // Req 6.2 — retain input value
      return;
    }

    // Req 5.3 — create the new task object
    const newTask = {
      id: this.generateId(),
      description: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    tasks.push(newTask);

    // Req 5.4 — persist immediately
    this.saveTasks(tasks);

    // Clear error on success
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    // Re-render and clear input
    this.renderTaskList();
    if (inputEl) inputEl.value = '';
  },

  /**
   * Enter inline edit mode for a task.
   * Replaces the description span with an editable input and Confirm/Cancel controls.
   *
   * Flow:
   *  1. Find task by id.
   *  2. Swap <span> → <input> (maxlength 500, pre-filled).
   *  3. Swap action buttons → Confirm + Cancel.
   *  4. Confirm: validate → duplicate-check (exclude self) → update → persist.
   *     On storage failure: revert description, show error, stay editable.
   *  5. Cancel: call renderTaskList() to restore read-only view.
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   *
   * @param {string} taskId
   * @param {HTMLLIElement} li
   */
  editTask(taskId, li) {
    const tasks = this.loadTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    const originalDescription = task.description;

    const errorEl = document.getElementById('task-error');

    // ── Swap span → input ──────────────────────────────────────────
    const span = li.querySelector('.task-item__text');
    const actionsDiv = li.querySelector('.task-item__actions');

    if (!span || !actionsDiv) return;

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-item__edit-input';
    editInput.value = task.description;
    editInput.maxLength = 500;
    editInput.setAttribute('aria-label', 'Edit task description');

    li.replaceChild(editInput, span);
    editInput.focus();

    // ── Swap action buttons → Confirm + Cancel ─────────────────────
    actionsDiv.innerHTML = '';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn-icon';
    confirmBtn.textContent = '✔️';
    confirmBtn.setAttribute('aria-label', 'Confirm edit');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-icon';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.textContent = '✖️';

    actionsDiv.appendChild(confirmBtn);
    actionsDiv.appendChild(cancelBtn);

    // ── Confirm handler ────────────────────────────────────────────
    confirmBtn.addEventListener('click', () => {
      const trimmed = editInput.value.trim();

      // Req 7.4 — reject empty description
      if (!trimmed) {
        if (errorEl) {
          errorEl.textContent = 'Task description cannot be empty.';
          errorEl.hidden = false;
        }
        editInput.focus();
        return;
      }

      // Req 7.3 — case-insensitive duplicate check excluding self
      const isDuplicate = tasks.some(
        (t) =>
          t.id !== taskId &&
          t.description.toLowerCase() === trimmed.toLowerCase()
      );

      if (isDuplicate) {
        if (errorEl) {
          errorEl.textContent = 'A task with this description already exists.';
          errorEl.hidden = false;
        }
        editInput.focus();
        return;
      }

      // Update description
      tasks[taskIndex].description = trimmed;

      // Req 7.6 — persist; on failure revert and show error
      const saved = StorageService.set('tld_tasks', tasks);
      if (!saved) {
        tasks[taskIndex].description = originalDescription;
        if (errorEl) {
          errorEl.textContent = 'Error: task could not be saved.';
          errorEl.hidden = false;
        }
        editInput.value = originalDescription;
        editInput.focus();
        return;
      }

      // Success — clear error and re-render
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
      this.renderTaskList();
    });

    // ── Cancel handler — Req 7.5 ───────────────────────────────────
    cancelBtn.addEventListener('click', () => {
      this.renderTaskList();
    });
  },

  /**
   * Toggle the completion status of a task.
   *
   * Flow:
   *  1. Find task by id in storage.
   *  2. Flip task.completed.
   *  3. Persist via saveTasks().
   *  4. On storage failure: revert task.completed and show #task-error.
   *  5. On success: update the rendered <li> strikethrough styling in-place
   *     (avoids a full list re-render which would disrupt scroll position).
   *
   * Requirements: 8.2, 8.3, 8.4
   * @param {string} taskId
   */
  toggleComplete(taskId) {
    const tasks = this.loadTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    const previousState = task.completed;

    // Req 8.2 — flip completion status
    task.completed = !previousState;

    // Persist
    const saved = this.saveTasks(tasks);

    if (!saved) {
      // Req 8.3 — revert on storage failure; saveTasks() already showed the error
      task.completed = previousState;
      // Revert the checkbox in the DOM to match reverted state
      const li = document.querySelector(`#task-list [data-id="${CSS.escape(taskId)}"]`);
      if (li) {
        const checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = previousState;
      }
      return;
    }

    // Req 8.4 — update strikethrough styling in the existing <li> without full re-render
    const li = document.querySelector(`#task-list [data-id="${CSS.escape(taskId)}"]`);
    if (li) {
      const span = li.querySelector('.task-item__text');
      if (span) {
        if (task.completed) {
          span.classList.add('strikethrough');
        } else {
          span.classList.remove('strikethrough');
        }
      }
      // Update aria-label on the checkbox to reflect the new state
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.setAttribute(
          'aria-label',
          `Mark "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`
        );
      }
    }

    // Clear any previous task error (this operation succeeded)
    const errorEl = document.getElementById('task-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  },

  /**
   * Delete a task by id.
   *
   * Flow:
   *  1. Find task by id; record its index for potential restoration.
   *  2. Remove it from the tasks array.
   *  3. Persist via saveTasks().
   *  4. On storage failure: restore the task at its original index and show #task-error.
   *  5. On success: re-render the full task list.
   *
   * Requirements: 8.5, 8.6, 8.7
   * @param {string} taskId
   */
  deleteTask(taskId) {
    const tasks = this.loadTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    // Req 8.6 — capture task and remove it
    const removedTask = tasks[taskIndex];
    tasks.splice(taskIndex, 1);

    // Persist
    const saved = this.saveTasks(tasks);

    if (!saved) {
      // Req 8.7 — restore task at original index on failure; saveTasks() already showed error
      tasks.splice(taskIndex, 0, removedTask);
      return;
    }

    // Success — clear any previous error and re-render
    const errorEl = document.getElementById('task-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    this.renderTaskList();
  },

  /**
   * Handle a change to the #task-sort-select element.
   *
   * Flow:
   *  1. Update _currentSortOrder to the newly selected value.
   *  2. Persist the new order via StorageService.
   *  3. On storage failure: show #task-error and fall back to "default".
   *  4. Re-render the task list with the active sort order.
   *
   * Requirements: 9.1, 9.4, 9.5
   * @param {string} order - the value chosen in #task-sort-select
   */
  _handleSortChange(order) {
    const VALID_ORDERS = ['default', 'alpha', 'completedLast'];
    const errorEl = document.getElementById('task-error');

    // Guard against unexpected values (should not happen with a <select>, but be safe)
    const validOrder = VALID_ORDERS.includes(order) ? order : 'default';

    // Attempt to persist the new preference — Req 9.4
    const saved = StorageService.set('tld_sortOrder', validOrder);

    if (!saved) {
      // Req 9.5 — storage failure: fall back to "default" and show error
      this._currentSortOrder = 'default';

      const sortSelect = document.getElementById('task-sort-select');
      if (sortSelect) {
        sortSelect.value = 'default';
      }

      if (errorEl) {
        errorEl.textContent = 'Error: sort preference could not be saved. Falling back to default order.';
        errorEl.hidden = false;
      }
    } else {
      // Persist succeeded — apply the chosen order
      this._currentSortOrder = validOrder;

      // Clear any previous task error
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    // Req 9.1, 9.2 — re-render list in the active sort order (no stored data mutation)
    this.renderTaskList();
  },

  /**
   * Initialise the TaskManager widget:
   *  - Restore saved sort order from LocalStorage; fall back to "default" if
   *    the value is missing, invalid, or unrecognised (Req 9.3, 9.5)
   *  - Set #task-sort-select to match the active sort order
   *  - Bind #task-sort-select change → _handleSortChange() (Req 9.4)
   *  - Bind #task-add-btn click → addTask()
   *  - Render the task list on page load (Req 5.5)
   * Requirements: 5.5, 9.3, 9.4, 9.5
   */
  init() {
    const VALID_ORDERS = ['default', 'alpha', 'completedLast'];
    const errorEl = document.getElementById('task-error');

    // Req 9.3 / 9.5 — restore saved sort order; invalid/missing → "default"
    const savedOrder = StorageService.get('tld_sortOrder');

    if (savedOrder !== null && !VALID_ORDERS.includes(savedOrder)) {
      // Req 9.5 — unrecognised value: fall back and show error
      this._currentSortOrder = 'default';
      if (errorEl) {
        errorEl.textContent = 'Sort preference could not be loaded. Using default order.';
        errorEl.hidden = false;
      }
    } else {
      // null (missing) → "default" silently; valid value → use it
      this._currentSortOrder = VALID_ORDERS.includes(savedOrder) ? savedOrder : 'default';
    }

    // Sync the <select> element with the active sort order
    const sortSelect = document.getElementById('task-sort-select');
    if (sortSelect) {
      sortSelect.value = this._currentSortOrder;

      // Req 9.4 — bind change event to persist and re-render
      sortSelect.addEventListener('change', (e) => {
        this._handleSortChange(e.target.value);
      });
    }

    // Bind Add button
    const addBtn = document.getElementById('task-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addTask());
    }

    // Req 5.5 — render saved tasks on load
    this.renderTaskList();
  },
};

// =============================================================================
// LinkLauncher — quick-link CRUD with rendering and add handler
// Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.2, 11.3, 11.4, 11.5
// =============================================================================
const LinkLauncher = {
  /** Maximum number of quick links allowed (Requirement 10.4). */
  MAX_LINKS: 20,

  // ── DOM helpers ────────────────────────────────────────────────────────────

  /** @returns {HTMLElement | null} */
  _linkList()       { return document.getElementById('link-list'); },
  /** @returns {HTMLElement | null} */
  _errorEl()        { return document.getElementById('link-error'); },
  /** @returns {HTMLElement | null} */
  _emptyMsg()       { return document.getElementById('link-empty-msg'); },
  /** @returns {HTMLInputElement | null} */
  _labelInput()     { return document.getElementById('link-label-input'); },
  /** @returns {HTMLInputElement | null} */
  _urlInput()       { return document.getElementById('link-url-input'); },

  // ── Data helpers ───────────────────────────────────────────────────────────

  /**
   * Load all quick links from localStorage.
   * Returns the stored array, or an empty array when nothing is saved or parsing fails.
   * Requirement 10.5, 13.1
   * @returns {Array<{id: string, label: string, url: string}>}
   */
  loadLinks() {
    const data = StorageService.get('tld_links');
    return Array.isArray(data) ? data : [];
  },

  /**
   * Persist the quick-links array to localStorage.
   * On failure, shows an error message in #link-error.
   * Requirements 10.4, 10.7
   * @param {Array<{id: string, label: string, url: string}>} links
   * @returns {boolean} true on success, false on failure
   */
  saveLinks(links) {
    const success = StorageService.set('tld_links', links);
    if (!success) {
      const errorEl = this._errorEl();
      if (errorEl) {
        errorEl.textContent = 'Error: links could not be saved.';
        errorEl.hidden = false;
      }
    }
    return success;
  },

  // ── Rendering ──────────────────────────────────────────────────────────────

  /**
   * Re-render the quick-link list.
   *
   * - When the array is empty: show #link-empty-msg, clear #link-list.
   * - When non-empty: hide #link-empty-msg, render one button per link with:
   *     • a launch button containing the label (opens url in a new tab)
   *     • a ✕ delete button
   *
   * Requirements: 10.2, 10.3, 10.5, 11.1
   */
  renderLinks() {
    const links    = this.loadLinks();
    const listEl   = this._linkList();
    const emptyMsg = this._emptyMsg();

    if (!listEl) return;

    // Clear existing rendered items
    listEl.innerHTML = '';

    if (links.length === 0) {
      // Show empty-state placeholder
      if (emptyMsg) emptyMsg.hidden = false;
      return;
    }

    // Hide empty-state placeholder
    if (emptyMsg) emptyMsg.hidden = true;

    links.forEach((link) => {
      const item = document.createElement('div');
      item.className = 'link-item';
      item.dataset.id = link.id;

      // ── Launch button (Req 10.2, 10.3) ──────────────────────────
      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'link-item__btn';
      launchBtn.textContent = `🔗 ${link.label}`;
      launchBtn.setAttribute('aria-label', `Open ${link.label}`);
      launchBtn.addEventListener('click', () => {
        window.open(link.url, '_blank');
      });

      // ── Delete button (Req 11.1) ─────────────────────────────────
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-icon btn-link-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
      deleteBtn.addEventListener('click', () => {
        if (typeof this.deleteLink === 'function') {
          this.deleteLink(link.id);
        }
      });

      item.appendChild(launchBtn);
      item.appendChild(deleteBtn);
      listEl.appendChild(item);
    });
  },

  // ── Delete handler ─────────────────────────────────────────────────────────

  /**
   * Delete a quick link by id.
   *
   * Flow:
   *  1. Load links from storage; find the link by id and record its index.
   *  2. Remove it from the array.
   *  3. Call saveLinks() — on failure, restore the link at its original index
   *     and show #link-error; saveLinks() already writes the error message.
   *  4. On success, clear #link-error and call renderLinks().
   *     renderLinks() handles showing #link-empty-msg when the list is empty.
   *
   * Requirements: 11.2, 11.3, 11.4, 11.5
   * @param {string} linkId
   */
  deleteLink(linkId) {
    const links = this.loadLinks();
    const linkIndex = links.findIndex((l) => l.id === linkId);
    if (linkIndex === -1) return;

    // Req 11.2 — capture the link and remove it immediately (no confirmation)
    const removedLink = links[linkIndex];
    links.splice(linkIndex, 1);

    // Req 11.3 — persist the updated list
    const saved = this.saveLinks(links);

    if (!saved) {
      // Req 11.5 — restore the link at its original position on storage failure
      // saveLinks() has already shown the #link-error message
      links.splice(linkIndex, 0, removedLink);
      return;
    }

    // Success — clear any previous link error
    const errorEl = this._errorEl();
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    // Req 11.4 handled inside renderLinks(): when links.length === 0, it shows #link-empty-msg
    this.renderLinks();
  },

  // ── Add handler ────────────────────────────────────────────────────────────

  /**
   * Handle the Add Link button click.
   *
   * Validation (Requirements 10.2, 10.6):
   *  - Label must be non-empty after trimming.
   *  - URL must match /^https?:\/\/.+/ after trimming.
   *  - The list must not already contain 20 items (Requirement 10.4).
   *
   * On success: create QuickLink, push, saveLinks, renderLinks, clear inputs.
   *
   * Requirements: 10.1, 10.2, 10.4, 10.6, 10.7
   */
  _handleAdd() {
    const labelInput = this._labelInput();
    const urlInput   = this._urlInput();
    const errorEl    = this._errorEl();

    const trimmedLabel = labelInput ? labelInput.value.trim() : '';
    const trimmedUrl   = urlInput   ? urlInput.value.trim()   : '';

    // ── Clear previous error ────────────────────────────────────────
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    // ── Validate label (Req 10.6) ───────────────────────────────────
    if (!trimmedLabel) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a label for the link.';
        errorEl.hidden = false;
      }
      if (labelInput) labelInput.focus();
      return;
    }

    // ── Validate URL (Req 10.2, 10.6) ──────────────────────────────
    if (!trimmedUrl || !/^https?:\/\/.+/.test(trimmedUrl)) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a valid URL starting with http:// or https://.';
        errorEl.hidden = false;
      }
      if (urlInput) urlInput.focus();
      return;
    }

    // ── Enforce 20-item cap (Req 10.4) ─────────────────────────────
    const links = this.loadLinks();
    if (links.length >= this.MAX_LINKS) {
      if (errorEl) {
        errorEl.textContent = `You can save at most ${this.MAX_LINKS} quick links.`;
        errorEl.hidden = false;
      }
      return;
    }

    // ── Create and persist the new QuickLink ────────────────────────
    /** @type {{id: string, label: string, url: string}} */
    const newLink = {
      id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : String(Date.now()),
      label: trimmedLabel,
      url: trimmedUrl,
    };

    links.push(newLink);

    const saved = this.saveLinks(links);

    if (!saved) {
      // saveLinks() already displayed the error message (Req 10.7)
      return;
    }

    // ── Success: re-render and clear inputs ─────────────────────────
    this.renderLinks();

    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
  },

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * Set up LinkLauncher:
   *  - Load and render saved links (Requirement 10.5)
   *  - Bind #link-add-btn click → _handleAdd()
   * Requirements: 10.1, 10.5
   */
  init() {
    // Req 10.5 — render saved links on page load
    this.renderLinks();

    // Bind Add button
    const addBtn = document.getElementById('link-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._handleAdd());
    }
  },
};

// =============================================================================
// App — bootstrap: wires all modules together on DOMContentLoaded
// =============================================================================
const App = {
  init() {
    // 1. Register global storage-error banner handler
    StorageService.onError((message) => {
      const banner = document.getElementById('storage-error-banner');
      if (banner) {
        banner.textContent = `Storage error: ${message}`;
        banner.hidden = false;
      }
    });

    // 2. Apply saved theme before any paint
    ThemeManager.init();

    // 3. Start clock, load name, render greeting
    GreetingWidget.init();

    // 4. Load saved duration, set IDLE state
    FocusTimer.init();

    // 5. TaskManager — load tasks, restore sort order, bind Add button
    TaskManager.init();

    // 6. LinkLauncher — load links, render buttons, bind Add button
    LinkLauncher.init();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
