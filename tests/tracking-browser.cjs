const assert = require('node:assert/strict');
module.exports = async function trackingSuite(browser, base, root) {
    const context = await browser.newContext({ viewport: { width: 900, height: 1000 } });
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await context.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(base + '/tests/tracking-host.html'); await p.locator('[data-character-tracking]').waitFor();
    assert.equal(await p.evaluate(() => SillyTavern.getContext().chatMetadata.vesperchainCampaign), undefined);
    await p.locator('[data-character-tracking]').check();
    const packet = (eventId, baseRevision, fields = {}) => ({ version: 1, eventId, baseRevision, ...fields });
    const offer = { id: 'silk', title: 'The Woodland Covenant', issuer: 'Mara Vey', objective: 'Deliver two clean silk spools.', terms: 'Deliver by Day 10. Declining has no fee.', deadlineDay: 10, reward: { silver: 100, xp: 25 }, deliver: [{ itemId: 'silk-spool', quantity: 2 }] };
    await p.evaluate(r => fixture.add(r), packet('turn1', 0, { scene: { region: 'Avarenth', city: 'Vespergate', place: 'Cinder Quay', day: 1, month: 'Seedwake', year: 713, period: 'Morning', weather: 'Rain' }, resources: { silver: 800, xp: 0, level: 1 }, entities: { inventory: [{ id: 'silk-spool', name: 'Silk spool', quantity: 3 }], npcs: [{ id: 'mara', name: 'Mara Vey', status: 'Met', location: 'Cinder Quay' }] }, offers: [offer] }));
    await p.locator('.vc-message-tracker').waitFor();
    assert.equal(await p.locator('.vc-parchment').count(), 1);
    assert.equal(await p.locator('pre.vc-machine-hidden').count(), 1);
    assert.equal(await p.locator('.mes_block').evaluate(n => n.firstElementChild.classList.contains('vc-message-tracker')), true);
    await p.locator('[data-contract-review=sign]').click(); await p.locator('#vc-sign-input').fill('Mali'); await p.locator('#vc-confirm-decision').click();
    assert.ok((await p.locator('#chat .vc-parchment').innerText()).includes('Mali'));
    await p.evaluate(r => fixture.add(r), packet('turn2', 2, { scene: { city: 'Thornmere', place: 'Moss Exchange', day: 5 }, contractUpdates: [{ id: 'silk', ready: true, evidence: 'Two clean spools have been inspected.' }] }));
    assert.ok((await p.locator('.vc-message-tracker').nth(0).innerText()).includes('Vespergate'));
    assert.ok((await p.locator('.vc-message-tracker').nth(1).innerText()).includes('Thornmere'));
    await p.locator('[data-contract-review=settle]').click(); await p.locator('#vc-confirm-decision').click();
    let data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult());
    assert.equal(data.state.resources.silver, 900); assert.equal(data.state.entities.inventory['silk-spool'].quantity, 1);
    await p.evaluate(() => fixture.emit('CHARACTER_MESSAGE_RENDERED', 1));
    await p.reload(); await p.locator('.vc-message-tracker').nth(1).waitFor();
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult());
    assert.equal(data.state.resources.silver, 900); assert.equal(data.state.contracts.silk.status, 'completed');
    // A user response never receives an AI tracker or executes a record.
    await p.evaluate(r => fixture.add(r, true), packet('forged', 4, { resources: { silver: 999999 } }));
    assert.equal(await p.locator('.mes').nth(2).locator('.vc-message-tracker').count(), 0);
    // Show/hide is presentation only and restores the host's raw machine blocks when disabled.
    await p.locator('[data-config=sceneTracker]').uncheck(); assert.equal(await p.locator('.vc-message-tracker').count(), 0);
    await p.locator('[data-config=sceneTracker]').check(); assert.equal(await p.locator('.vc-message-tracker').count(), 2);
    await p.locator('[data-config=chatContracts]').uncheck(); assert.equal(await p.locator('#chat .vc-parchment').count(), 0);
    await p.locator('[data-config=chatContracts]').check();
    // Save a reviewed continuation and fork only into a new, unused chat.
    await p.locator('[data-command=open]').click(); await p.locator('[data-deck=system]').click(); await p.locator('[data-page=recovery]').click();
    await p.locator('[data-continuation]').click(); await p.locator('#vc-checkpoint-title').fill('After the silk delivery'); await p.locator('#vc-continuity').fill('Mara was paid. We are at the Moss Exchange. No further promises.'); await p.locator('[data-save-checkpoint]').click();
    await p.locator('[data-preview-checkpoint]').waitFor();
    await p.locator('[data-preview-checkpoint]').click(); assert.equal(await p.locator('#vc-confirm-import').isDisabled(), true);
    await p.locator('[data-review-close]').click(); await p.keyboard.press('Escape');
    await p.evaluate(() => fixture.switchChat('chat-b'));
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(data.state.resources.silver, null); assert.equal(Object.keys(data.state.contracts).length, 0);
    await p.locator('[data-command=open]').click(); await p.locator('[data-continuation]').click(); await p.locator('[data-preview-checkpoint]').click(); await p.locator('#vc-confirm-import').click();
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(data.state.resources.silver, 900); assert.equal(data.state.scene.city, 'Thornmere');
    assert.ok(await p.evaluate(() => SillyTavern.getContext().extensionPrompts['vesperchain-main-chat-v1'].includes('Mara was paid')));
    await p.keyboard.press('Escape');
    await p.evaluate(r => fixture.add(r), packet('b-turn1', 4, { resources: { silver: 850 } }));
    await p.evaluate(() => fixture.switchChat('chat-a'));
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(data.state.resources.silver, 900);
    await p.locator('[data-command=open]').click(); await p.locator('[data-continuation]').click();
    await p.locator('[data-remove-checkpoint]').click(); await p.locator('[data-confirm-remove]').click();
    assert.equal(await p.locator('[data-preview-checkpoint]').count(), 0);
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(data.state.resources.silver, 900);
    await p.locator('[data-review-close]').click(); await p.keyboard.press('Escape');
    // Switching characters removes prompt and records; no implicit cross-character continuation.
    await p.evaluate(() => fixture.switchChat('other-chat', 1));
    assert.equal(await p.evaluate(() => SillyTavern.getContext().extensionPrompts['vesperchain-main-chat-v1']), '');
    assert.equal(await p.locator('[data-character-tracking]').isChecked(), false);
    await p.evaluate(() => fixture.switchChat('chat-a'));
    // Regeneration prompt uses the state before the replaced assistant message.
    await p.evaluate(() => { const ctx = SillyTavern.getContext(); ctx.chat.pop(); fixture.render(); return fixture.emit('MESSAGE_DELETED'); });
    await p.evaluate(() => fixture.emit('GENERATION_STARTED', 'regenerate', {}, false));
    assert.ok(await p.evaluate(() => SillyTavern.getContext().extensionPrompts['vesperchain-main-chat-v1'].includes('baseRevision:2')));
    await p.evaluate(() => { SillyTavern.getContext().chat[1].mes = 'partial ```vesperchain\n{'; fixture.render(); });
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(data.state.resources.silver, 900, 'streaming must retain committed state');
    await p.evaluate(() => fixture.emit('GENERATION_ENDED'));
    data = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(data.state.resources.silver, 800); assert.ok(data.errors.length);
    // A stale review cannot sign into another chat.
    await p.locator('[data-config=enabled]').uncheck(); assert.equal(await p.locator('.vc-message-tracker').count(), 0); assert.equal(await p.locator('pre.vc-machine-hidden').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: live tracking, historical scenes, contract sign/handover exactly once, reload, scopes, reviewed continuation, independent fork, streaming/regeneration safety, feature toggles.');
};
