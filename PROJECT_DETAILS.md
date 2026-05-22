# GoType - Project Details

## Overview

GoType is a React + Vite typing practice app with live feedback, multiple test modes, persisted settings, typing statistics, and a polished responsive UI.

## Current Status

- App boots and builds successfully.
- Live WPM updates during active typing.
- Custom text entry preserves pasted content.
- The visible red caret square in the text panel has been removed.
- Quote and paragraph pools have been expanded.
- The workspace has been cleaned of stale backup and build output files.

## Tech Stack

- React 18
- Vite 5
- JavaScript ES modules
- Tailwind CSS
- Framer Motion
- lucide-react icons
- Web Audio API for key sounds
- Vitest, jsdom, and Testing Library for tests

## Feature Status

| Area                        | Status | Notes                                           |
| --------------------------- | ------ | ----------------------------------------------- |
| Time mode                   | Done   | 60 second timed typing test                     |
| Words mode                  | Done   | 25, 50, and 100 word sets                       |
| Quote mode                  | Done   | Local and remote quote source with fallback     |
| Custom mode                 | Done   | User text entry supports pasting                |
| Live WPM                    | Done   | Updates while typing, not only after completion |
| Accuracy and progress stats | Done   | Real-time feedback in header cards              |
| Streak tracking             | Done   | Stored in localStorage and shown in sidebar     |
| CSV export                  | Done   | Exports recent results from history             |
| Keyboard shortcuts          | Done   | Restart and sound toggle shortcuts              |
| History and insights        | Done   | Recent results and mistake view                 |
| Leaderboard                 | Done   | Modal-based leaderboard UI                      |
| Sound system                | Done   | Toggle, volume, and per-word error behavior     |
| Welcome tour                | Done   | One-time onboarding flow                        |

## File and Folder Inventory

### Root Files

| Path                                     | Status    | Purpose                       |
| ---------------------------------------- | --------- | ----------------------------- |
| [index.html](index.html)                 | Active    | Vite entry HTML               |
| [package.json](package.json)             | Active    | Scripts and dependencies      |
| [package-lock.json](package-lock.json)   | Active    | Locked dependency tree        |
| [vite.config.js](vite.config.js)         | Active    | Vite config                   |
| [tailwind.config.js](tailwind.config.js) | Active    | Tailwind theme config         |
| [postcss.config.js](postcss.config.js)   | Active    | PostCSS config                |
| [PROJECT_DETAILS.md](PROJECT_DETAILS.md) | Active    | This document                 |
| [dist/](dist)                            | Generated | Build output; not source code |

### `src/`

| Path                           | Status | Purpose                            |
| ------------------------------ | ------ | ---------------------------------- |
| [src/main.jsx](src/main.jsx)   | Active | React entry point                  |
| [src/App.jsx](src/App.jsx)     | Active | Top-level shell and theme state    |
| [src/index.css](src/index.css) | Active | Global styles, theme tokens, fonts |

### `src/components/`

| Path                                                                       | Status | Purpose                              |
| -------------------------------------------------------------------------- | ------ | ------------------------------------ |
| [src/components/AppLogo.jsx](src/components/AppLogo.jsx)                   | Active | Brand mark and title                 |
| [src/components/GoalModeSettings.jsx](src/components/GoalModeSettings.jsx) | Active | Goal WPM controls                    |
| [src/components/HistoryInsights.jsx](src/components/HistoryInsights.jsx)   | Active | Recent results and exports           |
| [src/components/LeaderboardModal.jsx](src/components/LeaderboardModal.jsx) | Active | Leaderboard dialog                   |
| [src/components/ModeSwitcher.jsx](src/components/ModeSwitcher.jsx)         | Active | Test mode controls                   |
| [src/components/ResultScreen.jsx](src/components/ResultScreen.jsx)         | Active | Final test summary                   |
| [src/components/RightSidebar.jsx](src/components/RightSidebar.jsx)         | Active | Best WPM, tip, live WPM, streak      |
| [src/components/SettingsModal.jsx](src/components/SettingsModal.jsx)       | Active | App settings dialog                  |
| [src/components/SoundControls.jsx](src/components/SoundControls.jsx)       | Active | Mute and volume controls             |
| [src/components/Stats.jsx](src/components/Stats.jsx)                       | Active | WPM and accuracy stats cards         |
| [src/components/TextSelector.jsx](src/components/TextSelector.jsx)         | Active | Quote/custom text selector           |
| [src/components/TypingInput.jsx](src/components/TypingInput.jsx)           | Active | Controlled typing input              |
| [src/components/TypingTest.jsx](src/components/TypingTest.jsx)             | Active | Main app orchestration               |
| [src/components/TypingText.jsx](src/components/TypingText.jsx)             | Active | Render and highlight the prompt text |
| [src/components/WelcomeTour.jsx](src/components/WelcomeTour.jsx)           | Active | First-run tour                       |

### `src/constants/`

| Path                                                         | Status | Purpose                           |
| ------------------------------------------------------------ | ------ | --------------------------------- |
| [src/constants/typingModes.js](src/constants/typingModes.js) | Active | Mode constants, tips, and options |

### `src/data/`

| Path                                             | Status | Purpose                              |
| ------------------------------------------------ | ------ | ------------------------------------ |
| [src/data/paragraphs.js](src/data/paragraphs.js) | Active | Paragraph pool and word pool builder |
| [src/data/quotes.js](src/data/quotes.js)         | Active | Quote pool and remote quote fetch    |

### `src/hooks/`

| Path                                                         | Status | Purpose                                 |
| ------------------------------------------------------------ | ------ | --------------------------------------- |
| [src/hooks/useTypingSounds.js](src/hooks/useTypingSounds.js) | Active | Audio playback and volume state         |
| [src/hooks/useTypingTest.js](src/hooks/useTypingTest.js)     | Active | Core typing engine and state management |

### `src/utils/`

| Path                                                                               | Status | Purpose                            |
| ---------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| [src/utils/storage.js](src/utils/storage.js)                                       | Active | localStorage persistence helpers   |
| [src/utils/typingStats.js](src/utils/typingStats.js)                               | Active | WPM, accuracy, and mistake helpers |
| [src/utils/**tests**/storage.test.js](src/utils/__tests__/storage.test.js)         | Active | Storage utility tests              |
| [src/utils/**tests**/typingStats.test.js](src/utils/__tests__/typingStats.test.js) | Active | Typing stat helper tests           |

## Removed or Generated Files

- Generated build artifacts are treated as disposable output.
- Stale backup files should not remain in the source tree.
- Current cleanup includes removing the old `TypingTest.jsx.bak` backup and the `dist/` build output files.

## Behavior Notes

- Live WPM now uses the active typing session instead of waiting for completion.
- Custom mode keeps pasted text intact while still normalizing the text used to start a test.
- The text rendering panel no longer shows the old red caret square.

## Commands

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`

## Testing Notes

- Vitest runs in jsdom mode.
- Storage and typing stat helpers have unit tests.
- The project has already been verified with a successful production build.

## Structure Summary

```text
GoType/
├─ index.html
├─ package.json
├─ package-lock.json
├─ postcss.config.js
├─ PROJECT_DETAILS.md
├─ tailwind.config.js
├─ vite.config.js
├─ dist/
├─ node_modules/
└─ src/
   ├─ App.jsx
   ├─ index.css
   ├─ main.jsx
   ├─ components/
   ├─ constants/
   ├─ data/
   ├─ hooks/
   └─ utils/
```
