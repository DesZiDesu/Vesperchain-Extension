const assert = require('node:assert/strict');
module.exports = async function recoverySuite(browser, base) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(base + '/tests/tracking-host.html');
    await p.locator('[data-character-tracking]').check();
    const record = { version: 1, eventId: 'jet-arrival', baseRevision: 0,
        scene: { city: 'Elysium', place: 'Northern road', day: 1 },
        resources: { silver: 80 },
        scope: 'this chat only',
        npcProfiles: [{ id: 'jet', name: 'Jet', role: 'Traveller', age: '25', pronouns: 'he/him', species: 'Human', appearance: 'Round glasses', personality: 'Weary', background: 'Travels north', goals: 'Reach the city', relationship: 'Acquaintance', status: 'Walking', location: 'Northern road' }]
    };
    const narrative = 'เจตถอนหายใจ\n\n[[vc:jet]]"โอเค ไปกัน"[[/vc]]\n\nเขาเดินนำไปทางเหนือ';
    await p.evaluate(async ({record, narrative}) => fixture.add(record, false, narrative), {record, narrative});
    const result = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult());
    assert.equal(result.state.resources.silver, null);
    assert.equal(result.state.scene.city, null);
    assert.equal(Object.keys(result.state.entities.npcs).length, 0, 'rejected profiles must not be trusted');
    assert.equal(await p.locator('.vc-npc-message').count(), 1);
    assert.equal(await p.locator('.vc-npc-header').count(), 0);
    assert.ok((await p.locator('.vc-npc-message').innerText()).includes('โอเค ไปกัน'));
    assert.ok(!(await p.locator('.vc-npc-message').innerText()).includes('[[vc:'));
    assert.ok(await p.evaluate(() => SillyTavern.getContext().chat[0].mes.includes('[[vc:jet]]')), 'the raw transcript stays intact');
    await p.locator('[data-record-review]').click();
    assert.ok((await p.locator('.vc-record-review').innerText()).includes('record.scope'));
    assert.ok((await p.locator('.vc-record-review textarea').inputValue()).includes('"scope"'));
    await p.locator('[data-review-close]').click();
    // Native editing remains available; a corrected record restores scene and named presentation.
    await p.evaluate(() => {
        document.querySelector('.mes').append(document.createElement('textarea'));
        document.querySelector('.mes textarea').className = 'mes_edit_textarea';
    });
    await p.waitForFunction(() => !document.querySelector('.vc-npc-original'));
    await p.evaluate(async ({record, narrative}) => {
        delete record.scope;
        SillyTavern.getContext().chat[0].mes = narrative + '\n```vesperchain\n' + JSON.stringify(record) + '\n```';
        fixture.render(); await fixture.emit('MESSAGE_EDITED', 0);
    }, {record, narrative});
    await p.locator('.vc-npc-header h3').waitFor();
    assert.equal(await p.locator('.vc-npc-header h3').innerText(), 'Jet');
    assert.equal(await p.locator('[data-record-review]').count(), 0);
    assert.ok((await p.locator('.vc-message-tracker').innerText()).includes('Elysium'));
    assert.equal(await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult().state.resources.silver), 80);
    const prompt = await p.evaluate(() => SillyTavern.getContext().extensionPrompts['vesperchain-main-chat-v1']);
    assert.ok(prompt.includes('ONLY allowed top-level fields'));
    assert.ok(prompt.includes('scope, contracts, seen and npcScopes are NOT output fields'));
    await p.locator('[data-command=open]').click();
    for (const [width, height] of [[1180, 900], [390, 844], [320, 480], [844, 390]]) {
        await p.setViewportSize({width, height});
        await p.waitForFunction(({width, height}) => { const r = document.querySelector('#vesperchain-dialog').getBoundingClientRect(); return Math.abs(r.width - width) < 1 && Math.abs(r.height - height) < 1; }, {width, height});
        const box = await p.locator('#vesperchain-dialog').boundingBox();
        assert.ok(Math.abs(box.x) < 1 && Math.abs(box.y) < 1);
        assert.ok(Math.abs(box.width - width) < 1 && Math.abs(box.height - height) < 1, 'ledger fills available viewport');
        for (const selector of ['.vc-header [data-command=close]', '.vc-footer']) {
            const control = await p.locator(selector).boundingBox();
            assert.ok(control.y >= 0 && control.y + control.height <= height + 1, 'controls stay reachable during keyboard/orientation changes');
        }
    }
    await p.screenshot({path: require('node:path').join(__dirname, '../test-results/fullscreen-landscape.png'), animations:'disabled'});
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: fullscreen viewport, resize controls, rejected-record plain speech, raw editing, review diagnostics and corrected-record recovery.');
};
