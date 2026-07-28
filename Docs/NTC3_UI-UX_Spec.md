# N-Tech C³ UI/UX Specification

Status: Binding visual specification; remaining product decisions noted explicitly  
Version: 0.2  
Date: 2026-07-28  
Scope: Desktop-first V1 experience  
Authority: Governing source for information architecture, interaction behavior, visual language, accessibility, and screen composition

## 0. Binding visual references and precedence

The following repository-root images are approved source material:

1. `wireframe.png` — binding source for the landing/Home screen composition, region order, navigation labels, visible actions, density, hierarchy, and desktop proportions.
2. `branding-brief.png` — binding source for brand identity, logo treatment, brand pillars, platform voice, colors, typography, spacing, radius, shadows, icon style, motion, tags, and component appearance.

Precedence for UI decisions:

1. The two approved images.
2. This written specification, as reconciled to those images.
3. Earlier product descriptions.
4. Current implementation.

Where the images overlap, `wireframe.png` governs landing-screen layout and `branding-brief.png` governs the visual system. Neither image is merely inspirational.

The images remain unchanged and must be reviewed alongside implementation. They are reference composites, not runtime background images: production UI must be constructed from accessible components and separately exported approved brand assets.

## 1. Purpose

This specification converts the product vision in `NTC3.txt` and `NTC3_spec-doc.txt` into a testable interface contract.

It governs:

- what users can see and do on each screen
- how modules relate to one another
- how capture, search, linking, editing, and recovery behave
- visual tokens and component behavior
- keyboard, accessibility, responsive, loading, empty, error, and destructive states
- the boundary between shipped behavior and future interface concepts

When this specification conflicts with an older visual description, this document governs UI/UX. `N-TC3_index.md` continues to govern implementation status and repository truth.

## 2. Product experience thesis

N-Tech C³ is an engineering intelligence workspace, not a generic CMS and not a monitoring console.

The interface must help one person repeatedly complete this loop:

1. Capture something true about engineering work.
2. Link it to a project, story, campaign, or knowledge page.
3. Understand what is complete, missing, or changing.
4. Turn accumulated evidence into a reusable output.
5. Preserve the result locally and portably.

The emotional target is a quiet, trustworthy engineering desk: dense enough to be useful, calm enough to remain open all day, and explicit enough that the user never wonders whether work was saved.

## 3. Experience principles

### 3.1 Evidence first

Evidence is a first-class object in navigation, capture, search, project history, and authoring. It must not feel like an attachment buried inside another entity.

### 3.2 Capture in two decisions

Common capture must require no more than two meaningful decisions after invocation:

- identify or accept the inferred type
- confirm the destination or save

Typing content is not counted as a decision. Optional metadata must never block capture.

### 3.3 Keyboard first, pointer complete

Every primary action must be available with a pointer. Repeated workflows must also have discoverable keyboard access.

### 3.4 Local state is visible

The interface must clearly distinguish:

- saved locally
- saving
- unsaved
- failed
- exported
- backed up
- unavailable outside the desktop runtime

The product must not imply cloud synchronization.

### 3.5 Progressive disclosure

List screens optimize for scanning. Detail screens reveal relationships and history. Advanced metadata stays behind a secondary panel, disclosure, or explicit edit mode.

### 3.6 Operational truth within the approved presentation

Every displayed metric or status in the approved layouts must come from real state. The wireframe’s workspace counts, recent activity, totals, focus items, progress, and version label define presentation, not hard-coded values.

### 3.7 Everything has a next action

Empty states, errors, health warnings, and incomplete records must offer a clear recovery or progression action.

### 3.8 Calm density

Use hierarchy, grouping, and whitespace before borders, glow, animation, or uppercase labels. Technical character comes from precision, not visual noise.

## 4. Primary user and contexts

### Primary user

An engineer or technical founder working alone across several repositories, projects, stories, and content outputs.

### Primary contexts

- capturing a fleeting terminal result or artifact
- reviewing recent work at the start of a session
- writing or refining a technical story
- investigating evidence for a project or claim
- comparing repository state over time
- finding an object without remembering its module
- exporting or safeguarding the local vault

### Assumed environment

- desktop or large tablet viewport
- keyboard and pointing device available
- local Electron runtime is the complete experience
- browser mode is a development/preview experience and must label unavailable native actions

## 5. Information architecture

### 5.1 Canonical object model

The landing wireframe establishes a flat, stable primary navigation and a separate Quick Capture group. Do not regroup or reorder visible items unless a later approved visual replaces the wireframe.

### 5.2 Canonical navigation

Desktop sidebar order and labels:

1. Home
2. Workspaces
3. Stories
4. Campaigns
5. Knowledge Base
6. Evidence Vault
7. Calendar
8. Assets
9. Templates
10. Exports
11. Settings

Rules:

- Quick Capture is a persistent labelled sidebar group beneath primary navigation.
- Its visible actions are Screenshot, Terminal Output, Code Snippet, Voice Note, Import File, and New Quick Note.
- Global search lives in the top application bar and is invokable from `Cmd/Ctrl+K`, following the approved brand dashboard example.
- Settings remains in the primary navigation sequence shown in the wireframe.
- Calendar and Exports must be implemented before claiming wireframe-complete status; their current absence is an implementation gap, not permission to remove them from the target.

### 5.3 Route hierarchy

```text
/home
/workspaces
  /workspaces/:id
/stories
  /stories/:id
/campaigns
  /campaigns/:id
/evidence
  /evidence/:id        future canonical detail URL
/knowledge
  /knowledge/:id
/assets
/templates
/settings
```

The existing `/dashboard` and `/projects` routes may remain compatibility aliases during migration. User-facing labels are Home and Workspaces.

Terminology decision: Workspace is the approved user-facing container shown in the wireframe. During migration it may be backed by the current `Project` entity, but UI copy must say Workspace. A later data-model decision may separate Workspace and Project if required.

Modal previews may be used from a list, but every durable entity should ultimately have a copyable canonical route.

### 5.4 Global shell

The shell contains:

- a 56 px top application bar spanning the window
- N-Tech C³ cube mark and wordmark at top-left
- notification, help, settings, avatar, account name, and account menu controls at top-right
- native window controls at the far right where custom chrome is supported
- a fixed left sidebar below the top bar
- primary navigation followed by the Quick Capture group
- version and local-state indicator at the sidebar foot
- a rounded main workspace surface with the approved blue-black glass treatment

The top bar and sidebar use Brand Background. The workspace and cards use the approved dark surface scale. Electric Intelligence Blue appears on active navigation, focus, repository actions, and principal calls to action.

## 6. Core journeys

### 6.1 Quick evidence capture

Entry points:

- Quick Capture sidebar group
- `Cmd/Ctrl+/`
- paste outside an editable field
- file drop on Evidence

Flow:

1. Invoke capture.
2. System infers type and pre-populates content where possible.
3. Focus moves to title if empty; otherwise to primary confirmation.
4. User may optionally link Project or Story.
5. User confirms.
6. Dialog closes only after persistence succeeds.
7. A non-blocking success message includes `View evidence`.

Failure:

- dialog remains open
- entered content remains intact
- error explains whether the failure is validation, local API, or file ingestion
- retry is available

### 6.2 Find and resume work

1. Invoke Search with `Cmd/Ctrl+K` or the top application bar.
2. Type at least two characters.
3. Results update after a 150–250 ms debounce.
4. Use arrow keys to move and Enter to open.
5. Filters may narrow results without clearing the query.
6. Escape clears filters first, then query, then exits search.

### 6.3 Write a story

1. Create from Stories or Quick Create.
2. Arrive on the Story detail screen.
3. Title receives focus.
4. Editor autosaves after an idle interval and supports explicit `Cmd/Ctrl+S`.
5. Save state remains visible near the title.
6. Properties and related evidence remain accessible without leaving the story.
7. Health guidance explains missing evidence, references, assets, or metadata.

### 6.4 Capture a repository snapshot

1. Open a Project.
2. Select `Capture repository snapshot`.
3. Choose a local repository.
4. Show progress with the selected repository name and cancellable analysis state.
5. Present a review summary before persistence when meaningful warnings exist.
6. Save as project-linked Repository Audit evidence.
7. Update the snapshot timeline and show the delta from the previous snapshot.

### 6.5 Safeguard the vault

1. Open Settings → Vault & Data.
2. Choose Export, Back Up, or Restore.
3. Show exactly what will be produced or replaced.
4. Native file dialog selects the destination/source.
5. Completion state includes the path and a reveal action.
6. Restore requires an explicit confirmation after archive validation.
7. Restore success identifies the retained recovery copy.

## 7. Layout system

### 7.1 Viewport classes

The product is desktop-first but must remain functional at smaller widths.

| Class | Width | Behavior |
| --- | ---: | --- |
| Compact | 720–899 px | Sidebar becomes a labelled drawer; single-column content; sticky mobile header |
| Standard | 900–1439 px | 240 px sidebar; content width up to 1120 px |
| Wide | 1440–1919 px | 256 px sidebar; content width up to 1280 px |
| Ultra-wide | 1920 px+ | Sidebar remains fixed; content capped at 1440 px; optional inspector panels |

Below 720 px is unsupported for production authoring. The interface must show a usable read/capture mode rather than silently hiding navigation.

### 7.2 Content frame

- Page padding: 24 px Standard, 32 px Wide, 16 px Compact.
- Maximum reading width: 760 px.
- Maximum list/dashboard width: 1280 px.
- Page section gap: 24 px.
- Card grid gap: 16 px or 24 px, never mixed within one grid.
- Sticky page actions are allowed only when the primary action would otherwise scroll out of reach.

### 7.3 Page header

Every primary route uses:

- optional breadcrumb
- H1
- one-sentence purpose
- primary action aligned right
- secondary actions in an overflow menu

The H1 is sentence case. Uppercase is reserved for compact metadata labels, not user-facing titles.

### 7.4 Detail workspace

Story and Knowledge detail use:

- center authoring canvas
- right properties/relationships inspector at 1200 px+
- collapsible inspector drawer below 1200 px
- breadcrumb and save state above the canvas

Project detail uses a two-column analytical layout at 1200 px+ and a single timeline below.

## 8. Visual design system

### 8.0 Brand identity

Approved name treatment: `N-Tech C³`.

Approved descriptor: `ENGINEERING INTELLIGENCE OPERATING SYSTEM`.

Approved promise: `Capture reality. Organize knowledge. Produce evidence. Create influence.`

Approved brand essence:

> N-Tech C³ is the Engineering Intelligence Operating System for NaniTech. It transforms engineering work into structured, evidence-backed knowledge that drives influence and impact.

Brand pillars:

1. Evidence First — We believe in proof over assumption.
2. Knowledge Driven — Organize information into lasting insight.
3. Precision — Every detail matters. Clarity is our standard.
4. Engineering Excellence — Built with quality, for quality.
5. Local First — Your data. Your control. Always.

The dimensional blue N/cube mark, `N-Tech C³` lockup, and NaniTech parent-brand lockup must be exported from approved source artwork before implementation. Do not substitute improvised text boxes, emoji, or a generic cube icon.

Visual language:

- glass panels
- blueprint grids
- technical illustrations
- clean and minimal composition
- developer-first detail

Reference sensibilities named by the guide are VS Code, Linear, Raycast, Obsidian, and Arc. These references never override the explicit wireframe or tokens.

### 8.1 Theme

The approved guide defines both dark and light palettes. The wireframe establishes dark mode as the default and launch presentation. Light mode may be implemented later, but it must use the approved light tokens below rather than calculated inversions.

### 8.2 Color tokens

#### Brand and semantic colors

| Token | Approved value | Use |
| --- | --- | --- |
| Primary / Electric Intelligence Blue | `#2F80FF` | Primary actions, selected navigation, repository semantics |
| Secondary / Cyan | `#27C2FF` | Secondary technical highlight and calendar semantics |
| Accent / Emerald | `#16C784` | Evidence, success, completed |
| Warning / Amber | `#F5A524` | Attention, campaigns, needs review |
| Danger / Coral Red | `#FF5C5C` | Failure, blocked, destructive |
| Info / Purple | `#885CF6` | Knowledge and informational state |
| Assets / Teal | `#20B2AA` | Asset semantics |
| Exports / Slate | `#64748B` | Export semantics |

#### Dark palette

| Token | Approved value |
| --- | --- |
| Background | `#090B10` |
| Surface | `#11141B` |
| Surface Alt | `#161C24` |
| Border | `#272B34` |
| Text Primary | `#F5F7FA` |
| Text Secondary | `#868DC8` |
| Muted | `#7C8593` |
| Divider | `#30343D` |

#### Light palette

| Token | Approved value |
| --- | --- |
| Background | `#FAFBFD` |
| Surface | `#FFFFFF` |
| Surface Alt | `#F5F5F8` |
| Border | `#D9DEE8` |
| Text Primary | `#1C2430` |
| Text Secondary | `#667084` |
| Muted | `#A0A8B3` |
| Divider | `#E6EAF0` |

Requirements:

- Normal text contrast: at least 4.5:1.
- Large text and meaningful icons: at least 3:1.
- Never communicate state by color alone.
- Blue outer glow is used on active navigation and focused primary controls as shown, not on every card.
- Blueprint grids and glass panels are approved structural devices. They remain subtle enough to preserve text contrast and are reduced when transparency reduction is requested.

### 8.3 Typography

Approved decision:

- Primary interface font: Inter.
- Monospace font: JetBrains Mono.
- Do not load production fonts from Google at runtime; bundle them or use system fallbacks.

Scale:

| Style | Size | Weight | Tracking | Use |
| --- | ---: | --- | ---: | --- |
| Display | 40 px | Bold | `-0.02em` | Hero statement |
| H1 | 32 px | Bold | `-0.02em` | Route or product title |
| H2 | 24 px | SemiBold | `-0.01em` | Major section |
| H3 | 20 px | SemiBold | `0` | Card or panel title |
| H4 | 18 px | Medium | `0` | Subsection |
| Body Large | 16 px | Regular | `0` | Introductory copy |
| Body | 15 px | Regular | `0` | Default interface copy |
| Small | 13 px | Regular | `0` | Supporting information |
| Caption | 12 px | Medium | `0.08em` | Metadata, status, tags |
| Code | 13 px | Mono | `0` | Code, terminal, logs |

The landing wordmark is a brand asset/treatment, not ordinary H1 text.

### 8.4 Spacing

Use the approved 8-point system, with 4 px allowed only for optical micro-spacing:

`4, 8, 12, 16, 24, 32, 48, 64`

Avoid arbitrary spacing unless required for native safe areas.

### 8.5 Shape and elevation

- Approved radius tokens: 6, 8, 10, 16, and 20 px.
- Inputs and buttons use 6 px.
- Navigation selection and compact cards use 8 px.
- Standard panels use 10 px.
- Large workspace/hero panels use 16 px.
- Only large decorative containers may use 20 px.
- Pills only for tags, status, and compact filters.
- Shadow levels: 2 px subtle, 8 px standard, 16 px elevated, matching the guide’s neutral low-opacity system.
- Glass panels provide depth and focus; they never reduce contrast.

### 8.6 Iconography

- Lucide is the canonical icon family.
- Icons use a consistent 2 px outline stroke.
- Technical cube/blueprint illustrations are approved for identity and empty/hero contexts, not decoration on every row.
- Default icon size: 16 px.
- Page identity: 20 px.
- Empty state: 32–40 px.
- Icon-only controls require tooltip and accessible name.
- Do not animate icons decoratively on every hover.

### 8.7 Motion

- Micro transition: 100 ms.
- Standard transition: 180 ms.
- Maximum complex transition: 240 ms.
- Use standard ease-out.
- No bounce or celebratory effects.
- Motion communicates continuity and state.
- Respect `prefers-reduced-motion`.

## 9. Component specifications

### 9.1 Buttons

Hierarchy:

- Primary: one per action cluster.
- Secondary: ordinary alternatives.
- Quiet: low-emphasis local actions.
- Danger: destructive confirmation only.

Rules:

- Minimum target: 36×36 px; preferred 40×40 px.
- Loading retains width and replaces leading icon with spinner.
- Disabled controls require an adjacent explanation when the reason is not obvious.
- Labels use verbs: `Create story`, `Save links`, `Back up vault`.
- Avoid system-fiction labels such as `Initialize`, `Abort`, `Terminate`, and `Sync changes` for ordinary CRUD.

Approved visual variants:

- Primary: filled Electric Intelligence Blue with high-contrast text.
- Secondary: light/neutral filled action.
- Ghost: transparent, borderless low-emphasis action.
- Danger: filled Coral Red.
- Icon: compact square with approved focus outline.

Landing Get Started cards use semantic outlined CTAs exactly as shown rather than filled primary buttons.

### 9.2 Forms

- Every input has a persistent programmatic label.
- Required fields use text or `*`, not color alone.
- Help and validation text sit beneath the control.
- Validate on blur and submission; avoid disruptive validation on every keystroke.
- Preserve values on API failure.
- First invalid field receives focus after submission.
- Enter submits simple dialogs; `Cmd/Ctrl+Enter` submits multiline capture.

### 9.3 Dialogs

- Focus is trapped.
- Escape closes non-destructive dialogs.
- Initial focus goes to the first incomplete field, not always the close button.
- Destructive confirmation states the object and consequence.
- Maximum body height is 85% of viewport with internal scroll.
- Dialog actions remain visible when content scrolls.
- Closing a dirty dialog requires confirmation.

### 9.4 Cards and rows

Use cards for meaningful grouping or visual objects. Use rows/tables for homogeneous, dense records.

Entire cards may be clickable only when:

- there is exactly one primary destination
- nested buttons stop propagation
- keyboard focus activates the same destination

Hover-only actions are prohibited as the sole access path.

### 9.5 Badges and status

Statuses use consistent label, icon, and semantic color. Status wording comes from the domain, not invented per screen.

Approved examples:

- Ready — Emerald
- In Progress — Blue
- Needs Review — Amber
- Blocked — Coral Red
- Completed — Emerald outline
- Evidence Missing — Purple

### 9.6 Toasts and inline status

Toast:

- successful background action
- reversible deletion with Undo
- capture completion

Inline:

- form validation
- save failure
- loading dependent content
- restore/export progress

Critical local-data failures require a persistent banner until resolved.

### 9.7 Empty states

Every empty state contains:

- plain-language explanation
- why the module matters
- one primary action
- optional secondary import/search action

Do not use all-caps machine-error language for ordinary emptiness.

### 9.8 Loading

- Skeletons reflect final geometry.
- Spinners are reserved for compact or indeterminate operations.
- Existing content remains visible during background refresh.
- Repository analysis, backup, export, and restore show named multi-step progress.

### 9.9 Error states

Errors answer:

1. What failed?
2. Was local data preserved?
3. What can the user do next?

Never replace an entire populated screen with a generic error if stale data is available.

## 10. Keyboard model

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+K` | Global Search |
| `Cmd/Ctrl+N` | New Story |
| `Cmd/Ctrl+/` | Quick Capture |
| `Cmd/Ctrl+P` | Command Menu |
| `Cmd/Ctrl+S` | Save current editor |
| `Cmd/Ctrl+Shift+E` | Open Evidence |
| `Cmd/Ctrl+,` | Settings |
| `Esc` | Close transient surface or clear the active search layer |
| `?` | Keyboard shortcut reference when focus is not editable |

Requirements:

- Shortcuts must not override browser/editor conventions unexpectedly.
- Menus and tooltips expose shortcuts.
- Command surfaces support arrow navigation and Enter.
- Focus order follows visual reading order.

## 11. Accessibility

Target: WCAG 2.2 AA for all primary V1 workflows.

Requirements:

- one H1 per route
- landmarks for navigation, main, complementary inspector, and search
- visible focus ring at least 2 px
- skip-to-content link
- labels bound with `for`/`id` or accessible primitives
- live regions for capture, import, save, export, backup, and restore status
- table headers and captions for data tables
- text alternatives for meaningful images
- captions/transcripts when user-supplied media provides them
- no essential hover-only content
- zoom to 200% without loss of action access
- reduced motion and reduced transparency preferences
- errors associated to controls with `aria-describedby`

TipTap:

- editor has an accessible name
- toolbar uses toggle-button semantics
- toolbar supports roving focus
- formatting state is announced
- editor remains usable without a pointer

## 12. Responsive behavior

### Compact navigation

At widths below 900 px:

- show a top bar with application identity, current route, Search, and menu button
- sidebar becomes a left drawer
- Capture remains reachable but does not cover content
- drawer closes after route navigation

### Lists

- filter bars wrap into a vertical filter sheet
- card grids collapse to one column
- data tables become labelled stacked rows only when column relationships remain clear

### Editors

- properties inspector becomes a drawer
- toolbar scrolls horizontally or groups overflow actions
- save state stays visible

### Dialogs

- use 16 px viewport margins
- actions stack only below 480 px
- file/media preview fits within viewport

## 13. Screen specifications

### 13.1 Home / landing screen

Purpose: reproduce `wireframe.png` as the signed-off desktop landing experience.

#### Desktop frame

- Target reference viewport: 1536×1024.
- Top application bar: approximately 56 px high.
- Left sidebar: approximately 204 px wide beneath the top bar.
- Main workspace: fills remaining area with 24 px outer inset, 16 px large radius, dark glass surface, and restrained border.
- Content density and region proportions follow the wireframe. Do not replace the composition with a conventional dashboard template.

#### Top application bar

Left:

- approved N-Tech cube mark
- `N-TECH C³` wordmark treatment

Right, in order:

- Notifications
- Help
- Settings
- circular avatar with initial
- `NaniTech`
- account disclosure
- platform window controls where applicable

#### Sidebar

The exact navigation order is defined in section 5.2. The active Home item uses Electric Intelligence Blue fill/border/glow and a home outline icon.

Quick Capture is a bordered sidebar panel containing:

1. Screenshot
2. Terminal Output
3. Code Snippet
4. Voice Note
5. Import File
6. New Quick Note

The panel header includes `QUICK CAPTURE` and an add affordance. Version `v0.1.0 Alpha` and a local-ready indicator sit at the bottom.

#### Brand hero

The first main-content region is a wide 2:1-style hero panel with blueprint grid, blue technical light treatment, and approved glass border.

Left-to-center content:

- large approved dimensional N mark
- `N-TECH C³` brand lockup
- `ENGINEERING INTELLIGENCE OPERATING SYSTEM`
- `Capture reality. Organize knowledge. Produce evidence. Create influence.`

Right content is a vertical five-item brand-principle stack:

1. Evidence before assumptions.
2. Knowledge before action.
3. Quality before speed.
4. Built for engineers. By engineers.
5. 100% Local. 100% Yours.

Each item uses its wireframe icon, semantic accent, dark glass row, and matching alignment. Text is not rewritten.

#### Get Started

Immediately below the hero, a labelled `GET STARTED` region contains six equal cards in one row at the target viewport:

| Card | Icon color | Description | CTA |
| --- | --- | --- | --- |
| Create Content | Repository Blue | Start a new story, note or piece of engineering content. | Create New |
| New Workspace | Evidence Emerald | Create a new workspace to organize your projects. | New Workspace |
| See Scheduled Content | Knowledge Purple | View your content calendar and publishing schedule. | Open Calendar |
| Start Campaign | Campaign Orange | Define a new campaign and align stories and assets. | Start Campaign |
| Upload Knowledge | Assets/Secondary Cyan | Import files, documents or research into your vault. | Upload Now |
| View Running Campaigns | Repository Blue | Monitor active campaigns and their progress. | View Campaigns |

Card titles, copy, icon prominence, outlined CTA treatment, heights, and spacing follow the wireframe. On narrower desktop widths the cards wrap 3×2, then 2×3; ordering remains unchanged.

#### Operational panels

Below Get Started is a three-column row:

1. `LAST OPENED WORKSPACES` — four recent workspaces, path, opened time, story/item counts, `View All`, and `Open Other Workspace`.
2. `RECENT ACTIVITY` — five recent events with semantic icon, event title, context, relative time, and `View All`.
3. `AT A GLANCE` — six metric tiles plus `Today's Focus` checklist and circular Daily Progress indicator.

All values must come from current local state. When data is unavailable, preserve panel geometry and show an actionable empty state rather than sample figures.

Metric order:

1. Stories
2. Evidence Items
3. Knowledge Pages
4. Campaigns
5. Assets
6. Exports

#### Bottom strip

The landing workspace ends with a full-width strip containing:

- Pro Tip with lightning icon and Quick Capture guidance
- centered brand quote: “The best systems don’t just store knowledge. They make it work for you.”
- Keyboard Shortcuts for Search, New Story, Quick Capture, and Command Menu

The quote and shortcut labels remain exactly as approved unless the corresponding shortcut changes through an approved brand revision.

#### Home states

- Loading uses skeletons matching each final panel.
- First-run state preserves the full composition; operational panels offer creation/capture actions.
- Errors remain local to the affected panel.
- Hero and brand principles never disappear due to data state.

### 13.2 Workspaces list

Purpose: choose an engineering context and understand its freshness.

Default presentation: responsive rows or cards containing:

- name and color
- description
- latest repository snapshot time
- readiness score if measured
- linked story/evidence counts
- last activity

Primary action: `New Workspace`.

Repository scan is a project-level action. A global `Scan repository` may ask which project to associate before saving.

Filters: active/archive state when that domain exists; repository freshness; search.

### 13.3 Workspace detail

Header:

- breadcrumb
- project name
- description
- `Capture repository snapshot`
- overflow actions

Overview:

- latest snapshot summary
- meaningful readiness checks
- linked Stories, Evidence, Knowledge, and Assets
- last activity

Snapshot timeline:

- chronological, newest first
- commit, branch, date, readiness, TODOs, files, dependencies
- delta against previous comparable snapshot
- unchanged snapshots visually compact
- `Compare` opens a two-column or unified comparison view

Empty state explains what scanning reads and that no repository path is persisted.

### 13.4 Stories list

Default: dense list/table, not a decorative card grid.

Columns:

- title
- status
- project/campaign
- evidence health
- updated

Filters:

- text
- status
- project
- priority
- evidence health

Primary action: `Create story`.

Row activation opens Story detail. Secondary actions remain visible on focus, not hover only.

### 13.5 Story detail

Header:

- breadcrumb
- editable title
- save state (`Unsaved`, `Saving…`, `Saved locally`, `Save failed`)
- status
- overflow

Canvas:

- distraction-minimized authoring width
- TipTap toolbar
- summary above or below content, based on user preference

Inspector tabs:

- Properties
- Evidence
- References
- Assets
- History

Evidence tab allows search, link, unlink, and quick capture already associated with the story.

Destructive action wording: `Delete story`, followed by confirmation and Undo where technically safe.

### 13.6 Campaigns

List shows objective, state, date range, linked story count, and completion.

Detail sections:

- Overview
- Stories
- Assets
- Timeline
- Tasks
- Outputs

Unavailable sections must not appear as interactive tabs before implementation.

### 13.7 Evidence Vault

Purpose: capture, inspect, filter, and connect engineering proof.

Header actions:

- `Capture evidence`
- `Import files`

Filter bar:

- search
- type
- project
- story
- repository
- date range

View modes:

- compact list default
- visual grid for image/video-heavy filters

Evidence item exposes:

- title
- type
- captured date
- project/story association
- source/repository
- preview availability

Preview:

- metadata first
- safe inline content/media
- checksum and vault-relative source
- graph links
- `Reveal in vault`
- `Open detail` when canonical detail routes exist

Drop state covers only the evidence content region and clearly states whether files will be copied into the vault.

### 13.8 Knowledge

Default list groups or filters by category while supporting search.

Detail uses the shared authoring workspace and adds:

- backlinks
- linked stories/evidence/projects
- references
- completeness score

Backlinks distinguish explicit links from inferred future semantic links.

### 13.9 Assets

Default visual grid with:

- thumbnail or type fallback
- title and type
- dimensions/size when known
- project/story usage count

Filters: type, project, usage, date.

Asset detail/preview must distinguish vault files from external URLs.

### 13.10 Templates

List shows title, category, target format, and last used.

Primary action: `Create template`.

Template detail requires preview and `Use template`; until those exist, never show a non-functional use action.

### 13.11 Global Search

Search field is the visual focus.

Behavior:

- 150–250 ms debounce
- ranked results
- keyboard result selection
- recent searches before input, stored locally
- highlighted matched terms with accessible plain-text equivalent

Filters:

- entity type
- project
- status
- date

Filters collapse into chips after selection. `Clear all` appears when any filter is active.

Results group by relevance by default; optional grouping by entity type may be added without changing the query.

### 13.12 Settings

Canonical sections:

- General
- Vault & Data
- Appearance
- Keyboard
- About

General:

- system name/version
- local runtime status

Vault & Data:

- vault location with reveal action
- database status
- Export Markdown + JSON
- Back Up Vault
- Restore Backup
- recent operations

Restore:

- never belongs in a generic “Danger Zone”
- explains validation, replacement, recovery copy, and restart
- requires confirmation after file selection

Appearance:

- theme when supported
- density
- reduced transparency preference

Non-functional sidebar sections and purge controls must not be shown.

### 13.13 Quick Capture

Dialog title: `Capture evidence`.

Fields:

- inferred type
- title
- content or selected files
- optional Project
- optional Story
- optional tags

Primary button: `Capture`.

Paste capture:

- never intercepts paste inside editable controls
- shows the pasted content before save
- retains content on failure

The floating trigger must avoid obscuring bottom-right content and collapse to an icon in Compact mode.

## 14. Content design

### Voice

- professional, measured, and confident
- clear, technical, and actionable
- evidence-driven, not opinion-driven
- never exaggerated and never marketing-led
- informative, supportive, and empowering

Preferred:

- Create
- Save
- Delete
- Cancel
- Capture
- Import
- Back up
- Restore
- No stories yet

Avoid:

- Initialize
- Sync changes
- Abort
- Terminate
- Sector not found
- No active campaigns detected
- Vault empty
- Amazing!
- Awesome!
- Great Job!
- You have nothing here.

Approved success phrasing:

- Successfully indexed 27 evidence items.
- Repository analysis completed.
- Story exported successfully.
- Capture your first evidence item to begin.

### Dates and times

- show relative time for activity less than seven days old
- full local timestamp in tooltip or detail
- use unambiguous absolute dates for backup, restore, and export

### Numbers

- show `0`, never substitute falsy values incorrectly
- percentages state what is measured
- counts link to their filtered list

## 15. Trust, safety, and privacy UX

- Label the application `Local-first`; do not claim absolute offline behavior while external font or URL content is loaded.
- Show when opening an external URL.
- Display vault-relative paths in ordinary UI; absolute paths only in explicit system detail.
- Repository scans disclose what is read and what is stored.
- Restore is blocked until archive validation succeeds.
- A failed restore explicitly confirms whether the original vault was recovered.
- Reveal/open actions never accept arbitrary absolute paths from entity content.
- Imported executable files are stored but never run from preview.

## 16. Performance perception

Targets:

- route response to visible shell feedback: under 100 ms
- local list content: under 300 ms for typical vaults
- search feedback after debounce: under 150 ms
- dialog open: under 100 ms
- save-state transition: immediate optimistic `Saving…`, confirmed result afterward

If work exceeds 500 ms, show progress. If it exceeds 5 seconds, identify the current stage and provide cancel where safe.

## 17. Current UI audit findings

The following are observed implementation divergences, not approved UX:

1. Sidebar navigation disappears below `md` without a replacement.
2. Sidebar displays simulated `Online`, core load, and memory values.
3. Navigation is ungrouped and does not match the work/intelligence/production mental model.
4. Google Fonts are fetched at runtime, weakening offline/local-first behavior.
5. Outfit is used despite the original brief specifying Inter.
6. Uppercase and machine-console language are overused for ordinary CRUD.
7. Several empty states lack a direct primary action.
8. Some actions are visible only on hover.
9. Save behavior is manual and labelled with ambiguous “sync” language.
10. Quick Capture lacks Project, Story, tags, and file selection.
11. Evidence preview is modal-only and has no canonical detail URL.
12. Settings displays non-functional navigation and purge controls.
13. Current Dashboard does not reproduce the approved Home wireframe, brand hero, Get Started cards, workspace/activity/At a Glance panels, or bottom strip.
14. Responsive detail inspectors and compact navigation are undefined in code.
15. Error handling is inconsistent across mutations.
16. There is no global shortcut reference or global API error boundary.

These divergences should be resolved in deliberate UI implementation passes after this specification is reviewed.

## 18. Acceptance criteria for UI implementation

A screen is specification-complete when:

- purpose and primary action match this document
- every action has loading, success, error, and disabled behavior
- empty state offers a next action
- keyboard flow and focus restoration are verified
- normal text and controls meet contrast targets
- the screen works at Compact, Standard, and Wide widths
- no simulated operational data is displayed
- language follows the content guidelines
- Playwright covers the highest-risk happy path and one recovery path
- native-only behavior has a clear browser fallback
- implementation status is updated in `N-TC3_index.md`

Home adds visual-fidelity gates:

- capture the implemented screen at the 1536×1024 reference viewport
- compare side-by-side and with a 50% overlay against `wireframe.png`
- preserve the same major region order, sidebar/top-bar proportions, hero footprint, six-card Get Started row, three operational panels, and bottom strip
- use exact approved brand tokens rather than sampled approximations
- document intentional differences caused by real data, platform-native window controls, accessibility, or responsive behavior
- obtain explicit approval for any other composition or copy difference

## 19. Recommended design sequence

No broad visual rewrite should begin before review of this specification.

After approval:

1. Export production-ready logo/mark assets from the approved brand artwork.
2. Shell, navigation, typography, tokens, responsive frame, and semantic language.
3. Home landing screen and Quick Capture, reproduced against `wireframe.png`.
4. Evidence list/detail/preview and graph linking.
5. Story list/detail authoring workspace.
6. Workspaces list/detail and repository comparison.
7. Search.
8. Remaining modules and Settings.
9. Cross-route accessibility, reduced motion, performance, and regression pass.

## 20. Open product decisions

These require explicit product approval before implementation:

1. Whether the approved light palette ships in V1 or remains a later implementation.
2. Whether entity detail uses right-side inspectors or full route transitions for Evidence and Assets.
3. Whether Story autosave is mandatory or configurable.
4. Whether Quick Capture defaults to the most recent Workspace.
5. Whether Workspace remains a user-facing alias for Project or becomes a separate persisted entity.
6. Whether Campaign remains a distinct concept from Workspace/Project.
7. Whether repository readiness is a single score or a checklist without aggregate scoring.
8. Whether future Queue and Timeline are top-level routes or Home modes.
