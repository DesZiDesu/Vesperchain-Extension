# Host and device acceptance

Automated tests exercise a browser-host fixture. Before treating this as a live-host release, verify these on the target SillyTavern version and physical mobile browser:

- Install the implementation branch, reload, and confirm one Vesperchain settings panel and one default Wand entry.
- Open from Wand, close with Escape / close control, and confirm the host Wand menu remains usable.
- Turn off Wand, turn on floating launcher, drag it, rotate the device, reload, and verify a reachable position. Test pointer cancellation during drag.
- Turn both launchers off and open from Extensions. Disable the extension and verify no launcher remains.
- Switch both themes, fonts, language, density, and 14–20px text. Verify font fallback when Google Fonts is blocked.
- Toggle every effect independently. Set intensity to zero, reduce motion in the device settings, and background the browser. No ambient animation should continue when reduced or hidden.
- Visit all five sections / ten pages, test tab keyboard navigation, and use the header settings shortcut. No text should escape the modal at 320px width.
- Switch characters with the interface open. The header should update; each character must keep its own campaign state and the raw transcript must remain intact.
- Confirm preferences survive a SillyTavern restart and updates. Campaign state must remain unchanged.

## Mechanics acceptance

- Enable tracking only for the intended character. A fresh chat has unknown resources and no inherited contracts. Other characters remain unaffected.
- Generate a valid record, inspect its historical scene above the AI message, then travel in Main Chat. Only the new message shows the new scene.
- Sign a parchment contract, complete its objective in the story, review handover, and reload. Inventory/payment must settle exactly once.
- Save a checkpoint with reviewed continuity, open a fresh same-character chat, import, and continue. Reopen the source: its state must be unchanged.
- Export/reimport a checkpoint; reject malformed and cross-character files. Remove a checkpoint without changing any campaign.
- Edit, swipe, regenerate, and delete a message supporting a signed contract. Verify suspended decisions and rejected records in Recovery; no silent duplicated payout.
- Interrupt streaming: no partial machine record should commit. A completed response without a record carries prior scene values.
- Toggle scene strips, parchment cards, prompt injection, per-character tracking and master enable. Raw message content must remain intact.
- Simulate a failed host save; the visible error must persist until retry succeeds.

Automated: 24 pure tests plus the browser integration cover historical replay, atomic validation, duplicate prevention, signature/handover, reload, independent continuation, regeneration, opt-in and toggles. The existing browser suite covers all 10 routes at three widths and launcher/settings behavior. Live-host/model compliance and physical devices still require the checks above. NPC browser integration additionally checks speaker runs, live host colors, portrait upload/rejection, scope promotion/demotion, reload, native editing, toggles and 1000/390/320px chat layouts.


## NPC live-host checks

- Ask the model for two named NPCs with complete profiles, with the first speaking three paragraphs before the second. Check one header per run and scene tracking above the entire AI message.
- Change SillyTavern body, quote and emphasis colors under both a light and dark theme; confirm no fixed dialogue text color remains.
- Assign a portrait, reload and scroll far away/back. Toggle portraits without changing profiles. Try a non-image and an oversized image; the current portrait must remain usable.
- Promote Chat to Character, start a new chat, and confirm that NPC is reusable while campaign scene/resources remain fresh. Demote and start another chat; the entry must no longer be seeded. Check the original chat retains its historical identity.
- Regenerate, swipe, edit and delete speaker passages; no stale duplicate header or hidden native editor should remain. NPC rendering waits until generation ends; the last committed layout is stable during streaming.
- Verify local portraits remain excluded from checkpoint exports and prompts. A new device needs a new portrait upload.

- Portrait crop editor: drag and wheel/slider on desktop; direct one-finger drag and two-finger pinch on mobile with no slider. Verify reset, cancel, close and chat switch preserve the old image until Use image. Browser coverage includes mouse drag, CDP touch pinch/pan, saved 384px output and cancel/close preservation. Check gestures on physical iOS/Android devices too.


## Compact ledger acceptance (v0.3.0)

- Open the ledger with no selected chat, with tracking off, and in a fresh tracked chat. One clear next action should appear; unknown resources must not show invented starter values.
- Populate all entity categories. Check creatures/inventory/shops in Collection, projects in Research, branches in Ledger, and notes/factions/routes in World journal. NPCs remain available in People. Opening and navigating these views must not write campaign state.
- On desktop, the sidebar and close/settings controls remain visible while the reading area scrolls. At 390px and 320px, scroll the horizontal section bar to every section, and scroll page content independently.
- Open an entity's Details, inspect past contracts, use the Overview contract links and Continue in chat. The latter closes the modal without requesting a generation.
- Inspect both palettes, compact/comfortable density, Thai/English and 20px text. Verify no horizontal content overflow and that keyboard selection follows the visible section.
- New browser integration additionally checks populated views at three widths, escaped entity names, retention of every entity category, unknown resources and navigation without campaign writes. Screenshots from the fixture are stored in test-results/ledger-desktop.png and ledger-mobile.png; they are not live-host results.


## Fullscreen and rejected-record acceptance (v0.3.1)

- Open the ledger at desktop/phone widths and in landscape. It should fill the browser viewport while the header close/settings buttons and footer remain reachable.
- On physical mobile browsers, open the keyboard, rotate and pinch-zoom; verify visual viewport updates, safe-area spacing and independent page scrolling. Fullscreen is a webpage layout, not a request to hide browser chrome.
- Add a well-formed NPC passage with an unknown JSON field. It should show readable speech without markers or an invented header, and retain the last confirmed scene/resources/profiles.
- Open Review record, copy the JSON, verify the reported field path, then correct the native message. Scene tracking and validated NPC presentation should recover. Editing, toggles and streaming must still expose/retain the correct original text.
- Automated coverage verifies unknown top-level/nested fields reject atomically, a rejected first NPC reply stays readable, the review shows its original JSON, native correction restores state and fullscreen bounds/controls follow portrait, landscape and short viewport changes.


## v0.4.0 additions

Unit coverage includes manual NPC authoring before generation, stale edit protection, species identity reuse, observed/theory lineage, sale ownership and stock, repeated negotiation rounds, explicit settlement, duplicate/rejected receipts, source edits and old/new checkpoint round trips. Browser coverage uses the shipped release to create/edit/search NPCs, record lineage, negotiate twice, accept/decline offers, verify receipts and reload, exercise 320px layouts, and open the host-themed settings gear without a host drawer toggle. This is simulated-host coverage, not a physical-device or live-installation claim.

## Mobile toolbar acceptance (v0.4.1)

- At phone widths, Species and NPC search fill their own row. Action labels remain readable in two columns, or one column at 360px and below. Search must not stretch to match an action's height.
- Check empty and populated lists, Thai/English labels, 16/20px text, comfortable/compact spacing, and portrait/landscape. Search, authoring and lineage controls must remain functional.
- Automated browser coverage measures control widths, heights and positions at 320, 390, 430, 600, 844 and 1180px. It catches the previously missed vertical-label failure, as well as horizontal overflow. Repeat on physical mobile browsers with the live host's fonts and theme.


## Player guide acceptance (v0.5.0)

- Open help from the drawer, ledger footer and Settings & saves. With no selected character or tracking off, the same contents and chapters must remain readable. The extension’s master switch still controls opening the ledger.
- Use contents cards, topic selector, Previous/Next and Contents. Confirm first/last bounds, correct page counter, heading focus and reading reset. Close/reopen or follow a contextual page link and return; the session’s chapter should remain selected.
- Check all 14 chapters in Thai/English at 16/20px text on narrow phones, desktop and short landscape viewports. Reading must scroll without covering the visible topic/page controls. Gear settings must close correctly when opening help from the embedded drawer.
- Confirm help alone does not create a campaign, opt into tracking, change funds/possessions, append actions/messages, or generate a model response.
- Automated simulated-host coverage exercises these navigation/layout/state checks at 320, 390, 844 and 1180px. Physical-device/live-host checks remain necessary; screenshots are fixture previews.
