# Host and device acceptance

Automated tests exercise a browser-host fixture. Before treating this as a live-host release, verify these on the target SillyTavern version and physical mobile browser:

- Install the implementation branch, reload, and confirm one Vesperchain settings panel and one default Wand entry.
- Open from Wand, close with Escape / close control, and confirm the host Wand menu remains usable.
- Turn off Wand, turn on floating launcher, drag it, rotate the device, reload, and verify a reachable position. Test pointer cancellation during drag.
- Turn both launchers off and open from Extensions. Disable the extension and verify no launcher remains.
- Switch both themes, fonts, language, density, and 14–20px text. Verify font fallback when Google Fonts is blocked.
- Toggle every effect independently. Set intensity to zero, reduce motion in the device settings, and background the browser. No ambient animation should continue when reduced or hidden.
- Visit all five decks / sixteen pages, test tab keyboard navigation, and use the header settings shortcut. No text should escape the modal at 320px width.
- Switch characters with the interface open. The header should update without modifying chat metadata or transcript.
- Confirm preferences survive a SillyTavern restart and updates. Campaign state must remain unchanged.

## Scope

Only interface preferences persist in v0.1.0. Game mechanics, AI output contracts, business transactions, and campaign import/export require a separately defined state model. Read-only reference content is deliberately labeled as such.
