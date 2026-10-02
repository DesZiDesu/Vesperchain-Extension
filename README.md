# Vesperchain — The Black Ledger

**v0.4.1 · Readable mobile search and action toolbars**

A dark-fantasy interface with a compact ledger workspace, original SVG marks, optional animated atmosphere, and persistent interface preferences. English and Thai interface labels are included.

## Installation

After this change is on your installation branch, open SillyTavern → Extensions → Install extension and use:

```text
https://github.com/DesZiDesu/Vesperchain-Extension
```

Reload SillyTavern. Open **Extensions → Vesperchain** to configure it. No runtime npm install, API key, or build step is required. Requires a modern browser with native dialog/Pointer Events support and SillyTavern's public `SillyTavern.getContext()` API, including `extensionSettings` and `saveSettingsDebounced`.

This version includes chat mechanics, scoped NPC profiles, local portraits, and the selected Scene / Narrative / Dialogue presentation.

### Updating without clearing Safari data

Update the extension in SillyTavern, then reload the SillyTavern page normally. Confirm **0.4.1** in the Vesperchain settings drawer. Release assets now use a version-specific directory for the complete JavaScript module graph and CSS, avoiding reuse of previous release URLs. No site-data clearing or storage migration is required. Do not delete Safari website data: local NPC portraits live in IndexedDB.

Open **Extensions → Vesperchain → General → NPC Management · Profiles & portraits**, or **Black Ledger → World → People**. Select a character/chat and enable tracking if prompted. Use **Create NPC** to author a profile before or during play, or select a recorded NPC to edit its identity, scope and portrait. Blank facts are saved as undisclosed (null).

For maintainers: bump `src/version.js`, package and manifest versions, point both manifest assets at the new `dist/<version>/` directory, run `npm run build`, and commit the generated files. Never reuse a published release directory for changed code. Integration tests load the shipped release files, and tests verify they match source.

## Entry points

| Setting | Behavior |
| --- | --- |
| Enable Vesperchain | Master switch. Disabling closes the interface and removes both optional launchers. Settings remain available. |
| Show Wand menu entry | Adds a Vesperchain button to the existing Wand menu. Enabled by default. |
| Show draggable launcher | Adds a movable SVG book button. Disabled by default. |
| Both off | Open the interface with the button in the Extensions drawer. |

The two launchers can be enabled independently. Drag the floating button with a mouse or touch. A drag does not also open the interface. Keyboard users can focus the button and use arrow keys (Shift for a larger move). Its position is saved relative to the viewport and clamped after resizing or rotation. **Reset launcher position** restores it. The launcher hides while the modal is open.

## Appearance and effects

All options are in the native Extensions drawer, under **General**, **Appearance**, and **Effects**. The drawer inherits SillyTavern’s font, theme colors and borders, with grouped settings. The ledger gear opens these same controls in a dedicated settings dialog above the current ledger page; closing settings returns to that page, without depending on a host drawer-toggle selector. Changes save automatically through SillyTavern and apply immediately.

- Obsidian / antique gold and Moonstone / silver palettes.
- English / Thai labels; comfortable or compact spacing; 14–20px base text size.
- Optional Cinzel, IM Fell English, and Noto Serif Thai web fonts, with system-serif fallbacks.
- Independent ambient mist, orbit, particles, edge glow, page transitions, and button press effects.
- Effect intensity and ambient speed controls.
- **Reduce all motion**, plus unconditional respect for the device's `prefers-reduced-motion` setting.

Ambient work pauses when the document is hidden or the interface is closed. The implementation uses CSS animations and bounded Web Animations; it has no continuous JavaScript rendering loop or automatic AI calls.

## Story ledger

The ledger fills the available browser viewport, with no outer modal margin. It adapts to visual viewport changes and safe-area insets; it does not invoke the browser Fullscreen API or hide browser chrome. The desktop workspace uses a compact sidebar. On phones, the same sections appear in a horizontally scrollable navigation bar, with a separate scrolling reading area and reachable close/settings controls. There are twelve pages, including species and purchase views:

| Section | Pages |
| --- | --- |
| Overview | Overview, Character |
| Collection | Collection, Research & training |
| Commerce | Contracts, Purchase offers, Ledger & business |
| World | People, Species index, World journal |
| Settings & saves | Checkpoints, Settings |

Overview shows the current scene, known resources, creature/people/project counts and up to three open contracts. Context links lead to the relevant page; **Continue in chat** closes the ledger without starting generation. Unknown resources are not replaced with starter values.

Scene, travel and time are combined into the scene summary. Shops/facilities share Collection with creatures and inventory. Branches appear in Ledger; routes, factions and knowledge appear in World journal. Auction notes remain journal notes. All stored entity categories remain accessible; this is a presentation change, not a campaign migration or a new simulation system.

Entity lists show a name, status/location and quantity, with longer details disclosed on demand. Completed/declined contracts are folded under Past contracts. Replay/save diagnostics live in Checkpoints, with a review link elsewhere when there is an issue. Reference-only prices, incubation schedules and lorebook counts are removed from navigation content.

Each section remembers the last page visited during the session. Native buttons support keyboard tab navigation, arrow keys, Home and End. The modal has persistent close/settings controls and Escape handling. Chat scene strips, NPC headers and narrative frames use compact spacing while retaining the selected presentation and host text colors.

## Chat mechanics

Enable **Tracking for this character** in Extensions → Vesperchain → General. Narrative actions, travel, purchases and exploration stay in Main Chat. The extension adds a structured tracking instruction to the existing generation, validates the returned record, and displays confirmed state. It makes no separate AI request. Missing facts remain unknown; missing records retain the last confirmed state.

- Toggle **Scene tracker** to show the selected Wayfarer’s Banner with historical location/date/period/weather above every AI message. New scenes do not overwrite old strips. Updates commit when generation finishes, not from partial streaming text.
- Toggle **Chat contracts** to display parchment agreements with wax seals under the offer message. Review terms, enter a signature, and confirm. After the story records completion evidence, a reviewed handover consumes required inventory and pays silver/XP once. Signed terms cannot be silently replaced.
- UI pages show actual scene, resources, inventory, creatures, shops, projects, people, factions, branches, routes and notes. These are trackers; they do not independently simulate world events.
- Edits, swipes and deletions replay the selected message history. Decisions anchored to removed/changed content are suspended, including derived payouts; Recovery explains rejected records and supports retrying a failed save.

| Scope | Stored data |
| --- | --- |
| Global | Appearance, launchers and display/prompt toggles |
| Character / group | Tracking opt-in and explicitly saved checkpoints |
| Chat | Campaign baseline, decision log, derived state and continuity notes |
| Message | Historical scene derived from that AI response and preceding records |

**New chats start fresh.** To continue, open Recovery → Checkpoints, name a checkpoint and write/review the important story notes. Open a new chat with the same character/group, review that checkpoint, and confirm before sending your first user message. The extension copies state and notes into an independent campaign; future changes cannot alter the original. Existing greeting messages are outside the imported timeline. Notes are included in subsequent normal generations. This preserves reviewed context, not the complete transcript or perfect model memory.

Checkpoints can be exported/imported as validated JSON and removed individually. Imports across different characters/groups are rejected. A maximum of 20 checkpoints per character/group is enforced. No automatic reset, import, signature, handover, or AI generation occurs when opening a panel.

## NPC Header and Dialogue

The selected **Court Chronicle** design uses a heraldic portrait frame, a personal-name header, and dialogue passages below it. Dialogue contains quoted speech only. Actions and narration render outside its border in their original order. Consecutive passages by the same NPC share one header, including narration between passages. Another speaker gets a new header. A user turn, invalid passage or missing profile resets grouping. Scene Tracker is separate and stays above each AI message.

- Main Chat text inherits SillyTavern's body, quote and emphasis colors live. The NPC surface is transparent so the user's chat background remains in control. There is no fixed black dialogue color.
- AI NPC creation/update requires every identity field: name, role, age, pronouns, species, appearance, personality, background, goals, relationship, status, location, plus a stable ID. Undisclosed facts must be explicit null. Personal names appear in the header; occupations belong to role. Common job-only names and incomplete profiles are rejected, with the original reply left readable.
- NPCs default to **Chat**. Open the NPC page or click a portrait to change that NPC to **Character**. Character profiles seed future chats under the same character/group; existing chats retain their historical snapshots. Demoting removes the reusable entry while keeping the current chat copy. The drawer also has a default scope for newly recorded NPCs.
- Upload a **PNG/JPEG**, maximum 6 MB / 16 megapixels. The extension lets you position/zoom the crop, then re-encodes once to 384 × 384, at most 200 KB. SVG, animated PNG and unrecognized formats are rejected; no AI-provided image URL is fetched.
- Uploaded portraits display in a 1:1 square with straight corners (72px desktop / 56px mobile). NPCs without an image retain the initials banner.
- Portraits use this browser's IndexedDB, lazy loading near visible messages, asynchronous decoding, fixed frame dimensions and a bounded object URL cache. They never enter AI prompts or chat JSON. Changing a profile scope copies its portrait. Images do **not** travel in checkpoint exports or automatically synchronize between devices; clearing site data removes them. Portrait upload/remove failures are visible in the profile panel.
- Drawer switches independently control NPC rendering and portraits. The underlying raw messages remain available for native editing. Rendering is text-only, with paragraphs, line breaks, quotes and single-asterisk emphasis; rich HTML/media inside marked NPC passages is not executed.

See [tracking protocol](docs/TRACKING.md) for the structured output contract and fallbacks.

## Storage and network

- Preferences are stored in `extensionSettings.vesperchain` using SillyTavern's settings persistence. This is independent of chat metadata.
- Campaign data uses `chatMetadata.vesperchainCampaign` and the host chat save API. Character settings/checkpoints use `extensionSettings.vesperchainProfiles` / `vesperchainArchives`. Raw message text is retained; the rendered machine block is hidden while tracking is enabled. Names and AI data are escaped before display.
- No telemetry, analytics, creator server, or extra model requests.
- Ornate fonts are enabled by default and request CSS/font files from Google Fonts. That service receives ordinary network metadata; no chat content or character name is included in those requests. Disable **Ornate EN / TH fonts** to remove the stylesheet and use system fonts. Already cached/downloaded files are not erased by this switch.
- Installation and updates use GitHub through SillyTavern.

## Development

```sh
npm install
npx playwright install chromium
npm run check
npm test
npm run test:browser
```

For an existing Chromium executable, set `VESPERCHAIN_CHROMIUM` for the browser test. Runtime has zero npm dependencies; Playwright is development-only.

Browser tests use a simulated SillyTavern host and cover all 12 routes at desktop, 390px, and 320px widths, deck memory, keyboard tabs, launchers, drag versus click, persistence, drawer handoff, escaped character names, font opt-out, reduced motion, and idempotent/remounted host elements. This is not a claim of a live SillyTavern or physical iPhone test. See [acceptance checks](docs/ACCEPTANCE.md).

## เริ่มใช้งาน

เปิด Extensions → Vesperchain แล้วเลือกว่าจะเปิด UI ผ่าน Wand menu, ปุ่มลอยลากได้ หรือทั้งสองแบบ ปิดทั้งสองปุ่มได้โดยยังเปิด UI จากหน้าตั้งค่าได้ตามปกติ ธีม ฟอนต์ ขนาดตัวอักษร และเอฟเฟกต์ทั้งหมดปรับได้จากแท็บตั้งค่าและบันทึกอัตโนมัติ

เปิดการติดตามสำหรับตัวละครก่อนเล่น ระบบจะเก็บสถานะแยกแชต แสดงฉากเหนือข้อความ AI และวางใบสัญญาใน Main Chat หากต้องการเล่นต่อในแชตใหม่ ให้สร้างจุดบันทึกและตรวจเรื่องย่อก่อนนำเข้า ระบบ Header/Dialogue ใช้แบบ Court Chronicle พร้อมสีข้อความตาม SillyTavern และภาพ NPC ที่ผู้ใช้เลือกเอง UI รุ่น 0.3.0 รวมหน้าที่ซ้ำกันและแสดงเฉพาะข้อมูลที่บันทึกจากเรื่องราว

The selected **Open Folio** narrative frame is installed in the chat renderer. Adjacent narration is grouped, remains outside dialogue, and never resets the current speaker. Plain narration-only replies also receive a frame; unlabelled speech and malformed markers fall back to native rendering rather than guessing a speaker. Disable the frame in Extensions → Vesperchain → General while keeping NPC dialogue; disabling NPC rendering restores native text entirely.

Scene, NPC and narrative text follow SillyTavern's `--mainFontFamily`, `--mainFontSize`, body/quote/emphasis colors and inherited line height. Heading and metadata sizes are proportional. Ornate fonts and extension text-size controls remain for the ledger, not these chat components. Decorative spacing stays extension-controlled. This is not a claim of compatibility with every custom CSS selector or Markdown feature: the safe NPC renderer supports text, paragraphs, quotations and emphasis, not arbitrary HTML or embedded media. Parchment contracts retain their own contrasting paper palette.

Portrait editing: select an image, drag directly in the square preview, and pinch with two fingers on mobile. Desktop also offers a zoom slider, mouse drag/wheel and keyboard arrows/+/- on the preview. Reset restores the centered crop; Cancel keeps the existing image. Only Use image saves the final 384px crop. The source image is temporary and is not retained after the editor closes.


## Tracking recovery (v0.3.1)

A rejected tracking record preserves the last confirmed state. It no longer prevents well-formed speaker passages from being shown as readable text: valid `[[vc:…]]` / `[[/vc]]` delimiters are removed in the display, without publishing unvalidated profiles or inventing a speaker. Native editing and disabling NPC presentation still expose the original transcript.

The scene strip offers **Review record** when a record is rejected. The review displays the field path, allowed fields and a read-only copy of the original JSON. Correct the record through SillyTavern’s native message editor; normal reconciliation revalidates the selected history. Unknown fields are still rejected atomically. The generation prompt now explicitly separates the read-only state snapshot from the permitted output fields.


## NPC authoring and species index (v0.4.0)

**World → People → Create NPC** works before the first AI reply as well as during play. Enter a personal name; other identity fields may be left blank. Edit, duplicate, search by name/role, filter by species, or export/import a complete profile as JSON. Import opens a reviewed creation form with a new ID; it never silently replaces an existing person. Scope and portraits remain in the profile panel. Character sharing copies identities into future chats; possession and progress do not carry over automatically.

**World → Species index** automatically collects species names from NPC profiles and the optional creature species field. Search the index, add a species, or edit its description, traits, habitat and notes. **Record lineage** selects two indexed parent species and an indexed outcome (or an unknown outcome for a theory). Records explicitly distinguish **Observed** from **Theory**. AI can record discoveries and outcomes from confirmed story events using the protocol. The index does not guarantee what another cross will produce, run a genetics simulation, or create offspring by itself. Actual new individuals must be established separately in the story and recorded as creatures/NPCs.

Player-created profiles, encyclopedia details and lineage records use the chat’s deterministic action log. Edits made before any AI response replay from the baseline; later edits are anchored to the current response. If that source is edited/swiped/deleted, dependent decisions are suspended for review rather than moved to a different history.

## Purchase offers and negotiation (v0.4.0)

When a known NPC requests an owned item, creature or individual, the AI records a **purchase offer** with buyer, target, quantity, terms and **total** silver price. A compact card appears at that message in Main Chat; **Commerce → Purchase offers** also lists open negotiations and folds completed ones away.

- **Counteroffer** records your total asking price and waits for a response. If the Main Chat composer is empty, it prepares a draft; it preserves an existing draft. Send your normal Main Chat message to continue the negotiation. There is no automatic extra AI request.
- The NPC may accept that exact price, propose another price, or decline. Each response must match the pending negotiation round. You can negotiate again, confirm a sale, or choose **Do not sell**.
- NPC acceptance is still only a price agreement. **Confirm sale & payment** transfers stock/possession and credits silver atomically, once. Unknown balance, insufficient stock, changed terms or a stale review prevent settlement. Historical cards show the latest negotiation state.
- Inventory uses quantity. A creature or NPC must have explicit possession, separate from simply being encountered; individual sales use quantity 1. Mark a creature’s possession in Collection, or use the NPC editor checkbox. Fictional owned people can be represented with the same mechanism. A transfer retains the individual’s identity and records the new holder; it does not delete the profile.
- Edits/swipes/deletions replay payouts and possessions together. UI sale and contract payouts are authoritative, and the protocol tells the AI not to pay them again.

## Main Chat money notices (v0.4.0)

A small receipt shows **Money received / Money spent**, signed silver amount and reason at the response or decision that changed funds. Confirmed transactions, contract handovers and sales generate receipts. First establishing an unknown balance does not count as income. Later absolute-balance corrections show as balance adjustments; pending offers and negotiation do not create receipts. Reconciliation avoids repeated receipts for duplicate records. General settings has independent switches for purchase cards and money notices.

Existing v1 campaigns and checkpoints remain readable; absent world-index fields are added in memory, without clearing site data. Updated checkpoints retain taxonomy, lineage and pending purchase negotiations. Older extension releases cannot understand the new optional domains in an updated checkpoint; use v0.4.0 to continue those exports.


## Mobile toolbar fix (v0.4.1)

Species and NPC search bars use a full-width search row on phones. Actions use two columns, or full-width rows at 360px and below. Search inputs keep a normal control height instead of stretching to match squeezed button labels. Desktop actions keep their natural width. Regression coverage checks control positions and heights, empty and populated rosters, Thai/English labels, 16/20px text, compact spacing, and portrait/landscape widths; horizontal overflow alone does not detect a vertically crushed button.
