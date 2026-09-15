# Vesperchain — The Black Ledger

**v0.1.0 · Interface foundation for SillyTavern**

A dark-fantasy interface with layered tab decks, original SVG marks, optional animated atmosphere, and persistent interface preferences. English and Thai interface labels are included.

## Installation

After this change is on your installation branch, open SillyTavern → Extensions → Install extension and use:

```text
https://github.com/DesZiDesu/Vesperchain-Extension
```

Reload SillyTavern. Open **Extensions → Vesperchain** to configure it. No runtime npm install, API key, or build step is required. Requires a modern browser with native dialog/Pointer Events support and SillyTavern's public `SillyTavern.getContext()` API, including `extensionSettings` and `saveSettingsDebounced`.

If reviewing an unmerged branch, check out `feat/interface-foundation` in the installed extension directory before reloading. The default repository URL installs the default branch; it does not automatically install an unmerged PR.

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

**This release implements the settings, launchers, and UI shell.** Reference panels describe the supplied Vesperchain lore, but do not start a campaign, create items, accept contracts, change resources, parse AI responses, or perform campaign saves/recovery. Game-state integration is a separate next phase. No fabricated campaign balances are stored.

## Storage and network

- Preferences are stored in `extensionSettings.vesperchain` using SillyTavern's settings persistence. This is independent of chat metadata.
- No chat messages or campaign metadata are modified. The current character display name is read for the UI header and escaped before display.
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

รุ่นนี้เป็นโครงสร้าง UI ที่ติดตั้งได้จริง ระบบจำลองเกม การรับข้อมูลจาก AI และการบันทึกแคมเปญยังไม่เชื่อมต่อ ข้อมูลบนหน้าระบบเป็นข้อมูลอ้างอิงจาก Lorebook ไม่ใช่สถานะเกมที่สร้างขึ้นใหม่
