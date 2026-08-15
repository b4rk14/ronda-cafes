# Repository Guidelines

## Project Overview

Café & Desayunos is a lightweight static PWA for managing shared coffee and breakfast payments between groups.

The application is intentionally simple:

- Vanilla HTML, CSS, and JavaScript.
- No framework.
- No package manager.
- No build step.
- Hosted with GitHub Pages.
- Google Apps Script and Google Sheets are currently used as the backend.
- `DataService` isolates the frontend from the persistence implementation so the backend can be replaced in the future.

Prioritize simplicity, performance, reliability, and maintainability over architectural complexity.

## Project Structure

Keep the application root flat unless a structural change is explicitly requested.

- `index.html` provides the page shell and loads the scripts.
- `style.css` contains responsive layout, cards, buttons, and modal styles.
- `app.js` owns UI state, rendering, modal flows, group selection, and payment actions.
- `dataService.js` is the persistence boundary between the frontend and the current backend.
- `README.md` contains the product summary and project documentation.
- `AGENTS.md` contains instructions for coding agents.

Do not reorganize files or introduce new directories without a clear maintenance benefit.

## Architecture Rules

### DataService boundary

Treat `dataService.js` as the persistence abstraction layer.

Frontend code in `app.js` should not depend directly on Google Sheets or Apps Script implementation details when those operations can go through `DataService`.

Prefer calls such as:

- `DataService.getGroups()`
- `DataService.getPayments()`
- `DataService.addPayment()`
- `DataService.deletePayment()`
- `DataService.createGroup()`

Do not bypass `DataService` with new direct `fetch()` calls from `app.js` unless explicitly requested.

Keep the `DataService` public contract stable whenever possible.

### Backend compatibility

Google Apps Script and Google Sheets are the current backend, but they may be replaced in the future.

Therefore:

- Keep persistence-specific logic inside `dataService.js` or Apps Script.
- Do not couple UI logic to spreadsheet names, row numbers, or sheet structure.
- Do not change existing Apps Script payload formats as a side effect of unrelated work.
- Preserve compatibility with the deployed Apps Script unless a backend migration is explicitly requested.
- When changing persistence, consider existing data and backward compatibility.

### GitHub Pages compatibility

The application must continue to work as a static GitHub Pages site.

Do not introduce:

- server-side runtime dependencies,
- Node.js requirements for production,
- build systems,
- frameworks,
- bundlers,
- or dependencies requiring a server

unless explicitly requested and justified.

## Change Scope

Make changes as small and localized as reasonably possible.

Do not refactor unrelated code.

Do not rewrite working functions merely to make them stylistically different.

Preserve the existing UI and behavior unless the task explicitly requires a change.

Before modifying several files or changing persistence/synchronization logic:

1. Inspect the relevant existing implementation.
2. Briefly explain the intended changes.
3. Identify any meaningful compatibility or data risks.
4. Apply the minimum necessary changes.

If a probable bug is discovered outside the requested scope, explain it instead of silently fixing it.

## Coding Style

Follow the existing project style.

JavaScript:

- Two-space indentation.
- Semicolons.
- Double-quoted strings.
- `camelCase` for variables and functions.
- `UPPER_SNAKE_CASE` for configuration constants such as `API_URL`.
- Prefer clear, small functions over unnecessary abstraction.
- Avoid new dependencies unless they provide a clear benefit.

CSS:

- Use kebab-case class names.
- Preserve the existing visual language and responsive behavior.
- Avoid unnecessary redesigns.
- Mobile behavior must remain a first-class consideration.

HTML:

- Keep markup simple and semantic.
- Preserve accessibility attributes where present.
- Do not add unnecessary wrappers or structural complexity.

## Performance

This PWA should remain lightweight and responsive, especially on mobile devices.

When changing networking or synchronization:

- Avoid unnecessary requests.
- Avoid blocking the UI while waiting for Google Apps Script.
- Preserve optimistic UI behavior when already present and correct.
- Do not introduce polling unless explicitly justified.
- Avoid duplicate requests caused by rendering or modal interactions.

Do not trade significant complexity for negligible performance improvements.

## Groups and Payments

Groups and payments are separate domain concepts.

A group should be identified internally by a stable ID rather than by its display name.

The UI must display the group's human-readable name, never its internal ID unless explicitly intended for debugging.

When changing group persistence, do not modify payment behavior unless explicitly requested.

When changing payment persistence, ensure that:

- registration still works,
- deletion still works,
- counters remain correct,
- history ordering remains correct,
- rapid register/delete interactions do not resurrect stale records.

## Local Storage

`localStorage` may be used as a cache or fallback, but it should not become the long-term source of truth for shared data when a backend representation exists.

When changing keys or stored structures:

- preserve compatibility where practical,
- validate stored data before using it,
- handle deleted or unknown groups safely.

Do not clear unrelated `localStorage` data.

## Development and Manual Testing

There is currently no build step or automated test suite.

Use the VS Code Live Server extension for local testing.

The expected local URL is typically similar to:

```text
http://127.0.0.1:5500/
```

Do not assume Python, Node.js, `npm`, or `npx` are installed.

Before considering a change complete, manually test the affected behavior.

For general application changes, relevant checks include:

- initial application load,
- Google Sheets data loading,
- group selection,
- switching repeatedly between groups,
- group creation,
- page reload with the selected group preserved,
- payment registration,
- payment deletion,
- history ordering,
- mobile/responsive layout,
- local fallback behavior when persistence is involved.

For changes limited to one area, test that area plus any directly related regression risk.

Before committing, run:

```powershell
git diff --check
git status --short
```

When useful, also inspect:

```powershell
git diff
```

## Git Safety

Assume the repository may contain local changes.

Before operations that could affect existing work, inspect the repository state.

Safe read-only commands may be run when useful, for example:

```powershell
git status
git diff
git log
git branch
git remote -v
```

Do NOT perform any of the following unless the user explicitly requests it:

- `git commit`
- `git push`
- `git tag`
- `git merge`
- `git rebase`
- `git reset`
- `git restore .`
- `git clean`
- branch deletion
- force push
- history rewriting

Never discard local changes without explicit approval.

Do not automatically create commits or tags after completing a task.

At the end of a completed change, propose a concise commit message instead.

## Commit Guidelines

Keep commits focused and descriptive.

Prefer short imperative messages, optionally using Conventional Commit prefixes.

Examples:

```text
feat: add local group creation flow
fix: display group name instead of group id during switch
feat: sync groups with Google Sheets
refactor: introduce DataService abstraction
```

One logical change should normally correspond to one commit.

For non-trivial work, prefer a feature branch when appropriate, but do not create one unless requested.

## Apps Script and Google Sheets

Changes to Apps Script or spreadsheet structure are higher-risk because they affect shared persistent data.

Before modifying them:

1. Explain the proposed schema or API change.
2. Identify compatibility implications.
3. Preserve existing data.
4. Prefer additive changes over destructive migrations.
5. Make migrations idempotent whenever practical.
6. Do not delete sheets, rows, groups, or historical records without explicit approval.

When adding new backend capabilities, preserve compatibility with the currently deployed frontend whenever practical.

Do not assume a new Apps Script deployment has occurred merely because source code was changed.

## Destructive Operations

Any operation that deletes or irreversibly modifies shared data requires explicit user approval.

This includes:

- deleting groups,
- deleting Google Sheets tabs,
- deleting payment history in bulk,
- migrations that rewrite existing data,
- clearing storage,
- force-resetting Git state.

Prefer soft-delete/archive strategies when future recovery could reasonably matter, but do not introduce them unless they fit the requested feature.

## Dependency Policy

Avoid new dependencies by default.

Before adding one, consider whether the same result can be achieved clearly with existing browser APIs or the current codebase.

Do not introduce frameworks or libraries solely to reduce a small amount of vanilla JavaScript.

## Completion Criteria

A task is complete when:

1. The requested behavior is implemented.
2. Unrelated behavior remains unchanged.
3. Relevant manual checks have been performed or clearly listed for the user.
4. `git diff --check` passes when applicable.
5. Modified files are clearly identified.
6. Any unresolved limitation or backend deployment requirement is stated.
7. A concise commit message is proposed.

Do not commit, tag, push, deploy Apps Script, or publish a release unless explicitly requested.
