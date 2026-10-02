const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

module.exports = async function guideSuite(browser, base, root) {
    const { GUIDE_CHAPTERS } = await import(pathToFileURL(path.join(root, 'src/guide.js')));
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await context.newPage(), errors = [];
    p.on('pageerror', error => errors.push(error.message));
    const state = () => p.evaluate(() => {
        const c = SillyTavern.getContext();
        return JSON.stringify({ chat: c.chat, metadata: c.chatMetadata, profiles: c.extensionSettings.vesperchainProfiles, archives: c.extensionSettings.vesperchainArchives });
    });
    async function checkBounds() {
        const bounds = await p.locator('.vc-guide-page').evaluate(page => {
            const rect = n => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
            const reader = page.querySelector('.vc-guide-reading'), nav = page.querySelector('.vc-guide-pagination');
            return { page: rect(page), reader: rect(reader), nav: rect(nav), controls: rect(page.querySelector('.vc-guide-controls')),
                viewport: { width: innerWidth, height: innerHeight }, text: getComputedStyle(page).fontSize,
                buttons: [...nav.querySelectorAll('button')].map(rect),
                overflow: [page, reader, nav].some(n => n.scrollWidth > n.clientWidth + 1) };
        });
        assert.equal(bounds.overflow, false, 'guide must not overflow horizontally');
        assert.ok(bounds.reader.height >= 40, 'chapter needs a scrollable reading area: ' + JSON.stringify(bounds));
        assert.ok(bounds.controls.bottom <= bounds.reader.top + 1, 'topic chooser must not cover text');
        assert.ok(bounds.reader.bottom <= bounds.nav.top + 1, 'pagination must not cover text: ' + JSON.stringify(bounds));
        for (const b of bounds.buttons) {
            assert.ok(b.height >= 44 && b.height <= 70, 'pagination labels must stay readable');
            assert.ok(b.top >= bounds.page.top && b.bottom <= bounds.page.bottom + 1, 'pagination must stay visible: ' + JSON.stringify(bounds));
            assert.ok(b.left >= bounds.page.left && b.right <= bounds.page.right + 1);
        }
    }
    try {
        // This host has no selected character and no tracking: help must still open.
        await p.goto(base + '/tests/host.html');
        await p.locator('#vesperchain-settings [data-command=guide]').waitFor();
        const initial = await state();
        await p.locator('#vesperchain-settings [data-command=guide]').click();
        assert.equal(await p.locator('[data-deck=system]').evaluate(n => {
            const r = n.getBoundingClientRect(), parent = n.parentElement.getBoundingClientRect();
            return r.left >= parent.left && r.right <= parent.right + 1;
        }), true, 'opening help must reveal its selected section on the mobile navigation bar');
        assert.equal(await p.locator('.vc-guide-topics button').count(), GUIDE_CHAPTERS.length);
        assert.equal(await p.locator('[data-tracking-enable]').count(), 0);
        assert.equal(await p.locator('.vc-guide-pagination button').first().isDisabled(), true);
        await checkBounds();
        await p.screenshot({ path: path.join(root, 'test-results/guide-contents-mobile.png'), animations: 'disabled' });
        await p.locator('.vc-guide-pagination button').last().click();
        assert.equal(await p.locator('[data-guide-status]').innerText(), 'หน้า 1 / 14');
        assert.equal(await p.locator('.vc-guide-pagination button').first().isDisabled(), true);
        await p.locator('.vc-guide-reading').evaluate(n => n.scrollTop = n.scrollHeight);
        await p.locator('.vc-guide-pagination button').last().click();
        assert.equal(await p.locator('[data-guide-select]').inputValue(), '1');
        assert.equal(await p.locator('.vc-guide-reading').evaluate(n => n.scrollTop), 0);
        assert.equal(await p.evaluate(() => document.activeElement.id), 'vc-guide-heading');
        await p.locator('.vc-guide-pagination button').first().click();
        assert.equal(await p.locator('[data-guide-select]').inputValue(), '0');
        await p.locator('[data-guide-go=contents]').click();
        await p.locator('.vc-guide-topics [data-guide-go="5"]').click();
        assert.equal(await p.locator('[data-guide-status]').innerText(), 'หน้า 6 / 14');
        await p.screenshot({ path: path.join(root, 'test-results/guide-lineage-mobile.png'), animations: 'disabled' });
        // Returning from a system page or closing/reopening retains the current chapter for this session.
        await p.locator('.vc-guide-links [data-page=species]').click();
        assert.equal(await p.locator('.vc-guide-page').count(), 0);
        await p.locator('.vc-footer [data-command=guide]').click();
        assert.equal(await p.locator('[data-guide-select]').inputValue(), '5');
        await p.keyboard.press('Escape');
        await p.locator('#vesperchain-settings [data-command=guide]').click();
        assert.equal(await p.locator('[data-guide-select]').inputValue(), '5');
        assert.equal(await state(), initial, 'reading help must not change campaigns, profiles or saves');

        for (const language of ['th', 'en']) for (const size of [16, 20]) {
            const selected = await p.locator('[data-guide-select]').inputValue();
            await p.locator('.vc-header [data-command=drawer]').click();
            await p.locator('[data-settings-tab=general]').click();
            await p.locator('[data-config=language]').selectOption(language);
            await p.locator('[data-settings-tab=appearance]').click();
            await p.locator('[data-config=textSize]').fill(String(size));
            await p.locator('[data-config=density]').selectOption(size === 20 ? 'compact' : 'comfortable');
            // Also exercise the guide shortcut when the drawer is inside the gear dialog.
            await p.locator('.vc-settings-dialog [data-command=guide]').click();
            assert.equal(await p.locator('.vc-settings-dialog').evaluate(n => n.open), false);
            assert.equal(await p.locator('[data-guide-select]').inputValue(), selected);
            for (const [width, height] of [[320,844], [390,844], [844,390], [1180,900]]) {
                await p.setViewportSize({ width, height });
                await p.waitForFunction(({ width, height }) => {
                    const r = document.querySelector('#vesperchain-dialog').getBoundingClientRect();
                    return Math.abs(r.width - width) < 1 && Math.abs(r.height - height) < 1;
                }, { width, height });
                await p.locator('[data-guide-select]').selectOption('contents');
                await checkBounds();
                await p.locator('.vc-guide-pagination button').last().click();
                for (let index = 0; index < GUIDE_CHAPTERS.length; index++) {
                    assert.equal(await p.locator('#vc-guide-heading').innerText(), GUIDE_CHAPTERS[index].title[language === 'en' ? 1 : 0]);
                    assert.equal(await p.locator('[data-guide-status]').innerText(), `${language === 'en' ? 'Page' : 'หน้า'} ${index + 1} / 14`);
                    await checkBounds();
                    // Reading through to the end must never move the fixed pagination out of view.
                    await p.locator('.vc-guide-reading').evaluate(n => n.scrollTop = n.scrollHeight);
                    await checkBounds();
                    if (index < GUIDE_CHAPTERS.length - 1) await p.locator('.vc-guide-pagination button').last().click();
                }
                assert.equal(await p.locator('.vc-guide-pagination button').last().isDisabled(), true);
                if (language === 'th' && size === 16 && width === 1180) {
                    await p.locator('[data-guide-select]').selectOption('8');
                    await p.screenshot({ path: path.join(root, 'test-results/guide-purchases-desktop.png'), animations: 'disabled' });
                }
            }
        }
        assert.equal(await state(), initial);
        // Reading an active campaign must likewise preserve funds, possession and action logs.
        await p.goto(base + '/tests/tracking-host.html');
        await p.locator('[data-character-tracking]').check();
        await p.evaluate(async () => fixture.add({ version:1, eventId:'guide-read-only', baseRevision:0, resources:{silver:120} }));
        const tracked = await state();
        await p.locator('#vesperchain-settings [data-command=guide]').click();
        await p.locator('[data-guide-select]').selectOption('8');
        await p.locator('.vc-guide-pagination button').last().click();
        await p.locator('.vc-guide-pagination button').first().click();
        await p.locator('[data-guide-go=contents]').click();
        assert.equal(await state(), tracked, 'guide must not write tracked state');
        assert.deepEqual(errors, []);
        console.log('PASS: 14 guide chapters, contents/previous/next/jump, focus/scroll reset, session return, no-character/tracking-off access, read-only campaigns, Thai/English 16/20px, 320–1180px and landscape with visible controls.');
    } finally { await context.close(); }
};
