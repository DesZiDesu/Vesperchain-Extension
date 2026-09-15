const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    try { res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[path.extname(file)] || 'text/plain'); res.end(await fs.readFile(file)); }
    catch { res.writeHead(404); res.end(); }
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/tests/host.html`;
    const browser = await chromium.launch({ headless: true, ...(process.env.VESPERCHAIN_CHROMIUM ? { executablePath: process.env.VESPERCHAIN_CHROMIUM } : {}), args: ['--no-sandbox'] });
    const errors = [];
    try {
        const context = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
        await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
        const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message));
        await p.goto(url); await p.locator('#vesperchain-settings').waitFor();
        assert.equal(await p.locator('#vesperchain-wand').count(), 1);
        assert.equal(await p.locator('#vesperchain-launcher').count(), 0);
        await p.locator('#vesperchain-wand').click();
        assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), true);
        const routes = { chronicle: ['home', 'scene', 'character'], domain: ['shop', 'stock', 'research'], commerce: ['ledger', 'contracts', 'auction', 'branches'], world: ['travel', 'time', 'npc', 'codex'], system: ['recovery', 'settings'] };
        for (const width of [1180, 390, 320]) {
            await p.setViewportSize({ width, height: 1000 });
            for (const [deck, pages] of Object.entries(routes)) {
                await p.locator(`[data-deck="${deck}"]`).click();
                for (const page of pages) {
                    await p.locator(`.vc-tabs [data-page="${page}"]`).click();
                    assert.ok((await p.locator('#vc-page').innerText()).trim().length > 30);
                    assert.equal(await p.locator('.vc-tabs [aria-selected=true]').count(), 1);
                    assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.scrollWidth > n.clientWidth + 1), false, `${page} overflows at ${width}`);
                }
            }
        }
        // Deck memory and keyboard navigation.
        await p.locator('[data-deck=commerce]').click();
        assert.equal(await p.locator('.vc-tabs [aria-selected=true]').getAttribute('data-page'), 'branches');
        await p.locator('.vc-tabs [aria-selected=true]').focus(); await p.keyboard.press('Home');
        assert.equal(await p.locator('.vc-tabs [aria-selected=true]').getAttribute('data-page'), 'ledger');
        // Host text must be escaped and change without a game-state write.
        await p.evaluate(() => window.changeChat('<img src=x onerror="throw 1">'));
        assert.equal(await p.locator('.vc-context img').count(), 0);
        assert.ok((await p.locator('.vc-context').innerText()).includes('<img'));
        await p.keyboard.press('Escape');
        assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), false);
        await p.locator('[data-config=showWand]').uncheck(); await p.locator('[data-config=showFloating]').check();
        assert.equal(await p.locator('#vesperchain-wand').count(), 0);
        const floating = p.locator('#vesperchain-launcher'); await floating.waitFor();
        const before = await floating.boundingBox();
        await p.mouse.move(before.x + 28, before.y + 28); await p.mouse.down(); await p.mouse.move(45, 140, { steps: 10 }); await p.mouse.up();
        assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), false, 'drag must not open modal');
        const pos = await p.evaluate(() => SillyTavern.getContext().extensionSettings.vesperchain.position);
        await p.reload(); await floating.waitFor();
        assert.deepEqual(await p.evaluate(() => SillyTavern.getContext().extensionSettings.vesperchain.position), pos);
        await floating.click(); assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), true);
        await p.locator('.vc-header [data-command=drawer]').click();
        await p.locator('[data-settings-tab=appearance]').click();
        await p.locator('[data-config=theme]').selectOption('moonstone');
        await p.locator('[data-config=textSize]').fill('20');
        await p.locator('[data-command=open]').click();
        assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.scrollWidth > n.clientWidth + 1), false, '20px mobile text must fit');
        await p.locator('.vc-header [data-command=drawer]').click();
        await p.locator('[data-config=textSize]').fill('16');
        await p.locator('[data-config=ornateFonts]').uncheck();
        assert.equal(await p.locator('#vesperchain-fonts').count(), 0);
        await p.locator('[data-settings-tab=motion]').click(); await p.locator('[data-config=reducedMotion]').check();
        await p.locator('[data-command=open]').click();
        assert.equal(await p.locator('#vesperchain-dialog').getAttribute('data-motion'), 'false');
        assert.equal(await p.locator('#vesperchain-dialog').getAttribute('data-theme'), 'moonstone');
        assert.equal(await p.locator('.vc-mist').evaluate(n => getComputedStyle(n).animationName), 'none');
        await p.locator('.vc-header [data-command=drawer]').click();
        await p.locator('[data-config=reducedMotion]').uncheck();
        await p.emulateMedia({ reducedMotion: 'reduce' });
        await p.locator('[data-command=open]').click();
        assert.equal(await p.locator('#vesperchain-dialog').getAttribute('data-motion'), 'false');
        await p.keyboard.press('Escape');
        await p.locator('[data-settings-tab=general]').click(); await p.locator('[data-config=enabled]').uncheck();
        assert.equal(await floating.count(), 0); assert.equal(await p.locator('[data-command=open]').isDisabled(), true);
        await p.locator('[data-config=enabled]').check(); await p.locator('[data-config=showFloating]').uncheck();
        assert.equal(await p.locator('#vesperchain-wand').count(), 0); assert.equal(await floating.count(), 0);
        await p.locator('[data-command=open]').click(); assert.equal(await p.locator('#vesperchain-dialog').evaluate(n => n.open), true);
        // No duplicate entry points after repeat module load or host remount.
        await p.keyboard.press('Escape'); await p.locator('[data-config=showWand]').check();
        await p.evaluate(() => import('/src/index.js?duplicate=1'));
        assert.equal(await p.locator('#vesperchain-settings').count(), 1); assert.equal(await p.locator('#vesperchain-wand').count(), 1);
        await p.evaluate(() => document.querySelector('#extensionsMenu').replaceChildren());
        await p.locator('#vesperchain-wand').waitFor(); assert.equal(await p.locator('#vesperchain-wand').count(), 1);
        assert.deepEqual(await p.evaluate(() => SillyTavern.getContext().chatMetadata), { sentinel: 42 });
        assert.deepEqual(await p.evaluate(() => SillyTavern.getContext().chat), [{ mes: 'untouched' }]);
        await p.locator('[data-config=language]').selectOption('en');
        await p.setViewportSize({ width: 1180, height: 1000 }); await p.emulateMedia({ reducedMotion: 'no-preference' });
        await p.locator('[data-command=open]').click(); await p.locator('[data-deck=chronicle]').click(); await p.locator('.vc-tabs [data-page=home]').click();
        await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
        await p.screenshot({ path: path.join(root, 'test-results/desktop.png'), animations: 'disabled' });
        await p.setViewportSize({ width: 390, height: 844 }); await p.screenshot({ path: path.join(root, 'test-results/mobile.png'), animations: 'disabled' });
        assert.deepEqual(errors, []);
        console.log('PASS: 16 pages at 3 widths, keyboard tabs, deck memory, drag/click, persistence, launcher modes, drawer handoff, fonts, reduced motion, escaping, host remount, no chat writes.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
