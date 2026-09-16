# Host and device acceptance

Automated tests exercise a browser-host fixture. Before treating this as a live-host release, verify these on the target SillyTavern version and physical mobile browser:

- Install the implementation branch, reload, and confirm one Vesperchain settings panel and one default Wand entry.
- Open from Wand, close with Escape / close control, and confirm the host Wand menu remains usable.
- Turn off Wand, turn on floating launcher, drag it, rotate the device, reload, and verify a reachable position. Test pointer cancellation during drag.
- Turn both launchers off and open from Extensions. Disable the extension and verify no launcher remains.
- Switch both themes, fonts, language, density, and 14–20px text. Verify font fallback when Google Fonts is blocked.
- Toggle every effect independently. Set intensity to zero, reduce motion in the device settings, and background the browser. No ambient animation should continue when reduced or hidden.
- Visit all five decks / sixteen pages, test tab keyboard navigation, and use the header settings shortcut. No text should escape the modal at 320px width.
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

Automated: 22 pure tests plus the browser integration cover historical replay, atomic validation, duplicate prevention, signature/handover, reload, independent continuation, regeneration, opt-in and toggles. The existing browser suite covers all 16 routes at three widths and launcher/settings behavior. Live-host/model compliance and physical devices still require the checks above. NPC browser integration additionally checks speaker runs, live host colors, portrait upload/rejection, scope promotion/demotion, reload, native editing, toggles and 1000/390/320px chat layouts.


## NPC live-host checks

- Ask the model for two named NPCs with complete profiles, with the first speaking three paragraphs before the second. Check one header per run and scene tracking above the entire AI message.
- Change SillyTavern body, quote and emphasis colors under both a light and dark theme; confirm no fixed dialogue text color remains.
- Assign a portrait, reload and scroll far away/back. Toggle portraits without changing profiles. Try a non-image and an oversized image; the current portrait must remain usable.
- Promote Chat to Character, start a new chat, and confirm that NPC is reusable while campaign scene/resources remain fresh. Demote and start another chat; the entry must no longer be seeded. Check the original chat retains its historical identity.
- Regenerate, swipe, edit and delete speaker passages; no stale duplicate header or hidden native editor should remain. NPC rendering waits until generation ends; the last committed layout is stable during streaming.
- Verify local portraits remain excluded from checkpoint exports and prompts. A new device needs a new portrait upload.

- Portrait crop editor: drag and wheel/slider on desktop; direct one-finger drag and two-finger pinch on mobile with no slider. Verify reset, cancel, close and chat switch preserve the old image until Use image. Browser coverage includes mouse drag, CDP touch pinch/pan, saved 384px output and cancel/close preservation. Check gestures on physical iOS/Android devices too.
