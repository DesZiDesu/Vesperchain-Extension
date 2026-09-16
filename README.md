# Vesperchain — The Black Ledger

**v0.2.0 · Chat mechanics and NPC presentation**

A dark-fantasy interface with layered tab decks, original SVG marks, optional animated atmosphere, and persistent interface preferences. English and Thai interface labels are included.

## Installation

After this change is on your installation branch, open SillyTavern → Extensions → Install extension and use:

```text
https://github.com/DesZiDesu/Vesperchain-Extension
```

Reload SillyTavern. Open **Extensions → Vesperchain** to configure it. No runtime npm install, API key, or build step is required. Requires a modern browser with native dialog/Pointer Events support and SillyTavern's public `SillyTavern.getContext()` API, including `extensionSettings` and `saveSettingsDebounced`.

This version includes chat mechanics, scoped NPC profiles, local portraits, and the selected Scene / Narrative / Dialogue presentation.

## Entry points

| Setting | Behavior |
| --- | --- |
| Enable Vesperchain | Master switch. Disabling closes the interface and removes both optional launchers. Settings remain available. |
| Show Wand menu entry | Adds a Vesperchain button to the existing Wand menu. Enabled by default. |
| Show draggable launcher | Adds a movable SVG book button. Disabled by default. |
| Both off | Open the interface with the button in the Extensions drawer. |

The two launchers can be enabled independently. Drag the floating button with a mouse or touch. A drag does not also open the interface. Keyboard users can focus the button and use arrow keys (Shift for a larger move). Its position is saved relative to the viewport and clamped after resizing or rotation. **Reset launcher position** restores it. The launcher hides while the modal is open.

## Appearance and effects

All options are in the native Extensions drawer, under **General**, **Appearance**, and **Effects**. Changes save automatically through SillyTavern and apply immediately.

- Obsidian / antique gold and Moonstone / silver palettes.
- English / Thai labels; comfortable or compact spacing; 14–20px base text size.
- Optional Cinzel, IM Fell English, and Noto Serif Thai web fonts, with system-serif fallbacks.
- Independent ambient mist, orbit, particles, edge glow, page transitions, and button press effects.
- Effect intensity and ambient speed controls.
- **Reduce all motion**, plus unconditional respect for the device's `prefers-reduced-motion` setting.

Ambient work pauses when the document is hidden or the interface is closed. The implementation uses CSS animations and bounded Web Animations; it has no continuous JavaScript rendering loop or automatic AI calls.

## Tab decks

| Deck | Pages |
| --- | --- |
| Chronicle | Overview, Scene, Character |
| Domain | Shop, Collection, Research |
| Commerce | Ledger, Contracts, Auction, Branches |
| Avarenth | Travel, Time, NPCs, Codex |
| Sanctum | Recovery, Settings |

Each deck remembers the last page visited during the session. Native buttons support keyboard tab navigation, arrow keys, Home, and End. The modal has a persistent close control and Escape handling. The settings shortcut returns to the Extensions drawer.

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
- Upload a **PNG/JPEG**, maximum 6 MB / 16 megapixels. The extension center-crops and re-encodes once to 384 × 384, at most 200 KB. SVG, animated PNG and unrecognized formats are rejected; no AI-provided image URL is fetched.
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

Browser tests use a simulated SillyTavern host and cover all 16 routes at desktop, 390px, and 320px widths, deck memory, keyboard tabs, launchers, drag versus click, persistence, drawer handoff, escaped character names, font opt-out, reduced motion, and idempotent/remounted host elements. This is not a claim of a live SillyTavern or physical iPhone test. See [acceptance checks](docs/ACCEPTANCE.md).

## เริ่มใช้งาน

เปิด Extensions → Vesperchain แล้วเลือกว่าจะเปิด UI ผ่าน Wand menu, ปุ่มลอยลากได้ หรือทั้งสองแบบ ปิดทั้งสองปุ่มได้โดยยังเปิด UI จากหน้าตั้งค่าได้ตามปกติ ธีม ฟอนต์ ขนาดตัวอักษร และเอฟเฟกต์ทั้งหมดปรับได้จากแท็บตั้งค่าและบันทึกอัตโนมัติ

เปิดการติดตามสำหรับตัวละครก่อนเล่น ระบบจะเก็บสถานะแยกแชต แสดงฉากเหนือข้อความ AI และวางใบสัญญาใน Main Chat หากต้องการเล่นต่อในแชตใหม่ ให้สร้างจุดบันทึกและตรวจเรื่องย่อก่อนนำเข้า ระบบ Header/Dialogue ใช้แบบ Court Chronicle พร้อมสีข้อความตาม SillyTavern และภาพ NPC ที่ผู้ใช้เลือกเอง งานรุ่นนี้ยังไม่เผยแพร่ไป main

The selected **Open Folio** narrative frame is installed in the chat renderer. Adjacent narration is grouped, remains outside dialogue, and never resets the current speaker. Plain narration-only replies also receive a frame; unlabelled speech and malformed markers fall back to native rendering rather than guessing a speaker. Disable the frame in Extensions → Vesperchain → General while keeping NPC dialogue; disabling NPC rendering restores native text entirely.

Scene, NPC and narrative text follow SillyTavern's `--mainFontFamily`, `--mainFontSize`, body/quote/emphasis colors and inherited line height. Heading and metadata sizes are proportional. Ornate fonts and extension text-size controls remain for the drawer/decks, not these chat components. Decorative spacing stays extension-controlled. This is not a claim of compatibility with every custom CSS selector or Markdown feature: the safe NPC renderer supports text, paragraphs, quotations and emphasis, not arbitrary HTML or embedded media. Parchment contracts retain their own contrasting paper palette.
