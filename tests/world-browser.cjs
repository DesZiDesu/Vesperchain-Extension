const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = async function worldSuite(browser, base, root) {
    const context = await browser.newContext({ viewport: { width: 1180, height: 900 } });
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    try {
        await p.goto(base + '/tests/tracking-host.html');
        await p.addStyleTag({content:':root{--mainFontFamily:Arial,sans-serif;--mainFontSize:16px;--SmartThemeBodyColor:#e4e4e4;--SmartThemeEmColor:#aaa;--SmartThemeBorderColor:#555;--SmartThemeChatTintColor:#252525;--SmartThemeBlurTintColor:#202020}#chat{font-family:Arial,sans-serif}'});
        await p.locator('[data-character-tracking]').check();
        await p.locator('#vesperchain-wand').click();
        await p.locator('[data-deck=world]').click(); await p.locator('.vc-tabs [data-page=npc]').click();
        await p.locator('[data-npc-new]').click();
        await p.locator('[data-npc-form] [name=name]').fill('Mara Vey'); await p.locator('[data-npc-form] [name=species]').fill('Human');
        await p.locator('[data-npc-form] [name=role]').fill('เจ้าของร้าน Broken Scale');
        await p.locator('[data-npc-form] [name=background]').fill('เดินทางค้าขายแถบ Vespergate');
        await p.locator('[data-npc-form] button[type=submit]').click();
        let result = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult());
        const mara = Object.values(result.state.entities.npcs)[0]; assert.equal(mara.name, 'Mara Vey'); assert.equal(mara.profile.age, null); assert.equal(result.state.revision, 1);
        await p.locator('[data-npc-edit]').click(); await p.locator('[data-npc-form] [name=personality]').fill('สุขุม รอบคอบ');
        await p.screenshot({ path: path.join(root, 'test-results/new-npc-editor-desktop.png') });
        await p.locator('[data-npc-form] button[type=submit]').click();
        await p.locator('[data-npc-search]').fill('missing'); assert.equal(await p.locator('[data-npc-searchable]:visible').count(), 0);
        await p.locator('[data-npc-search]').fill('Mara'); assert.equal(await p.locator('[data-npc-searchable]:visible').count(), 1);
        // Gear works without the host drawer toggle, and closing it returns to the same ledger.
        await p.evaluate(() => document.querySelector('.drawer-toggle').remove());
        await p.locator('.vc-header [data-command=drawer]').click(); await p.locator('.vc-settings-dialog[open]').waitFor();
        assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), true);
        assert.ok((await p.locator('.vc-settings-dialog').innerText()).includes('แสดงเงินเข้า'));
        assert.equal(await p.locator('#vesperchain-settings').evaluate(n => getComputedStyle(n).fontFamily), 'Arial, sans-serif');
        assert.equal(await p.locator('#vesperchain-settings').evaluate(n => getComputedStyle(n).color), 'rgb(228, 228, 228)');
        await p.screenshot({ path: path.join(root, 'test-results/new-settings-desktop.png') });
        await p.locator('[data-settings-close]').click(); await p.locator('#extensions_settings2 #vesperchain-settings').waitFor({ state: 'attached' });
        assert.equal(await p.locator('.vc-tabs [aria-selected=true]').getAttribute('data-page'), 'npc');
        await p.locator('#vesperchain-dialog .vc-header [data-command=close]').click();
        const profile = { id: 'seren', name: 'Seren Thornveil', role: 'นักธรรมชาติวิทยา', age: '34', pronouns: 'she/her', species: 'Elf', appearance: 'เสื้อคลุมสีเขียวเข้ม', personality: 'ช่างสังเกต', background: 'ศึกษาป่า Thornmere', goals: 'สำรวจสายพันธุ์หายาก', relationship: 'ผู้ร่วมงาน', status: 'กำลังสำรวจ', location: 'Vespergate' };
        const add = async fields => p.evaluate(async fields => { const app = await __vesperchainExtension, revision = app.tracking.getResult().state.revision; await fixture.add({ version: 1, eventId: 'event-' + revision, baseRevision: revision, ...fields }, false, '[[vc:seren]]“ฉันสนใจสิ่งที่คุณพบจากป่า ลองคุยเรื่องราคากันดู”[[/vc]]'); }, fields);
        await add({ resources: { silver: 500 }, npcProfiles: [profile], entities: { inventory: [{ id: 'silk', name: 'เส้นไหมป่า', quantity: 6 }], creatures: [{ id: 'moth', name: 'ผีเสื้อเถ้าจันทร์', species: 'Ashwing', owned: true, status: 'แข็งแรง' }] }, purchaseOffers: [{ id: 'silk-bid', buyerId: mara.id, kind: 'inventory', entityId: 'silk', quantity: 2, price: 120, terms: 'ซื้อเส้นไหมป่า 2 ม้วน ชำระเมื่อยืนยันขาย' }, { id: 'moth-bid', buyerId: 'seren', kind: 'creatures', entityId: 'moth', quantity: 1, price: 250, terms: 'รับไปดูแลที่คอกของ Seren' }] });
        await p.locator('#chat [data-purchase-id=silk-bid]').waitFor(); assert.equal(await p.locator('#chat .vc-money').count(), 0, 'initial known balance is not income');
        const source = p.locator('#chat [data-purchase-id=silk-bid]'); await source.screenshot({ path: path.join(root, 'test-results/new-purchase-offer-desktop.png') });
        await p.evaluate(() => { const t = document.createElement('textarea'); t.id = 'send_textarea'; document.body.append(t); });
        await source.locator('[data-purchase-review=counter]').click(); await p.locator('[data-bid-price]').fill('180');
        await p.screenshot({ path: path.join(root, 'test-results/new-negotiation-desktop.png') }); await p.locator('[data-confirm-purchase]').click();
        assert.ok((await p.locator('#send_textarea').inputValue()).includes('180')); assert.equal(await source.locator('[data-purchase-review=sell]').count(), 0);
        result = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(result.state.resources.silver, 500); assert.equal(result.state.entities.inventory.silk.quantity, 6);
        assert.ok((await p.evaluate(() => SillyTavern.getContext().extensionPrompts['vesperchain-main-chat-v1'])).includes('"requestedPrice":180'));
        await add({ purchaseUpdates: [{ id: 'silk-bid', round: 1, decision: 'counter', price: 150, reason: 'งบที่ร้านมีวันนี้' }] });
        await p.locator('#send_textarea').fill('My existing draft');
        await source.locator('[data-purchase-review=counter]').click(); await p.locator('[data-bid-price]').fill('170'); await p.locator('[data-confirm-purchase]').click(); assert.equal(await p.locator('#send_textarea').inputValue(), 'My existing draft');
        await add({ purchaseUpdates: [{ id: 'silk-bid', round: 2, decision: 'accept', price: 170, reason: 'ตกลงที่ราคานี้' }] });
        assert.equal(await p.locator('#chat .vc-money').count(), 0);
        await source.locator('[data-purchase-review=sell]').click(); await p.locator('[data-confirm-purchase]').click();
        result = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(result.state.resources.silver, 670); assert.equal(result.state.entities.inventory.silk.quantity, 4);
        assert.equal(await p.locator('#chat .vc-money[data-direction=in]').count(), 1);
        await p.locator('#chat [data-purchase-id=moth-bid] [data-purchase-review=decline]').click(); await p.locator('[data-confirm-purchase]').click();
        await add({ transactions: [{ id: 'feed', reason: 'ซื้ออาหารสิ่งมีชีวิต', silverDelta: -40, items: [] }, { id: 'tip', reason: 'ค่าช่วยสำรวจ', silverDelta: 20, items: [] }] });
        await p.locator('#chat .vc-money-list').last().screenshot({ path: path.join(root, 'test-results/new-money-desktop.png') });
        assert.equal(await p.locator('#chat .vc-money[data-direction=out]').count(), 1); assert.equal(await p.locator('#chat .vc-money[data-direction=in]').count(), 2);
        await p.locator('[data-command=open]').click(); await p.locator('[data-deck=world]').click(); await p.locator('.vc-tabs [data-page=species]').click();
        assert.equal(await p.locator('[data-species-name]').count(), 3);
        await p.locator('[data-species-new]').click(); await p.locator('[data-species-form] [name=name]').fill('Half Elf'); await p.locator('[data-species-form] [name=description]').fill('เผ่าพันธุ์ลูกผสมที่ยืนยันจากเรื่องราว'); await p.locator('[data-species-form] button[type=submit]').click();
        result = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); const species = Object.values(result.state.species), elf = species.find(s => s.name === 'Elf'), human = species.find(s => s.name === 'Human'), half = species.find(s => s.name === 'Half Elf');
        await p.locator('[data-breeding-new]').click(); await p.locator('[name=parentA]').selectOption(elf.id); await p.locator('[name=parentB]').selectOption(human.id); await p.locator('[name=result]').selectOption(half.id); await p.locator('[name=notes]').fill('ผลการผสมที่พบใน Vespergate'); await p.locator('[data-breeding-form] button[type=submit]').click();
        result = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult()); assert.equal(Object.values(result.state.breeding)[0].result, half.id); assert.equal(Object.keys(result.state.entities.creatures).length, 1, 'index records must not create offspring');
        await p.screenshot({ path: path.join(root, 'test-results/new-species-desktop.png') });
        await p.locator(`[data-species-open="${elf.id}"]`).click(); assert.ok((await p.locator('.vc-review-dialog[open]').innerText()).includes('Half Elf')); await p.locator('[data-review-close]').click();
        // Reload keeps user profiles, negotiation history, money, and taxonomy.
        const before = result.state; await p.reload(); const after = await p.evaluate(async () => (await __vesperchainExtension).tracking.getResult().state); assert.deepEqual(after, before);
        await p.locator('[data-command=open]').click();
        for (const width of [390, 320]) {
            await p.setViewportSize({ width, height: 844 });
            for (const [deck, page] of [['world','npc'], ['world','species'], ['commerce','purchases']]) {
                await p.locator(`[data-deck=${deck}]`).click(); await p.locator(`.vc-tabs [data-page=${page}]`).click();
                assert.equal(await p.locator('#vc-page').evaluate(n => n.scrollWidth > n.clientWidth + 1), false, `${page} overflows at ${width}`);
                if (width === 390) await p.screenshot({ path: path.join(root, `test-results/new-${page}-mobile.png`) });
            }
            await p.locator('.vc-header [data-command=drawer]').click(); assert.equal(await p.locator('.vc-settings-dialog[open]').evaluate(n => n.scrollWidth > n.clientWidth + 1), false);
            if (width === 390) await p.screenshot({ path: path.join(root, 'test-results/new-settings-mobile.png') });
            await p.locator('[data-settings-close]').click();
        }
        await p.locator('#vesperchain-dialog .vc-header [data-command=close]').click();
        await p.locator('[data-config=chatMoney]').uncheck(); assert.equal(await p.locator('#chat .vc-money').count(), 0); await p.locator('[data-config=chatMoney]').check(); assert.equal(await p.locator('#chat .vc-money').count(), 3);
        await p.locator('[data-config=chatPurchases]').uncheck(); assert.equal(await p.locator('#chat .vc-purchase').count(), 0); await p.locator('[data-config=chatPurchases]').check(); assert.equal(await p.locator('#chat .vc-purchase').count(), 2);
        assert.deepEqual(errors, []);
        console.log('PASS: manual NPC create/edit/search, species/lineage, two bargaining rounds, explicit settlement, money receipts, persistence, 320px UI, host-themed settings and gear without host toggle.');
    } finally { await context.close(); }
};
