# GoType World-Class Redesign Blueprint

## 0. Product Positioning Shift

GoType should feel like a competitive instrument, not a feature dashboard.

Design thesis:

- Typing surface is the stage.
- Competitive state is ambient, not dominant.
- Trust and legitimacy are always visible but never noisy.
- Advanced systems (authority, replay verification, trust scoring) are surfaced as proof, not clutter.

Brand direction:

- Visual voice: precise, technical, confident, editorial.
- Avoid glossy SaaS gradients and card piles.
- Emphasize typography, spacing rhythm, and data legibility.

---

## 1. Complete Design System (Build First)

### 1.1 Foundations

Color system (WCAG AA compliant pairs):

- Ink 1000: #0B0D12 (primary background)
- Ink 900: #11151C (elevated background)
- Ink 700: #2A3140 (hairline/dividers)
- Mist 300: #A8B3C7 (secondary text)
- Mist 100: #DCE3EE (primary text on dark)
- Paper 0: #F8FAFD (light mode background)
- Paper 100: #EEF2F8 (light mode elevated)
- Slate 700: #334155 (light mode primary text)
- Signal Cyan: #22C3EE (active typing/caret)
- Signal Lime: #7ED957 (success, pass)
- Signal Amber: #F5B942 (warning)
- Signal Red: #EE5D5D (fail/error)
- Rank Gold: #E2B23A (elite highlights)

Usage rules:

- One accent per context: typing uses Cyan, progression uses Gold, pass/fail uses Lime/Red.
- No decorative gradients on structural surfaces.
- Borders are 1px hairlines only where needed for separation.

Typography:

- Display and Product UI: Söhne (or fallback: Geist Sans)
- Monospace performance data: JetBrains Mono
- Scale:
  - Display 56/60, 700
  - H1 40/44, 650
  - H2 30/36, 620
  - H3 24/30, 600
  - Body L 18/28, 460
  - Body M 16/24, 460
  - Body S 14/20, 460
  - Label XS 12/16, 560, +0.06em tracking

Spacing:

- 4px base, 8-point rhythm for layout.
- Core spacing scale: 4, 8, 12, 16, 24, 32, 40, 56, 72, 96.
- Max content width desktop: 1280.
- Primary reading/typing column: 760 to 860.

Radius:

- Control: 10
- Panel: 14
- Overlay: 18
- Never exceed 20 except full pills.

Shadows:

- Minimal depth model:
  - Elevation 1: 0 1px 2px rgba(0,0,0,0.20)
  - Elevation 2: 0 8px 24px rgba(0,0,0,0.28)
- No glow shadows for normal components.

Grid:

- Desktop: 12 cols, 80 max width columns, 24 gutter.
- Tablet: 8 cols, 20 gutter.
- Mobile: 4 cols, 16 gutter.

### 1.2 Interaction Tokens

Motion primitives:

- Fast: 120ms, standard ease.
- Base: 180ms, cubic-bezier(0.2, 0.8, 0.2, 1).
- Emphasis: 260ms, cubic-bezier(0.16, 1, 0.3, 1).
- Reduced motion: remove scale and parallax; keep opacity and position only.

Focus states:

- 2px outline in Signal Cyan.
- 2px offset from component bounds.
- Visible on all keyboard-focusable controls.

State semantics:

- Passive: text + subtle background shift.
- Hover: one-step elevation OR text tint, not both.
- Active: pressed translation 1px max.
- Disabled: 40% contrast reduction and no shadow.

### 1.3 Component System

Core components:

- App Shell
- Top Command Bar
- Mode Rail
- Typing Canvas
- Live Stat Strip
- Competitive Side Rail
- Drawer (mobile)
- Sheet (tablet)
- Modal (desktop centered)
- Data List
- Segmented Control
- Performance Sparkline
- Trust Badge Cluster
- Replay Timeline
- Spectator Feed Row

Component behavior standards:

- Buttons:
  - Heights: 32, 40, 48.
  - Label-first, icon optional.
  - Max 2 visual styles per screen.
- Inputs:
  - Single-line dense format with explicit labels.
  - Inline validation text appears under input, not toast.
- Cards:
  - Only used for grouped content requiring scan boundaries.
  - Default to borderless sections with whitespace first.
- Modals:
  - No nested modals.
  - Escape closes, focus trap required, return focus to trigger.

### 1.4 Content Hierarchy Rules

- One primary action per screen state.
- Max three simultaneous emphasized metrics.
- Advanced analytics behind progressive disclosure.
- Replay/integrity info appears as confidence evidence bars, not technical dumps.

### 1.5 Accessibility Standards (WCAG AA)

- Contrast:
  - Normal text 4.5:1 minimum.
  - Large text 3:1 minimum.
- Keyboard:
  - Full app navigable by keyboard.
  - Logical tab order by visual flow.
- Screen reader:
  - Live WPM and accuracy announced using polite live region with throttling (every 3 seconds).
  - Error summaries announced once, not per keystroke.
- Targets:
  - Minimum interactive area 44x44 on touch.
- Motion:
  - Respect prefers-reduced-motion globally.
- Color independence:
  - Success/failure never indicated by color alone; include icon and text.

---

## 2. Screen Redesigns

## Screen 1: Main Typing Workspace (Core Session)

Current UX problems:

- Too many competing UI blocks around the typing area.
- Decorative glass treatment reduces focus and trust.
- Competitive data and utility controls have equal visual weight.

User attention map:

1. Typing line and caret
2. WPM and accuracy strip
3. Mode context and timer goal
4. Secondary tools

New information architecture:

- Primary zone: typing canvas (centered, dominant).
- Secondary zone: compact live stat strip above canvas.
- Tertiary zone: command bar (top), side rail collapsed by default.

Wireframe layout:

- Desktop
  - Top: command bar + mode rail
  - Center: stat strip
  - Center large: typing canvas
  - Right narrow: collapsible competitive rail
- Tablet
  - Top command bar
  - Mode rail scrollable horizontal
  - Typing canvas full width
  - Competitive rail as right sheet toggle
- Mobile
  - Top compact controls
  - Stat strip
  - Typing canvas
  - Bottom sticky action row (restart, mode, compete)

Component specifications:

- Typing canvas width 760 desktop, 100% mobile.
- Line length target 55 to 70 characters.
- Caret thickness 2px with cyan pulse at 1.2s interval.
- Stat strip: WPM, Accuracy, Time only.

Desktop design:

- Large centered canvas with generous vertical breathing room.
- Right rail collapsed to icon tabs unless expanded.

Tablet design:

- Remove right rail permanently; move to slide-over sheet.

Mobile design:

- One-screen typing priority.
- Side features accessed via bottom sheet.

Accessibility considerations:

- High-contrast caret and current word highlight.
- Optional dyslexia-friendly spacing mode.

Motion guidelines:

- On test start: subtle upward fade for peripheral controls.
- On finish: stats lock with 180ms opacity transition.

Before/after rationale:

- Before: dashboard behavior.
- After: instrument behavior where typing is unmistakably central.

---

## Screen 2: Mode Selection and Session Setup

Current UX problems:

- Mode controls are fragmented and cognitively heavy.
- Inputs and selectors have inconsistent visual hierarchy.

User attention map:

1. Current mode label
2. Critical parameters (time/words/goal)
3. Start state

New information architecture:

- Single horizontal mode rail.
- Contextual parameter row appears below active mode only.

Wireframe layout:

- Desktop: rail + inline parameter chips.
- Tablet: rail wraps into two rows.
- Mobile: segmented control + bottom sheet parameter editor.

Component specifications:

- Segments min 88 width desktop, full-width equal on mobile.
- Parameter chips use inline edit with numeric stepper.

Desktop design:

- Editorial tab rail with clear active underline.

Tablet design:

- Two-line compact mode rail preserving touch targets.

Mobile design:

- Three primary modes visible; More opens sheet.

Accessibility considerations:

- Arrow-key navigation in segmented controls.
- Labels and helper text linked via aria-describedby.

Motion guidelines:

- Parameter row cross-fade between mode changes.

Before/after rationale:

- Before: every mode feels equally exposed.
- After: progressive disclosure lowers setup friction.

---

## Screen 3: Competitive Side Rail (Streak, Goal, Daily, Best)

Current UX problems:

- Many mini-cards with repetitive borders and gradients.
- Low-value tips displace high-value competitive status.

User attention map:

1. Daily competitive status
2. Ranked eligibility and trust
3. Streak summary

New information architecture:

- Group into three stacks:
  - Compete today
  - Account standing
  - History pulse

Wireframe layout:

- Desktop: slim 280 rail, collapsible.
- Tablet/mobile: single drawer with grouped sections.

Component specifications:

- Replace cards with section dividers and typography hierarchy.
- One sparkline max in rail.

Desktop design:

- Rail uses text-led design, minimal chrome.

Tablet design:

- Drawer over content with persistent close affordance.

Mobile design:

- Bottom sheet with snap points (40%, 80%).

Accessibility considerations:

- Drawer focus trap and restore focus.
- Live values have clear labels and units.

Motion guidelines:

- Rail open/close via 220ms slide; no bounce.

Before/after rationale:

- Before: ornamental cards and busy gradients.
- After: concise competitive status with stronger legitimacy cues.

---

## Screen 4: Challenge Arena Entry and Active Run

Current UX problems:

- Challenge context and constraints are not prioritized cleanly.
- Success/fail overlays are emotionally loud and visually inconsistent.

User attention map:

1. Challenge objective
2. Remaining attempts
3. Active run progress

New information architecture:

- Pre-run briefing panel with three lines:
  - Objective
  - Constraints
  - Reward
- In-run HUD only shows objective progress and fail conditions.

Wireframe layout:

- Desktop: center briefing modal, then inline HUD over typing canvas.
- Tablet/mobile: full-width challenge sheet before start.

Component specifications:

- Constraint tokens: no-backspace, min WPM, min accuracy.
- Attempts shown as 3-step indicator with labels.

Desktop design:

- High-contrast challenge header, no celebratory clutter.

Tablet design:

- Split objective and reward into collapsible rows.

Mobile design:

- One-thumb entry flow with sticky Start Challenge.

Accessibility considerations:

- Objective text always visible in-run.
- Fail reason announced in plain text and icon.

Motion guidelines:

- Start transition: briefing fades into HUD with continuity of title.

Before/after rationale:

- Before: arena feels bolted on.
- After: arena feels like a premium competitive mode with clear stakes.

---

## Screen 5: Results Overview (Post-Run)

Current UX problems:

- Too many analytics modules at once.
- Visual graph density reduces immediate comprehension.

User attention map:

1. Final score cluster (WPM, Accuracy, rank outcome)
2. Delta vs previous run
3. Next action

New information architecture:

- Tier 1: Outcome hero row.
- Tier 2: Trend snapshot.
- Tier 3: Expandable deep analysis sections.

Wireframe layout:

- Desktop: two-column; left outcome/trend, right progression.
- Tablet: stacked with sticky action row.
- Mobile: single stream with collapsed sections.

Component specifications:

- Outcome hero contains exactly 3 primary metrics.
- Advanced modules collapsed by default.

Desktop design:

- Strong typographic hierarchy, minimal chart decoration.

Tablet design:

- Trend chart simplified to one line + toggle.

Mobile design:

- Replace complex chart interactions with segmented mini-tabs.

Accessibility considerations:

- Tables available as text alternative to charts.
- Tooltips keyboard-triggerable.

Motion guidelines:

- Results reveal in stagger: hero 120ms, trend 180ms, details 240ms.

Before/after rationale:

- Before: results as analytics dump.
- After: results as performance narrative.

---

## Screen 6: Replay Visualization

Current UX problems:

- Replay metadata and controls feel technical and fragmented.
- Timeline legibility is weak on smaller widths.

User attention map:

1. Timeline scrubber
2. Key events
3. Verification status

New information architecture:

- Top: trust and verification badge cluster.
- Middle: timeline and ghost comparison.
- Bottom: event table (optional expand).

Wireframe layout:

- Desktop: timeline + side event details.
- Tablet/mobile: timeline full width, details drawer.

Component specifications:

- Timeline ticks every 5 seconds.
- Event density scales by zoom level.

Desktop design:

- Remove panel chrome; keep sharp technical aesthetic.

Tablet design:

- Horizontal pan with snap anchors.

Mobile design:

- Single scrubber and critical event markers only.

Accessibility considerations:

- Replay controls fully keyboard operable.
- Event list readable without timeline graphics.

Motion guidelines:

- Scrub updates use no easing delay for precision.

Before/after rationale:

- Before: replay appears as optional complex widget.
- After: replay becomes a trustworthy competitive audit tool.

---

## Screen 7: Spectator View

Current UX problems:

- Spectator data hierarchy is unclear.
- Too much parity with player-facing controls.

User attention map:

1. Current racer status
2. Relative position changes
3. Verified integrity indicators

New information architecture:

- Main race strip with participant lanes.
- Secondary event feed.
- Tertiary controls hidden under settings icon.

Wireframe layout:

- Desktop: lane canvas + right event feed.
- Tablet/mobile: stacked lanes with compact feed.

Component specifications:

- Lane rows: avatar, WPM, accuracy, status icon.
- Delta arrows for overtakes.

Desktop design:

- Broadcast-style clarity, high temporal readability.

Tablet design:

- Reduce lane metadata to key values.

Mobile design:

- Focus on top 3 racers + user-selected pin.

Accessibility considerations:

- Live updates announced in summary form.
- Color + shape encoding for status.

Motion guidelines:

- Position shifts animate with 150ms transform; no continuous pulsing.

Before/after rationale:

- Before: spectator panel looks like a side utility.
- After: spectator mode feels event-grade and legible.

---

## Screen 8: Leaderboard

Current UX problems:

- Modal feels generic and detached from competitive trust context.
- Filtering depth competes with scanability.

User attention map:

1. Rank and score legitimacy
2. Filters
3. Player context row

New information architecture:

- Sticky header: season, mode, trust criteria.
- Main list with compact row density.
- Expand row for replay/proof details.

Wireframe layout:

- Desktop modal large (960).
- Tablet full-height sheet.
- Mobile full-screen with sticky filter bar.

Component specifications:

- Row height 56 desktop, 64 mobile.
- Columns: rank, player, WPM, accuracy, trust, replay.

Desktop design:

- Dense and readable, minimal column separators.

Tablet design:

- Collapse lesser columns into row subtext.

Mobile design:

- Two-column core metrics plus expandable details.

Accessibility considerations:

- Sort controls keyboard and SR labeled.
- Rank deltas include text labels.

Motion guidelines:

- Sort transition uses crossfade and maintain scroll anchor.

Before/after rationale:

- Before: leaderboard is a generic modal.
- After: leaderboard communicates rigor and competitive legitimacy.

---

## Screen 9: Badge Gallery and Certification

Current UX problems:

- Badge visuals can overpower utility and progression understanding.
- Unlock criteria not surfaced with enough clarity.

User attention map:

1. Current tier and nearest unlock
2. Badge family progression
3. Certification legitimacy

New information architecture:

- Hero: current badge identity.
- Family progress tracks.
- Locked badge criteria in expandable rows.

Wireframe layout:

- Desktop: left progress nav, right family detail.
- Tablet/mobile: accordion families.

Component specifications:

- Badge size standardized by context (40 list, 64 detail).
- Lock criteria in plain language sentence format.

Desktop design:

- Typography-first with restrained icon color.

Tablet design:

- Reduce visual density with accordion groups.

Mobile design:

- Focus on nearest next achievement only.

Accessibility considerations:

- Badge icons have descriptive alt labels.
- Progress represented numerically and visually.

Motion guidelines:

- Family switch uses horizontal slide (180ms).

Before/after rationale:

- Before: badge view emphasizes decoration.
- After: badge view emphasizes progression clarity and motivation.

---

## Screen 10: Settings and Preferences

Current UX problems:

- Settings mixed in modal with limited hierarchy.
- Advanced options may appear without context.

User attention map:

1. Typing comfort controls
2. Audio and visual accessibility
3. Competitive/privacy controls

New information architecture:

- Categories:
  - Typing Experience
  - Accessibility
  - Competition and Privacy
  - Data and Export

Wireframe layout:

- Desktop: left nav + right panel.
- Tablet/mobile: segmented category header + stacked groups.

Component specifications:

- Every setting includes label, effect hint, default state.
- Risky actions isolated at bottom with confirmation.

Desktop design:

- Quiet utility panel, no heavy cards.

Tablet design:

- Full-height sheet with sticky save/apply footer only if needed.

Mobile design:

- Large touch targets and grouped toggles.

Accessibility considerations:

- Controls have explicit programmatic labels.
- No setting relies solely on iconography.

Motion guidelines:

- Category switch simple fade/slide at 140ms.

Before/after rationale:

- Before: utility modal.
- After: robust control center with clear mental model.

---

## Screen 11: History and Insights

Current UX problems:

- Insight density can overwhelm non-expert users.
- Export and filtering may not be aligned to key tasks.

User attention map:

1. Last 7 day trajectory
2. Personal best and consistency
3. Export/share actions

New information architecture:

- Summary row.
- Trend block.
- Session table.
- Advanced analytics collapsed.

Wireframe layout:

- Desktop: split summary and table.
- Tablet/mobile: vertical stream with sticky filters.

Component specifications:

- Session rows prioritize date, mode, WPM, accuracy.
- Secondary fields appear on expand.

Desktop design:

- Data-table discipline with subdued separators.

Tablet design:

- Cardless list with row dividers.

Mobile design:

- Tappable summary rows expanding inline.

Accessibility considerations:

- Table has proper header associations.
- Chart alternatives available in list format.

Motion guidelines:

- Row expand/collapse at 160ms height transition.

Before/after rationale:

- Before: analytics-first complexity.
- After: progress-first clarity with optional depth.

---

## Screen 12: Onboarding and Welcome Tour

Current UX problems:

- Tour may interrupt flow and over-explain.
- Spotlights can feel disconnected from actual user intent.

User attention map:

1. Start typing quickly
2. Understand one core loop
3. Learn where to compete

New information architecture:

- 3-step progressive onboarding:
  - First run typing
  - First competitive challenge
  - First result interpretation

Wireframe layout:

- Desktop/tablet/mobile: anchored coach marks with skip always visible.

Component specifications:

- Max 120 characters per step.
- One CTA per step.

Desktop design:

- Minimal overlays with soft dim only around target.

Tablet design:

- Bottom-aligned instruction sheets.

Mobile design:

- Full-width anchored tooltips avoiding thumb occlusion.

Accessibility considerations:

- Tour can be fully keyboard controlled.
- Persistent “replay tutorial” in settings.

Motion guidelines:

- Step transitions 140ms fade; no zoom effects.

Before/after rationale:

- Before: feature walkthrough.
- After: behavior activation and faster time-to-value.

---

## 3. Cross-Screen Responsive Strategy

Desktop (>=1200):

- Typing canvas centered with optional side rail.
- Deep analytics available but collapsed by default.

Tablet (768-1199):

- Single-column main flow.
- Right-rail content converted to sheets/drawers.

Mobile (<768):

- Typing-first stack.
- Bottom sheet for non-core controls.
- Full-screen overlays for leaderboard/settings.

---

## 4. Trust and Competitive Identity Layer

Expose system rigor in a compact trust cluster:

- Verified Replay
- Authority Controlled Session
- Integrity Score
- Ranked Eligible

Placement rules:

- Visible on result, replay, leaderboard rows.
- Subtle visibility during active typing (icon + tooltip), never dominant.

Outcome:

- Higher perceived fairness and legitimacy without visual overload.

---

## 5. Product Polish Checklist

Polish criteria:

- Remove at least 40% visible borders and cards.
- Keep no more than 3 emphasized colors per screen.
- Ensure one dominant visual action per state.
- Standardize all spacing to the system scale.
- Ensure all overlays support escape, close button, backdrop click, and focus restoration.
- Enforce reduced-motion alternatives.

---

## 6. Implementation Order (Design to Build)

1. Foundations and tokens (color, type, spacing, motion).
2. Shell and typing canvas.
3. Mode rail and stat strip.
4. Side rail and mobile drawers.
5. Challenge arena flow.
6. Results and trend architecture.
7. Replay and spectator.
8. Leaderboard and badges.
9. Settings and onboarding.
10. Accessibility audit and responsiveness QA.

This order ensures visual consistency first, then interaction clarity, then deep feature polish.
