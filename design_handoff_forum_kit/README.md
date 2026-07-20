# Handoff: Forum Kit — Threaded Discussion UI

## Overview
Forum Kit is a community/forum thread interface for a product-writing community. A single
thread ("How do you keep a product's voice warm without sounding precious?") is shown across
**five design treatments / screens**, all sharing one data model and interaction set:

1. **Salon** — editorial single-column thread (desktop)
2. **Studio** — two-column app shell with a drawer sidebar (desktop)
3. **Aurora** — centered "node-spine" thread, dramatic hero (desktop)
4. **Assistant** — thread + an AI assistant rail ("Lina") that summarizes and suggests (desktop)
5. **Mobile** — phone-width (392×844) single column

All five support: upvoting, four reaction types, nested reply-to-a-reply, accepting an answer,
sorting, a searchable/tag-filterable directory, a "New post" composer with media upload and
AI-assisted title/tag generation, a slide-in sidebar (search + topics + tags), and a global
**dark/light theme toggle**.

> The five screens are **alternate visual directions for the same feature**, presented together on a
> canvas. In a real product you would typically pick ONE direction (or a small set of responsive
> breakpoints) rather than ship all five. Confirm with the design owner which treatment(s) to build.

## About the Design Files
The files in `design_files/` are **design references authored in HTML** — prototypes that show the
intended look and behavior. They are **not production code to copy directly**.

They are written in a small in-house "Design Component" (`.dc.html`) format that runs on a runtime
called `support.js`. **Do not port the `.dc.html` format or `support.js`.** Treat them as a precise
visual + behavioral spec. Your task is to **recreate these designs in the target codebase's existing
environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established component library,
styling system, and patterns. If the project has no front-end yet, choose the most appropriate
framework and implement there.

How to read a `.dc.html` file:
- Markup between `<x-dc>…</x-dc>` is the template. Inline `style="…"` is the source of truth for all
  visual styling. `{{ x }}` are data bindings; `<sc-if>` / `<sc-for>` are conditional / list blocks;
  `<dc-import name="X">` mounts a sibling `X.dc.html` (treat as a child component).
- The `<script type="text/x-dc">class Component extends DCLogic{…}` block at the bottom is the
  component logic (state + handlers). Plain JavaScript; read it as the behavior spec.
- **Easiest path:** open `design_files/Forum Kit Thread.dc.html` in a browser to see and click the
  real thing. (Open it via a local web server so the sibling files load, e.g.
  `python3 -m http.server` then visit the file — opening with `file://` may block the imports.)

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, animations, and copy are
all specified. Recreate pixel-faithfully using the codebase's own primitives. The exact hex/spacing
values are listed under **Design Tokens** below; the per-component values live inline in the HTML.

---

## Global Layout & Foundations

- **Type families** (Google Fonts): `Sora` (weights 300/400/500/600) for all UI and body text;
  `Michroma` for the "FORUM KIT" wordmark only. (An earlier `Spectral` import is no longer used.)
- **Desktop frames** are 1280px wide × 884px tall, `border-radius: 22px`, `overflow: hidden`.
- **Mobile frame** is 392 × 844, `border-radius: 46px`.
- Each frame is a vertical flex column: an **aurora layer** + **grain layer** (decorative, absolutely
  positioned, `pointer-events:none`) behind a **header**, a scrollable **thread body**, and (some
  frames) a **composer** footer.
- **Aurora**: soft blurred radial-gradient blobs in purple `rgba(139,108,240,*)`, blue
  `rgba(77,124,255,*)`, teal `rgba(52,224,216,*)`, green `rgba(95,227,161,*)`, `filter: blur(~34px)`,
  animated. See **Animations**. Intensity is controlled by a CSS var `--fk-glow` (1 in dark, ~0.3 in
  light).
- **Grain**: a tiling `feTurbulence` SVG at `mix-blend-mode: soft-light`, opacity `--fk-grain`
  (0.05 dark, 0 light). Optional — a subtle texture; safe to omit if your stack makes it hard.

---

## Theming (dark / light) — IMPORTANT

The design ships **two themes**. Dark is the default. A ☾/☀ toggle button in every frame header flips
them, and the choice persists in `localStorage` under key `fk-theme` (`"dark"` | `"light"`).

In the prototype this is implemented by routing every theme-dependent color through a CSS variable
(`--t1 … --t76`) whose **fallback value is the dark color**, and applying a light value at runtime
when the theme is light. **You do not need to reproduce that `--tNN` mechanism** — implement theming
however your codebase normally does (CSS variables, a theme provider, Tailwind `dark:` variants,
etc.). What matters is the **two palettes** below.

### What stays the SAME in both themes (do not theme these)
The blue mascot gem, the pearl/gradient avatars, the light "chrome" primary buttons, the accent-blue
tints (`rgba(108,170,245,*)`), and the aurora hues. Only backgrounds, text, borders, surfaces, shadows
and scrims change between themes.

### Semantic palette

| Role | Dark | Light |
|---|---|---|
| App/page backdrop (deepest) | `#070a12` | `#e9edf4` |
| Frame background | `#0c1019` / `#0a0e18` | `#f4f6fb` |
| Raised panel / popover / modal | `#1c2236`–`#28324d` (opaque) | `#ffffff` |
| Sidebar surface | gradient `rgba(18,24,40,.97)→rgba(9,13,23,.97)` | `rgba(250,251,254,.97)→rgba(241,244,250,.97)` |
| Text — strong (titles) | `#e9eff8` / `#eef3fb` | `#161b2c` |
| Text — body | `#d3dcee` / `#cfd8ea` / `#c8d2e4` | `#2c3650` |
| Text — dim (secondary) | `#acb7cc` / `#98a4be` | `#5a6680` |
| Text — mid | `#919cb3` | `#6a7690` |
| Text — faint (meta/labels) | `#757f95` / `#6b7488` / `#8590a5` | `#828ea4` |
| Text — faintest | `#5b6376` / `#4e5e7c` | `#9aa3b6` |
| AI accent text (purple) | `#cdb9f5` | `#6d4fc4` |
| Glass surface overlay | `rgba(218,229,247, .04–.16)` (white on dark) | `rgba(40,52,84, .03–.16)` (dark on light) |
| Border (neutral) | `rgba(218,229,247, .09–.16)` | `rgba(40,52,84, .09–.16)` |
| Border / tint (accent) | `rgba(108,170,245, .1–.5)` | same (unchanged) |
| Drop shadow | `rgba(0,0,0, .5–.85)` | `rgba(38,52,86, .04–.16)` (much softer) |
| Drawer/modal scrim | `rgba(7,9,15, .55–.78)` | `rgba(26,34,58, .28–.39)` |
| Accent (links, active, dots) | `#5cc8f5` (cyan) | `#2f6fe0` (blue) |
| Aurora intensity (`--fk-glow`) | `1` | `~0.3` |

The accent is also exposed as a prop with options `#5cc8f5`, `#6f8cff`, `#34e0d8`, `#5f9be0`.

---

## Screens / Views

> Components common to several screens are documented once under **Shared Components** and referenced
> by name.

### 1. Salon — editorial single column
- **Purpose:** Read a thread as a long-form editorial page.
- **Layout:** Single column. Header (logo + breadcrumb left; theme toggle + "New post" right). Below,
  a centered reading column (`max-width: 720px`) with the opening post card, a "N REPLIES" label, then
  reply cards. Generous padding (`30px 40px`).
- **Components:** Header (Shared); Opening-post card; Reply card with nested replies (Shared);
  Composer is not shown inline here (posts open the New-post modal).

### 2. Studio — app shell with drawer sidebar
- **Purpose:** A conventional product UI — collapsible left nav + thread pane.
- **Layout:** `display:flex` row. The **Sidebar** (Shared) is a **slide-in drawer** over a dimmed,
  blurred main pane (NOT a static column). Default state: **closed**. Main pane = header (hamburger +
  mascot + "Writing / thread" breadcrumb left; theme toggle + "New post" right), a **sort bar**
  (`Top · Newest · Oldest`), scrollable reply list, and a bottom composer input.
- **Drawer behavior:** opening the hamburger renders a scrim (`position:absolute; inset:0; z-index:7;`
  scrim color + `backdrop-filter: blur(3px)`) and a 286px drawer (`z-index:8`,
  `box-shadow: 30px 0 70px -30px rgba(0,0,0,.85)`). Clicking the scrim or the drawer's ✕ closes it.
- **Components:** Header (Shared); Sort bar (Shared); Reply cards (Shared); inline composer (Shared);
  Sidebar drawer (Shared).

### 3. Aurora — node-spine thread
- **Purpose:** A dramatic, centered presentation.
- **Layout:** Centered column (`max-width:720px`, top padding `64px`). A floating 80px mascot "hero"
  with a strong aurora glow behind it, the post title centered, then reply cards. Hamburger sits
  top-left (absolute), theme toggle top-right (absolute).
- **Components:** Floating mascot hero (80px gradient orb, `animation: fkfloat`); centered post header;
  Reply cards (Shared).

### 4. Assistant — thread + AI rail
- **Purpose:** Thread on the left, an AI assistant panel ("Lina") on the right.
- **Layout:** `flex` row. Left = header + thread + composer (like Studio's main pane). Right =
  ~320px **assistant rail**: a floating mascot image (`forumkit-assistant.png`, 150px, `fkfloat`),
  name "Lina", a status row, two action buttons — **Summarize thread** and **Suggest a reply** — and
  result areas.
- **Assistant behavior:**
  - *Summarize*: shows a "Lina is reading the thread…" loading row (animated dots, `fkbreathe`) for
    ~1.4s, then a "✦ THREAD SUMMARY" card listing 3 bullet points (provided in logic as
    `summaryPoints`).
  - *Suggest a reply*: drops a suggested reply string into the composer input (`suggestedReply` in
    logic) and shows a "✦ suggested" hint.
- **Components:** Header (Shared); Reply cards (Shared); Assistant rail (unique to this screen).

### 5. Mobile — phone-width thread
- **Purpose:** The responsive/mobile rendering.
- **Layout:** 392×844 device frame. Status bar (9:41 + glyphs), header (hamburger + "FORUM KIT" +
  theme toggle + circular "+" New-post), scrollable thread (compact paddings, smaller type), bottom
  composer pill. Sidebar opens as a 286px drawer with scrim (same as Studio).
- **Components:** Compact variants of Header, Reply cards, Composer, Sidebar drawer.

---

## Shared Components

### Header
- Left cluster (`gap` ~11–14px): **hamburger** (36px rounded-square, 3 bars, toggles the sidebar) →
  **mascot** (animated, see below) → wordmark "FORUM KIT" (Michroma, 13px, `letter-spacing:2px`) and/
  or a breadcrumb ("/ Writing", "Writing / thread").
- Right cluster (`gap:10px`): **theme toggle** (36px rounded-square, glyph ☾ in dark / ☀ in light) →
  **New post** button (light chrome gradient pill, dark text `#16203a`, "+ New post").
- Bottom border: `1px solid rgba(108,170,245,.1)`.

### Mascot (the "dancing chat icon")
A 30–34px stylized chat-bot gem, present in every header and in the sidebar:
- A perspective container; inner element `animation: fkdance 4.8s ease-in-out infinite`.
- A small "tail" blob (`linear-gradient(150deg,#8cc0f7,#3f7ee2)`), a glossy body
  (`radial-gradient(...#cfe8ff,#86bdf6,#3f7ee2,#aed6ff)` with inset highlights), three bouncing dots
  (`#2a2410`, `animation: fkdotpop` staggered 0 / .18s / .36s), and a small red notification badge
  ("1", `radial-gradient(#ff9384,#e0432f)`, `animation: fkbadge`).
- Copy this markup verbatim from the HTML — it's purely decorative CSS.

### Opening-post card
- Surface: `linear-gradient(165deg, <glass .09>, <glass .03>)`, `border:1px solid <glass .16>`,
  `border-radius: 20–22px`, soft shadow, `inset 0 1px 0 rgba(255,255,255,.1)` top highlight.
- Tag pills (top): `font-size:10.5–11px`, accent-tinted bg `rgba(108,170,245,.1)`, border
  `rgba(108,170,245,.2)`, `border-radius:20px`.
- Title: Sora 500, ~26–28px desktop / 19px mobile, `line-height:~1.28`.
- Author row: 22px pearl avatar (radial gradient) + name (Sora 500) + faint timestamp.
- Body: Sora 400, ~16–17px, `line-height:~1.6`.
- Footer: **Upvote pill** + "N replies".

### Upvote pill
`↑ Upvote · <count>` — inline-flex, `gap:7px`, `padding:6px 13px`, `border-radius:20px`, Sora 500 13px.
- Default: glass surface + neutral border, dim text.
- Voted: light "chrome" gradient (`#edf3fc→#acbed9→#566884`), dark text `#16203a`,
  `inset 0 1px 0 rgba(255,255,255,.6)`. Clicking toggles vote and ±1 the count.

### Reaction chips + picker
- Four reaction types: **👍 Like, 🙌 Helpful, 💡 Insightful, 😂 Funny** (real emoji).
- A reply shows the reactions it has as chips: `<emoji> <label> <count>`. Same default/active styling
  language as the upvote pill (active = chrome gradient, dark text).
- A `＋` button opens a **picker popover** (absolute, above the button, `z-index:20`, dark/near-white
  rounded card) with the 4 emoji; clicking adds/toggles that reaction (count drops the chip at 0).

### Reply card (with nested replies)
- Same surface language as the post card, slightly smaller.
- Header: 24px avatar + name + timestamp. Optional **✓ ANSWER** badge (filled chrome pill) if accepted;
  otherwise a dashed **"✓ Mark answer"** affordance (toggles accepted; only one answer per thread).
- Body text Sora 400 ~16px.
- Action row (wraps): Upvote pill · reaction chips · `＋` reaction picker · **↩ Reply**.
- **↩ Reply** opens an inline composer (full-width input + Cancel + Reply). Enter submits, Esc cancels.
  Submitting appends a **child reply** under this one.
- **Nested children:** rendered indented with a left rule
  (`margin-left:14px; padding-left:16px; border-left:1px solid rgba(108,170,245,.18)`), smaller avatars
  and type. Children currently render one level; the data model is recursive (`children[]`).

### Sort bar (Studio)
Segmented control: `Top · Newest · Oldest`. Active segment uses the chrome gradient + dark text;
inactive is plain dim text. Sorting:
- **Top:** accepted answer first, then by votes desc.
- **Newest / Oldest:** by reply id desc / asc.

### Composer (inline — Studio, Assistant, Mobile)
A rounded pill/bar: text input ("Add to the discussion…" / "Write an answer…") + a mic-ish control +
a chrome **Post** button (or send arrow). Enter or Post appends a top-level reply (votes 0, no
reactions). Mobile uses a compact 26px-radius pill.

### Sidebar (drawer) — `Sidebar.dc.html`
286px panel, sidebar surface gradient, right border `1px solid rgba(108,170,245,.14)`, scrollable.
Contents top→bottom:
- Brand row: mascot + "FORUM KIT" + **✕ close**.
- **Search** field ("Search threads…", with a "/" hint) — opens the Nav overlay in search mode.
- **TOPICS** list: Writing / Product / Engineering / Design, each with a count; active item gets an
  accent left-bar + tinted bg. Clicking filters the directory by that topic (opens Nav overlay).
- **TAGS** cloud: hashtag pills (`#voice`, `#writing`, …) sized by frequency; active pill highlighted.
  Clicking opens the Nav overlay filtered to that tag.
- Footer: a 36px "You / contributor" user chip.
- Props: `tags` (array), `topics` (array), `onSearch()`, `onClose()`.

### Nav overlay — `NavOverlay.dc.html`
Full-frame overlay (`position:absolute; inset:0; z-index:9`, dark/near-white veil + blur) used for
both **search** and **tag/topic results**.
- Header: in search mode, a focused text input ("Search threads, tags, people…"); in tag mode, a big
  `#tag` title + result count. A ✕ closes it.
- Body: a centered (`max-width:680px`) list of result cards (title, tag pills, "▲ votes · N replies ·
  author · time"). Empty state: "No threads here yet."
- Search matches title/author/tags (case-insensitive). Props: `isSearch`, `isTag`, `tag`, `query`,
  `results[]`, `resultLabel`, `empty`, `onClose()`, `onSearchInput(e)`.

### New-post composer modal — `ComposeSheet.dc.html`
Centered modal (`max-width:560px`, raised panel surface, `border-radius:22px`) over a blurred veil.
Reachable from every frame's "New post" / "+" control. Fields top→bottom:
- **Title** input, with an inline **✦ Suggest** button (AI — see below). Shows "Writing…" + spinner
  while generating.
- **Body** textarea ("Add context (optional)…").
- **Media upload**: a dashed "🖼 Add photos, videos or files" button (hidden `<input type="file"
  multiple accept="image/*,video/*,*">`). Selected files show in a responsive preview grid
  (`minmax(108px,1fr)`, 96px tall tiles): **images** as cover thumbnails, **videos** as a frame with a
  ▶ badge, **other files** as a 📄 tile with name + size. Each tile has an ✕ remove button; a brief
  "loading…" state while media reads via `FileReader`/data-URL.
- **Tags** input ("Tags, comma-separated…"), with its own **✦ Suggest** button ("Tagging…" while busy).
- Footer: Cancel + chrome **Post** button (requires a non-empty title; new post is prepended to the
  searchable directory with author "You").
- Props: `postTitle/postTags/postBody`, `attachments[]`, `hasAttachments`, `genTitle/genTags`,
  `notGenTitle/notGenTags`, `onTitle/onTags/onBody/onFiles/onAITitle/onAITags/onSubmit/onCancel`.

---

## Interactions & Behavior (summary)
- **Upvote** post or any reply → toggles voted state, count ±1, pill restyles.
- **React** → toggle an existing reaction chip, or `＋` to add one of the 4 types; chip removed at 0.
- **Reply** → inline composer under a reply; Enter submits (appends child), Esc/Cancel closes.
- **Mark / unmark answer** → only one accepted answer per thread; floats to top under "Top" sort.
- **Sort** (Studio) → Top / Newest / Oldest.
- **New post** → modal with media upload + AI title/tags; prepends to directory.
- **Search** (sidebar field) → Nav overlay, live-filtered.
- **Topic / tag click** (sidebar) → Nav overlay filtered to that topic/tag.
- **Sidebar** → slide-in drawer with scrim + `backdrop-filter: blur(3px)`; ✕ or scrim click closes.
- **Theme toggle** → flips dark/light, persisted to `localStorage["fk-theme"]`.
- **Assistant** (Assistant screen) → Summarize (loading → 3-bullet summary) / Suggest (fills composer).
- **Accessibility:** interactive elements use `role="button"`/`role="tab"` + `aria-label`,
  `tabindex="0"`, a global `:focus-visible` outline (`2px solid` accent), and a
  `prefers-reduced-motion` block that disables animations. Reproduce these — and prefer real
  `<button>`/`<input>` elements in your implementation.

## AI features (Suggest title / Suggest tags / Assistant)
The prototype calls a built-in helper `window.claude.complete(prompt)` (returns a string) — this is
**specific to the prototype runtime and will not exist in your app**. Replace it with your product's
LLM/back-end endpoint. The prompts used:
- **Title:** "write ONE clear, engaging title phrased as a question or a crisp statement, max 12 words,
  no quotes/punctuation/preamble" given the description; the result is trimmed to the first line.
- **Tags:** "return 3–5 short, lowercase, single-word or hyphenated topic tags, comma-separated, no #"
  given title+body; parsed into a comma list, max 5.
- **Assistant Summarize/Suggest** in the prototype use canned `summaryPoints` / `suggestedReply`
  strings (in the logic class) with a simulated delay — wire these to real endpoints as desired.

## State Management
Per the logic class (`Forum Kit Thread.dc.html`), the state needed (per screen instance, keyed A–E in
the prototype so all five render independently — in your app you need ONE instance):
- `threads` — the post + recursive `replies[]` (each: `id, author, time, body, votes, voted,
  reactions[], children[], accepted`).
- `inputs` — composer text.
- `reply` — `{ id, text }` of the open inline reply composer.
- `reactPicker` — which reply's `＋` picker is open.
- `compose` — `{ open, title, tags, body, attachments[], genTitle, genTags }`.
- `sort` — `'top' | 'new' | 'old'`.
- `sidebar` — open/closed.
- `nav` — `{ mode: 'search'|'tag'|null, tag, query }`.
- `asst` — `{ summarizing, summary, suggested }` (Assistant screen).
- `theme` — `'dark' | 'light'` (persisted).
- A `directory` of threads powers search/topic/tag results; `reactionTypes` defines the 4 reactions.

## Design Tokens
- **Fonts:** Sora (300/400/500/600); Michroma (wordmark only).
- **Type scale (approx):** titles 26–28px (mobile 19); body 16–17px; controls 12–14px; meta 10.5–12px;
  section labels 10px `letter-spacing:1.4–1.6px` uppercase.
- **Radii:** chips/pills 18–20px; inputs/buttons 11–14px; cards 16–22px; mobile frame 46px;
  desktop frame 22px; circular avatars/badges 50%.
- **Spacing:** card padding 18–32px; header padding 18–20px ×30px; reading column max-width 720px;
  assistant rail ~320px; sidebar/drawer 286px.
- **Shadows:** cards `0 14–26px 36–60px -24…-28px <shadow>`; drawer `30px 0 70px -30px rgba(0,0,0,.85)`;
  buttons `0 8–10px 18–22px -8px <shadow>` + `inset 0 1px 0 rgba(255,255,255,.6–.8)`.
- **Colors:** see the full **Theming** table above.

## Animations
Defined as `@keyframes` in the main file's `<style>` (reproduce with your animation system):
- `fkaurora` (~15–18s) — slow translate/scale/opacity drift of the aurora blobs.
- `fkhue30 / fkhue34` (~34–44s) — slow `hue-rotate` so the aurora palette softly shifts over time
  (stays within the cool purple→blue→teal→green family; layers run at slightly different durations so
  they never sync).
- `fkfloat` (6–6.5s) — gentle vertical bob for the hero mascot / Lina image.
- `fkdance` (4.8s) — the header/sidebar mascot's idle "dance".
- `fkdotpop` (1.4s, staggered) — the mascot's three typing dots.
- `fkbadge` (4.8s) — the notification badge pulse.
- `fkbreathe` (1.1s) — assistant "thinking" dots.
- `fkspin` (.7s) — the ✦ Suggest button spinner.
- Drawer open uses a CSS transition + `backdrop-filter: blur(3px)` on the scrim.
- All animations must be disabled under `prefers-reduced-motion: reduce`.

## Assets
- `design_files/forumkit-assistant.png` — the "Lina" assistant character (Assistant screen, ~150px).
- The mascot gem, pearl avatars, and "user chip" avatar are **pure CSS gradients** (no image assets) —
  copy their markup from the HTML.
- Emoji (👍🙌💡😂) are system emoji (text), not assets.
- Fonts load from Google Fonts (Sora, Michroma).

## Files
In `design_files/`:
- `Forum Kit Thread.dc.html` — the main file: all five screens + the full logic class (state, handlers,
  theme system, keyframes, tokens). **Primary reference.**
- `Sidebar.dc.html` — the sidebar/drawer contents (search, topics, tags, user chip).
- `NavOverlay.dc.html` — the search / tag-results overlay.
- `ComposeSheet.dc.html` — the New-post modal (media upload + AI suggest).
- `forumkit-assistant.png` — Lina image asset.
- `support.js` — the prototype runtime. **Reference only — do not port.**

To preview the real thing, serve `design_files/` over a local HTTP server and open
`Forum Kit Thread.dc.html`.
