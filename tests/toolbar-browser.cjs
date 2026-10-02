const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async function toolbarSuite(browser, base, root) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    try {
        await p.goto(base + '/tests/tracking-host.html');
        await p.locator('[data-character-tracking]').check();
        await p.locator('[data-command=open]').click();
        async function page(route) {
            await p.locator('[data-deck=world]').click();
            await p.locator(`.vc-tabs [data-page=${route}]`).click();
        }
        async function checkLayout(route, width, size) {
            const layout = await p.locator('.vc-toolbar').evaluate(bar => {
                const search = bar.querySelector('input[type=search]'), box = n => {
                    const r = n.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right };
                };
                return { toolbar:box(bar),search:box(search),buttons:[...bar.querySelectorAll(':scope>button')].map(box),overflow:bar.scrollWidth>bar.clientWidth+1 };
            });
            assert.equal(layout.overflow, false, `${route} toolbar overflows at ${width}px/${size}px text`);
            assert.ok(layout.search.height >= 44 && layout.search.height <= 48, `search stretched to ${layout.search.height}px`);
            for (const b of layout.buttons) {
                assert.ok(b.height >= 44 && b.height <= 86, `${route} action is vertically crushed: ${b.height}px`);
                assert.ok(b.width >= (width <= 600 ? 120 : 90), `${route} action too narrow: ${b.width}px`);
                assert.ok(b.x >= layout.toolbar.x-1 && b.right <= layout.toolbar.right+1, 'action leaves toolbar bounds');
                if (width <= 600) assert.ok(b.y >= layout.search.bottom+8, 'mobile action shares the search row');
            }
            if (width <= 600) assert.ok(Math.abs(layout.search.width-layout.toolbar.width)<1, 'mobile search must fill its row');
            if (width <= 360) for (const b of layout.buttons) assert.ok(Math.abs(b.width-layout.toolbar.width)<1, 'narrow-screen actions need a full-width row');
            assert.equal(await p.locator('#vc-page').evaluate(n => n.scrollWidth > n.clientWidth+1), false);
        }
        // The reported failure also happens with no species data, so exercise that state first.
        await page('species'); await checkLayout('empty species', 390, 16);
        await p.screenshot({path:path.join(root,'test-results/toolbar-empty-mobile.png'),animations:'disabled'});
        const fields = ['role','age','pronouns','appearance','personality','background','goals','relationship','status','location'];
        await p.evaluate(async fields => {
            const profile={id:'mara',name:'Mara Vey',species:'Elf',...Object.fromEntries(fields.map(k=>[k,null]))};
            await fixture.add({version:1,eventId:'toolbar-discovery',baseRevision:0,npcProfiles:[profile]});
        }, fields);
        for (const language of ['th','en']) for (const size of [16,20]) for (const density of ['comfortable','compact']) {
            await p.locator('.vc-header [data-command=drawer]').click();
            await p.locator('[data-settings-tab=general]').click(); await p.locator('[data-config=language]').selectOption(language);
            await p.locator('[data-settings-tab=appearance]').click(); await p.locator('[data-config=textSize]').fill(String(size)); await p.locator('[data-config=density]').selectOption(density);
            await p.locator('[data-settings-close]').click();
            for (const [width,height] of [[320,844],[390,844],[430,932],[600,800],[844,390],[1180,900]]) {
                await p.setViewportSize({width,height});
                for (const route of ['species','npc']) {
                    await page(route); await checkLayout(route,width,size);
                    if (language==='th' && size===16 && density==='comfortable' && [320,390,1180].includes(width)) await p.screenshot({path:path.join(root,`test-results/toolbar-${route}-${width}.png`),animations:'disabled'});
                }
            }
        }
        // Rearranging the controls must leave their actions reachable and functional.
        await p.setViewportSize({width:390,height:844}); await page('species');
        await p.locator('[data-species-search]').fill('missing'); assert.equal(await p.locator('[data-species-name]:visible').count(),0);
        await p.locator('[data-species-search]').fill('Elf'); assert.equal(await p.locator('[data-species-name]:visible').count(),1);
        await p.locator('[data-species-new]').click(); await p.locator('[data-species-form]').waitFor(); await p.locator('[data-review-close]').click();
        await p.locator('[data-breeding-new]').click(); await p.locator('[data-breeding-form]').waitFor(); await p.locator('[data-review-close]').click();
        await page('npc'); await p.locator('[data-npc-new]').click(); await p.locator('[data-npc-form]').waitFor(); await p.locator('[data-review-close]').click();
        assert.deepEqual(errors,[]);
        console.log('PASS: species/NPC toolbar positions and heights, empty/populated state, 320–1180px/landscape, Thai/English, 16/20px text and compact spacing.');
    } finally { await context.close(); }
};
