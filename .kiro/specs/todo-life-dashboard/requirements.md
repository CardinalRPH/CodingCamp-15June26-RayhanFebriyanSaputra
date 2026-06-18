# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side, single-page web application built with HTML, CSS, and Vanilla JavaScript. It serves as a personal productivity hub combining a real-time greeting, a Pomodoro-style focus timer, a task manager, and a quick-access link launcher — all stored persistently in the browser's Local Storage. The app requires no backend, no framework, and no external setup, making it immediately usable as a standalone web page or browser extension.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **User**: The person using the Dashboard in a web browser.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **Greeting_Widget**: The UI section that displays the current time, date, and a personalized greeting.
- **Focus_Timer**: The Pomodoro-style countdown timer widget.
- **Task_Manager**: The UI section that manages the to-do list.
- **Task**: A single to-do item with a text description and a completion status.
- **Link_Launcher**: The UI section that displays and manages user-defined quick-access website buttons.
- **Quick_Link**: A user-defined entry containing a label and a URL.
- **Theme**: The visual color scheme of the Dashboard, either light or dark.
- **Pomodoro_Duration**: The countdown duration (in minutes) configured for the Focus_Timer.
- **Sort_Order**: The ordering rule applied to the Task_Manager's task list (e.g., alphabetical, by completion status).

---

## Requirements

### Requirement 1: Real-Time Greeting Display

**User Story:** As a User, I want to see the current time, date, and a personalized greeting when I open the Dashboard, so that I have immediate situational awareness.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS 24-hour format, updated every second using the user's local device timezone.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, Month DD, YYYY" (e.g., "Monday, June 16, 2025") using the user's local device timezone.
3. WHEN the current hour (in the user's local device timezone) is between 5 and 11 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the current hour (in the user's local device timezone) is between 12 and 17 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the current hour (in the user's local device timezone) is between 18 and 21 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the current hour (in the user's local device timezone) is between 22 and 23 or between 0 and 4 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Night".

---

### Requirement 2: Custom User Name in Greeting

**User Story:** As a User, I want to set my name so that the greeting feels personal and addresses me directly.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide an input field for the User to enter a custom name of up to 50 characters.
2. WHEN the User submits a name containing only whitespace characters, THE Greeting_Widget SHALL treat it as empty and display a generic greeting without a name.
3. WHEN the User submits a non-empty, non-whitespace-only name, THE Greeting_Widget SHALL trim leading and trailing whitespace and display the greeting with the trimmed name appended (e.g., "Good Morning, Rayhan!").
4. WHEN the User submits a valid non-empty name, THE Dashboard SHALL persist the trimmed name to Local_Storage.
5. WHEN the Dashboard loads and Local_Storage contains a saved name, THE Greeting_Widget SHALL populate the name input field with the saved name and display the personalized greeting without requiring the User to re-enter it.
6. IF the User submits an empty or whitespace-only name, THEN THE Greeting_Widget SHALL display a generic greeting without a name (e.g., "Good Morning!").
7. IF Local_Storage is unavailable or throws an error when saving the name, THEN THE Greeting_Widget SHALL display an error message informing the User that the name could not be saved.

---

### Requirement 3: Focus Timer

**User Story:** As a User, I want a countdown timer so that I can manage focused work sessions using the Pomodoro technique.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display a countdown in MM:SS format.
2. WHEN the Dashboard loads and no custom Pomodoro_Duration is saved, THE Focus_Timer SHALL initialize the countdown to 25 minutes (25:00).
3. WHEN the Focus_Timer is in idle state (not yet started), THE Focus_Timer SHALL enable the Start control and disable both the Stop and Reset controls.
4. WHEN the User activates the Start control, THE Focus_Timer SHALL begin counting down once per second.
5. WHEN the User activates the Stop control, THE Focus_Timer SHALL pause the countdown at the current value.
6. WHEN the User activates the Reset control from any state (running or paused), THE Focus_Timer SHALL reset the countdown to the configured Pomodoro_Duration and return to idle state.
7. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, display a visible on-screen completion message, re-enable the Start control, and disable the Stop control.
8. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the Start control and the Reset control to prevent duplicate timers and unintended resets.
9. WHEN the Focus_Timer is paused, THE Focus_Timer SHALL enable the Start control and the Reset control, and disable the Stop control.

---

### Requirement 4: Configurable Pomodoro Duration

**User Story:** As a User, I want to change the timer duration, so that I can adapt the Focus_Timer to my preferred work session length.

#### Acceptance Criteria

1. THE Focus_Timer SHALL provide an input control for the User to specify a custom Pomodoro_Duration in whole minutes.
2. WHEN the User sets a Pomodoro_Duration between 1 and 120 (inclusive) as a positive integer, THE Focus_Timer SHALL accept and apply the new duration.
3. IF the User submits a Pomodoro_Duration outside the range of 1 to 120 minutes, or a non-numeric value, or a non-integer value, THEN THE Focus_Timer SHALL reject the value, display a validation error message, and retain the previously valid Pomodoro_Duration.
4. WHEN the User saves a valid Pomodoro_Duration, THE Dashboard SHALL persist the value to Local_Storage.
5. WHEN the Dashboard loads and Local_Storage contains a saved Pomodoro_Duration, THE Focus_Timer SHALL initialize to that saved duration.
6. IF no Pomodoro_Duration is saved in Local_Storage on load, THEN THE Focus_Timer SHALL default to 25 minutes.
7. IF the User changes the Pomodoro_Duration while the Focus_Timer is counting down, THEN THE Focus_Timer SHALL apply the new duration only on the next session (after a Reset), not mid-session.

---

### Requirement 5: Task Management — Add and Persist Tasks

**User Story:** As a User, I want to add tasks and have them saved automatically, so that my to-do list is preserved across browser sessions.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide an input field for the User to enter a new Task description of up to 255 characters.
2. WHEN the User submits a Task description, THE Task_Manager SHALL trim leading and trailing whitespace; IF the trimmed value is empty, THEN THE Task_Manager SHALL reject the submission.
3. WHEN the User submits a valid non-empty Task description, THE Task_Manager SHALL add the Task to the list.
4. WHEN a Task is added, THE Task_Manager SHALL persist the updated task list to Local_Storage immediately before the next user interaction.
5. WHEN the Dashboard loads, THE Task_Manager SHALL retrieve and render all Tasks previously saved in Local_Storage.
6. IF the User submits an empty or whitespace-only Task description, THEN THE Task_Manager SHALL reject the submission and display a validation message.
7. IF Local_Storage is unavailable or throws an error when saving a Task, THEN THE Task_Manager SHALL display an error message informing the User that the task could not be saved.

---

### Requirement 6: Prevent Duplicate Tasks

**User Story:** As a User, I want the Dashboard to prevent me from adding a task that already exists, so that my to-do list remains clean and non-repetitive.

#### Acceptance Criteria

1. WHEN the User submits a new Task description, THE Task_Manager SHALL trim whitespace and perform a case-insensitive comparison against all existing Task descriptions (both complete and incomplete).
2. IF the submitted Task description matches an existing Task description (after trimming and case normalization), THEN THE Task_Manager SHALL reject the submission, display a duplicate-warning message, and retain the User's input text in the input field.
3. IF the submitted Task description does not match any existing Task description, THEN THE Task_Manager SHALL add the Task to the list.
4. IF the submitted Task description is empty or whitespace-only, THEN THE Task_Manager SHALL reject it with an empty-input validation message without running the duplicate check.

---

### Requirement 7: Task Management — Edit Tasks

**User Story:** As a User, I want to edit an existing task description, so that I can correct mistakes or update task details.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide an Edit control for each Task in the list.
2. WHEN the User activates the Edit control for a Task, THE Task_Manager SHALL present the current Task description in an editable input field pre-populated with the existing description, up to 500 characters.
3. WHEN the User confirms the edit with a non-empty, non-whitespace-only description, THE Task_Manager SHALL trim whitespace, update the Task description, persist the change to Local_Storage, and return the Task to its read-only display state.
4. IF the User confirms the edit with an empty or whitespace-only description, THEN THE Task_Manager SHALL reject the change, display a validation message, and keep the Task in editable state.
5. WHEN the User cancels the edit, THE Task_Manager SHALL discard any changes, restore the original Task description, and return the Task to its read-only display state.
6. IF Local_Storage is unavailable or throws an error when saving an edited Task, THEN THE Task_Manager SHALL display an error message and revert the Task description to its pre-edit value.

---

### Requirement 8: Task Management — Complete and Delete Tasks

**User Story:** As a User, I want to mark tasks as done and delete tasks, so that I can track my progress and keep the list relevant.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a completion toggle (e.g., checkbox) for each Task.
2. WHEN the User toggles the completion control for a Task, THE Task_Manager SHALL set the Task's completion status to the opposite of its current state and persist the change to Local_Storage.
3. IF Local_Storage is unavailable or throws an error when persisting a completion toggle, THEN THE Task_Manager SHALL revert the toggle to its previous state and display an error message.
4. THE Task_Manager SHALL render completed Tasks with strikethrough text styling applied to the Task title to differentiate them from incomplete Tasks.
5. THE Task_Manager SHALL provide a Delete control for each Task.
6. WHEN the User activates the Delete control for a Task, THE Task_Manager SHALL immediately remove the Task from the list and persist the updated list to Local_Storage.
7. IF Local_Storage is unavailable or throws an error when persisting after deletion, THEN THE Task_Manager SHALL restore the deleted Task to its previous position and display an error message.

---

### Requirement 9: Task Sorting

**User Story:** As a User, I want to sort my task list, so that I can prioritize what to focus on.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a Sort_Order control with exactly the following options: default (insertion order), alphabetical (A–Z by task description, case-insensitive), and completed-last (incomplete tasks first, then completed tasks; within each group, insertion order is preserved).
2. WHEN the User selects a Sort_Order, THE Task_Manager SHALL re-render the task list in the selected order without modifying the underlying stored task data.
3. WHEN the Dashboard loads and Local_Storage contains a saved Sort_Order, THE Task_Manager SHALL apply that Sort_Order; IF no Sort_Order is saved, THEN THE Task_Manager SHALL apply the default (insertion order).
4. WHEN the User changes the Sort_Order, THE Dashboard SHALL persist the selected Sort_Order to Local_Storage.
5. IF Local_Storage is unavailable or returns an unrecognized Sort_Order value, THEN THE Task_Manager SHALL fall back to default (insertion order) and display an error message informing the User that the sort preference could not be loaded.

---

### Requirement 10: Quick Links — Add and Display

**User Story:** As a User, I want to add quick-access buttons to my favorite websites, so that I can launch them in one click directly from the Dashboard.

#### Acceptance Criteria

1. THE Link_Launcher SHALL provide an input field for the Quick_Link label (up to 50 characters) and an input field for the Quick_Link URL (up to 2048 characters).
2. WHEN the User submits a Quick_Link with a non-empty label and a valid URL (a non-empty string beginning with `http://` or `https://` followed by at least one additional character), THE Link_Launcher SHALL add the Quick_Link as a clickable button.
3. WHEN a Quick_Link button is activated, THE Link_Launcher SHALL open the associated URL in a new browser tab.
4. WHEN a Quick_Link is added, THE Dashboard SHALL persist the updated Quick_Link list to Local_Storage, up to a maximum of 20 Quick_Links.
5. WHEN the Dashboard loads, THE Link_Launcher SHALL retrieve and render all Quick_Links saved in Local_Storage.
6. IF the User submits a Quick_Link with an empty label or an invalid URL, THEN THE Link_Launcher SHALL reject the submission and display a validation message indicating which field is invalid.
7. IF Local_Storage is unavailable or throws an error when saving a Quick_Link, THEN THE Link_Launcher SHALL display an error message informing the User that the link could not be saved.

---

### Requirement 11: Quick Links — Delete

**User Story:** As a User, I want to remove quick-access links I no longer need, so that the Link_Launcher stays relevant.

#### Acceptance Criteria

1. THE Link_Launcher SHALL display a permanently visible Delete control for each Quick_Link.
2. WHEN the User activates the Delete control for a Quick_Link, THE Link_Launcher SHALL immediately remove the Quick_Link from the list without a confirmation prompt.
3. WHEN a Quick_Link is deleted, THE Dashboard SHALL persist the updated Quick_Link list to Local_Storage.
4. IF the deleted Quick_Link was the last item, THEN THE Link_Launcher SHALL display an empty-state placeholder message.
5. IF Local_Storage is unavailable or throws an error when persisting after deletion, THEN THE Link_Launcher SHALL restore the deleted Quick_Link to its previous position and display an error message.

---

### Requirement 12: Light / Dark Mode Toggle

**User Story:** As a User, I want to switch between light and dark color schemes, so that the Dashboard is comfortable to use in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme toggle control that is always visible regardless of scroll position.
2. WHEN the User activates the Theme toggle, THE Dashboard SHALL switch the active Theme between light and dark.
3. WHEN the Theme changes, THE Dashboard SHALL apply the new Theme's styles to all UI elements, including dynamically rendered elements, without requiring a page reload.
4. WHEN the Theme changes, THE Dashboard SHALL persist the selected Theme to Local_Storage.
5. WHEN the Dashboard loads, IF Local_Storage contains a valid saved Theme value ("light" or "dark"), THEN THE Dashboard SHALL apply that Theme; IF the value is missing, invalid, or unrecognized, THEN THE Dashboard SHALL apply the light Theme by default.

---

### Requirement 13: Data Persistence Architecture

**User Story:** As a User, I want all my data to be saved automatically in my browser, so that I never lose my settings, tasks, or links when I close the tab.

#### Acceptance Criteria

1. THE Dashboard SHALL use only the Local_Storage API for all data persistence operations, including reads and writes for all three data categories: settings (name, theme, Pomodoro duration, sort order), tasks, and Quick_Links.
2. THE Dashboard SHALL store all data client-side with no network requests to external servers for data storage.
3. WHEN the User makes any change to settings, tasks, or Quick_Links, THE Dashboard SHALL write the updated data to Local_Storage immediately before the next user interaction.
4. WHEN the Dashboard loads, THE Dashboard SHALL retrieve and restore all settings, tasks, and Quick_Links from Local_Storage before rendering any interactive widgets.
5. IF Local_Storage is unavailable or throws an error during any read or write operation, THEN THE Dashboard SHALL display a persistent error message visible to the User until dismissed or the session ends, informing the User that data cannot be saved.

---

### Requirement 14: Performance and Compatibility

**User Story:** As a User, I want the Dashboard to load quickly and work reliably in my preferred modern browser, so that I can rely on it daily.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no external frameworks or libraries.
2. THE Dashboard SHALL be contained within a single HTML file, a single CSS file inside a `css/` directory, and a single JavaScript file inside a `js/` directory.
3. THE Dashboard SHALL be functional in the latest stable versions of Chrome, Firefox, Edge, and Safari, with no layout breakage, all controls operable, and no uncaught JavaScript console errors.
4. WHEN the Dashboard is loaded on a connection of at least 10 Mbps with round-trip latency of 40ms or less, THE Dashboard SHALL render all widgets in a visually complete and interactive state within 2 seconds.
5. WHEN the User interacts with any UI control, THE Dashboard SHALL display a visible UI update reflecting the change within 100 milliseconds.
