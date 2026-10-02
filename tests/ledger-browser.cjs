const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async function ledgerSuite(browser, base, root) {
    const context = await browser.newContext({ viewport: { width: 1180, height: 900 } });
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(base + '/tests/tracking-host.html');
    await p.locator('[data-character-tracking]').check();
    await p.locator('[data-command=open]').click();
    assert.equal(await p.locator('.vc-stat-grid').count(), 0, 'unknown resources must not become starter values');
    assert.ok((await p.locator('#vc-page').innerText()).includes('รอฉากแรก'));
    await p.keyboard.press('Escape');
    const groups = ['inventory', 'creatures', 'shops', 'projects', 'factions', 'branches', 'routes', 'notes'];
    await p.evaluate(async groups => {
        await fixture.add({ version: 1, eventId: 'ledger-ui-1', baseRevision: 0,
            scene: { region: 'Avarenth', city: 'Vespergate', place: 'Cinder Quay', day: 8, period: 'Evening', weather: 'Mist' },
            resources: { silver: 640, hp: 85, maxHp: 100, stamina: 62, maxStamina: 100, mana: 24, maxMana: 30, level: 2, xp: 45 },
            entities: Object.fromEntries(groups.map(kind => [kind, [{ id: kind + '-one', name: kind === 'creatures' ? 'Ashwing <img src=x onerror=alert(1)>' : kind + ' record', status: 'Recorded', location: 'Cinder Quay', details: 'Confirmed details for ' + kind, ...(kind === 'inventory' ? { quantity: 4 } : {}) }]])),
            npcProfiles: [{ id: 'mara', name: 'Mara Vey', role: 'Naturalist', age: '34', pronouns: 'she/her', species: 'Human', appearance: 'Dark hair', personality: 'Reserved', background: 'Studies the quay', goals: 'Preserve rare lineages', relationship: 'Acquaintance', status: 'Working', location: 'Cinder Quay' }],
            offers: [{ id: 'ashwing', title: 'The Ashwing Accord', issuer: 'Mara Vey', objective: 'Observe the ashwing.', terms: 'Report by Day 12.', deadlineDay: 12, reward: { silver: 120, xp: 20 }, deliver: [] }]
        });
    }, groups);
    await p.locator('[data-command=open]').click();
    assert.ok((await p.locator('.vc-overview-scene').innerText()).includes('Cinder Quay'));
    assert.ok((await p.locator('.vc-stat-grid').innerText()).includes('640'));
    assert.equal(await p.locator('.vc-contract-link').count(), 1);
    assert.equal(await p.locator('#vc-page').getByRole('button', { name: 'จุดบันทึก', exact: true }).count(), 1);
    for (const width of [1180, 390, 320]) {
        await p.setViewportSize({ width, height: 900 });
        assert.equal(await p.locator('.vc-decks').getAttribute('aria-orientation'), width > 700 ? 'vertical' : 'horizontal');
        for (const [deck, route, expected] of [['domain', 'stock', ['creatures', 'inventory', 'shops']], ['domain', 'research', ['projects']], ['commerce', 'ledger', ['branches']], ['world', 'codex', ['notes', 'factions', 'routes']]]) {
            await p.locator(`[data-deck=${deck}]`).click();
            await p.locator(`.vc-tabs [data-page=${route}]`).click();
            for (const kind of expected) assert.equal(await p.locator(`[data-entity-group=${kind}]`).count(), 1, `${kind} must remain reachable`);
            assert.equal(await p.locator('#vc-page img').count(), 0, 'AI names remain escaped');
            if (route === 'stock' && width === 1180) {
                const detail = p.locator('[data-entity-group=creatures] details');
                assert.equal(await detail.evaluate(n => n.open), false);
                await detail.locator('summary').click();
                assert.ok((await detail.innerText()).includes('Confirmed details for creatures'));
            }

            assert.equal(await p.locator('#vc-page').evaluate(n => n.scrollWidth > n.clientWidth + 1), false, `${route} content overflows at ${width}`);
            assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.scrollWidth > n.clientWidth + 1), false);
        }
        await p.locator('[data-deck=chronicle]').click();
        await p.locator('.vc-tabs [data-page=home]').click();
        assert.equal(await p.locator('#vc-page').evaluate(n => n.scrollWidth > n.clientWidth + 1), false, `overview overflows at ${width}`);
        if (width !== 320) await p.screenshot({ path: path.join(root, `test-results/ledger-${width > 700 ? 'desktop' : 'mobile'}.png`), animations: 'disabled' });
    }
    await p.keyboard.press('Escape');
    await p.locator('[data-settings-tab=appearance]').click();
    await p.locator('[data-config=theme]').selectOption('moonstone');
    await p.locator('[data-config=density]').selectOption('compact');
    await p.locator('[data-config=textSize]').fill('20');
    await p.locator('[data-settings-tab=general]').click();
    await p.locator('[data-config=language]').selectOption('en');
    await p.locator('[data-command=open]').click();
    assert.equal(await p.locator('#vc-page').evaluate(n => n.scrollWidth > n.clientWidth + 1), false, 'populated 320px compact ledger at 20px must fit');
    assert.ok((await p.locator('#vc-page').innerText()).includes('Current scene'));
    // Contextual navigation and return-to-chat must never change campaign data.
    const before = await p.evaluate(() => JSON.stringify(SillyTavern.getContext().chatMetadata.vesperchainCampaign));
    await p.locator('.vc-contract-link').click();
    assert.equal(await p.locator('.vc-tabs [aria-selected=true]').getAttribute('data-page'), 'contracts');
    await p.locator('[data-deck=chronicle]').click();
    await p.locator('.vc-tabs [data-page=home]').click();
    await p.locator('.vc-overview-scene [data-command=close]').click();
    assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), false);
    assert.equal(await p.evaluate(() => JSON.stringify(SillyTavern.getContext().chatMetadata.vesperchainCampaign)), before);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: populated ledger, unknown resources, all entity categories retained, safe disclosure rows, compact responsive navigation, context links and no state writes.');
};
