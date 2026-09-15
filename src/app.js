import { KEY, DEFAULTS, normalize, launcherVisibility, motionAllowed, screenPosition, relativePosition } from './config.js';
import { DECKS, PAGES } from './catalog.js';
import { icon } from './icons.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=IM+Fell+English&family=Noto+Serif+Thai:wght@400;500;600&display=swap';

export function createApp(context, doc = document) {
    const win = doc.defaultView;
    const abort = new win.AbortController();
    const on = (target, event, fn, options = {}) => target?.addEventListener(event, fn, { ...options, signal: abort.signal });
    const media = win.matchMedia('(prefers-reduced-motion: reduce)');
    const original = context().extensionSettings?.[KEY];
    let config = normalize(original), drawer, dialog, wand, floating, fontLink;
    let active = 'home', settingsTab = 'general', returnFocus, dragging, suppressClick = false, destroyed = false;
    const remembered = new Map(), animations = new Set();
    const l = (th, en) => config.language === 'th' ? th : en;
    const viewport = () => ({ width: win.visualViewport?.width || win.innerWidth, height: win.visualViewport?.height || win.innerHeight,
        left: win.visualViewport?.offsetLeft || 0, top: win.visualViewport?.offsetTop || 0 });

    function persist() {
        const ctx = context();
        ctx.extensionSettings[KEY] = config;
        ctx.saveSettingsDebounced();
    }
    // Preserve future settings fields without silently downgrading a newer schema.
    const future = original?.schemaVersion > DEFAULTS.schemaVersion;
    if (future) throw new Error('Settings were saved by a newer Vesperchain version. Update the extension.');
    persist();

    function applyAppearance() {
        for (const root of [drawer, dialog, floating]) {
            if (!root) continue;
            root.dataset.theme = config.theme;
            root.dataset.language = config.language;
            root.dataset.density = config.density;
            root.dataset.fonts = String(config.ornateFonts);
            root.dataset.motion = String(motionAllowed(config, media.matches));
            root.dataset.ambient = String(config.ambient);
            root.dataset.particles = String(config.particles);
            root.dataset.glow = String(config.glow);
            root.dataset.paused = String(doc.hidden || (root === dialog && !dialog.open));
            root.style.setProperty('--vc-type-size', `${config.textSize}px`);
            root.style.setProperty('--vc-intensity', String(config.intensity / 100));
            root.style.setProperty('--vc-cycle', ({ slow: '36s', normal: '24s', fast: '16s' })[config.speed]);
        }
        if (config.enabled && config.ornateFonts && !fontLink) {
            fontLink = doc.createElement('link');
            fontLink.rel = 'stylesheet'; fontLink.href = FONT_URL; fontLink.id = 'vesperchain-fonts';
            doc.head.append(fontLink);
        } else if ((!config.enabled || !config.ornateFonts) && fontLink) { fontLink.remove(); fontLink = null; }
        if (!motionAllowed(config, media.matches)) stopAnimations();
    }
    function stopAnimations() { animations.forEach(a => a.cancel()); animations.clear(); }
    function animate(node, frames, options) {
        if (!node?.animate || !motionAllowed(config, media.matches) || doc.hidden) return;
        const a = node.animate(frames, options); animations.add(a);
        a.finished.catch(() => {}).finally(() => animations.delete(a));
    }
    function feedback(event) {
        const button = event.target.closest('button');
        if (!button || !config.pressEffects || !config.enabled || button.disabled) return;
        animate(button, [{ filter: 'brightness(1)' }, { filter: `brightness(${1 + config.intensity / 130})` }, { filter: 'brightness(1)' }], { duration: 340 });
    }
    function update(key, value) {
        config = normalize({ ...config, [key]: value }); persist();
        applyAppearance(); syncLaunchers();
        if (!config.enabled) close();
        if (key === 'language') { renderDrawer(); if (dialog?.open) renderPage(); }
        syncControls();
    }

    function check(key, th, en, hint = '') {
        return `<label class="vc-option"><span>${l(th, en)}${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" data-config="${key}" ${config[key] ? 'checked' : ''}></label>`;
    }
    function select(key, th, en, values) {
        return `<label class="vc-field"><span>${l(th, en)}</span><select data-config="${key}">${values.map(([value, label]) => `<option value="${value}" ${config[key] === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
    }
    function range(key, th, en, min, max, unit = '') {
        return `<label class="vc-field"><span>${l(th, en)} <output data-value="${key}">${config[key]}${unit}</output></span><input type="range" data-config="${key}" min="${min}" max="${max}" step="1" value="${config[key]}" data-unit="${unit}"></label>`;
    }
    function renderDrawer() {
        const wasOpen = drawer?.querySelector('details')?.open ?? true;
        if (!drawer) return;
        drawer.innerHTML = `<details ${wasOpen ? 'open' : ''}><summary><span class="vc-brand-mark">${icon('book')}</span><span><strong>Vesperchain</strong><small>The Black Ledger · 0.1.0</small></span>${icon('chevron')}</summary>
          <div class="vc-settings-content"><div class="vc-config-tabs" role="tablist" aria-label="${l('หมวดตั้งค่า', 'Settings sections')}">${[['general', l('ทั่วไป', 'General')], ['appearance', l('รูปลักษณ์', 'Appearance')], ['motion', l('เอฟเฟกต์', 'Effects')]].map(([key, title]) => `<button type="button" role="tab" data-settings-tab="${key}" id="vc-config-${key}" aria-controls="vc-config-panel" aria-selected="${settingsTab === key}" tabindex="${settingsTab === key ? 0 : -1}">${title}</button>`).join('')}</div>
          <div id="vc-config-panel" role="tabpanel" aria-labelledby="vc-config-${settingsTab}">${settingsTab === 'general' ?
            check('enabled', 'เปิดใช้ Vesperchain', 'Enable Vesperchain') +
            check('showWand', 'แสดงปุ่มใน Wand menu', 'Show Wand menu entry') +
            check('showFloating', 'แสดงปุ่มลอยลากได้', 'Show draggable launcher', l('ลากเพื่อย้าย · ปุ่มลูกศรบนคีย์บอร์ดขยับได้', 'Drag to move · Arrow keys also move the launcher')) +
            select('language', 'ภาษาอินเทอร์เฟซ', 'Interface language', [['th', 'ไทย'], ['en', 'English']]) +
            `<button type="button" data-command="reset-position">${icon('compass')}${l('คืนตำแหน่งปุ่มลอย', 'Reset launcher position')}</button>` : settingsTab === 'appearance' ?
            select('theme', 'ธีม', 'Theme', [['obsidian', 'Obsidian & antique gold'], ['moonstone', 'Moonstone & silver']]) +
            select('density', 'ระยะห่าง', 'Spacing', [['comfortable', l('โปร่ง', 'Comfortable')], ['compact', l('กระชับ', 'Compact')]]) +
            range('textSize', 'ขนาดตัวอักษร', 'Text size', 14, 20, 'px') +
            check('ornateFonts', 'ฟอนต์โบราณ EN / TH', 'Ornate EN / TH fonts', l('Cinzel + Noto Serif Thai จาก Google Fonts · ปิดเพื่อใช้ฟอนต์ในเครื่อง', 'Cinzel + Noto Serif Thai from Google Fonts · Disable for system fonts')) :
            check('reducedMotion', 'ลดการเคลื่อนไหวทั้งหมด', 'Reduce all motion', l('เคารพการตั้งค่า Reduce Motion ของอุปกรณ์เสมอ', 'Always respects your device’s reduced-motion preference')) +
            check('ambient', 'หมอกและแสงพื้นหลัง', 'Ambient mist and light') +
            check('particles', 'อนุภาคเรืองแสง', 'Floating motes') +
            check('glow', 'แสงขอบปุ่ม', 'Button edge glow') +
            check('transitions', 'แอนิเมชันเปลี่ยนหน้า', 'Page transitions') +
            check('pressEffects', 'เอฟเฟกต์เมื่อกดปุ่ม', 'Button press effects') +
            range('intensity', 'ความเข้มเอฟเฟกต์', 'Effect intensity', 0, 100, '%') +
            select('speed', 'ความเร็วพื้นหลัง', 'Ambient speed', [['slow', l('ช้า', 'Slow')], ['normal', l('ปกติ', 'Normal')], ['fast', l('เร็ว', 'Fast')]])}
          </div><div class="vc-drawer-actions"><button type="button" class="vc-primary" data-command="open">${icon('book')}${l('เปิด The Black Ledger', 'Open The Black Ledger')}</button><span class="vc-save-note" role="status">${l('บันทึกการตั้งค่าอัตโนมัติ', 'Preferences save automatically')}</span></div></div></details>`;
        applyAppearance(); syncControls();
    }
    function syncControls() {
        drawer?.querySelectorAll('[data-config]').forEach(input => {
            const value = config[input.dataset.config];
            if (input.type === 'checkbox') input.checked = value; else input.value = value;
            const output = drawer.querySelector(`[data-value="${input.dataset.config}"]`);
            if (output) output.textContent = `${value}${input.dataset.unit || ''}`;
        });
        const open = drawer?.querySelector('[data-command="open"]'); if (open) open.disabled = !config.enabled;
    }
    function mountDrawer() {
        const host = doc.getElementById('extensions_settings2') || doc.getElementById('extensions_settings');
        if (!host || drawer?.isConnected) return;
        drawer?.remove(); drawer = doc.createElement('section');
        drawer.id = 'vesperchain-settings'; drawer.className = 'vc-root vc-drawer'; host.append(drawer);
        renderDrawer();
        on(drawer, 'click', e => {
            feedback(e);
            const tab = e.target.closest('[data-settings-tab]');
            if (tab) { settingsTab = tab.dataset.settingsTab; renderDrawer(); drawer.querySelector(`[data-settings-tab="${settingsTab}"]`).focus(); }
            const action = e.target.closest('[data-command]')?.dataset.command;
            if (action === 'open') open();
            if (action === 'reset-position') update('position', { ...DEFAULTS.position });
        });
        on(drawer, 'input', e => {
            const input = e.target.closest('[data-config]'); if (!input) return;
            update(input.dataset.config, input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value);
        });
        on(drawer, 'keydown', tabKeys);
    }

    function placeFloating() {
        if (!floating) return;
        const p = screenPosition(config.position, viewport());
        floating.style.left = `${p.left}px`; floating.style.top = `${p.top}px`;
    }
    function bindDrag(button) {
        on(button, 'pointerdown', e => {
            if (!e.isPrimary || e.button !== 0) return;
            dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, start: button.getBoundingClientRect(), moved: false, position: { ...config.position } };
            button.setPointerCapture(e.pointerId); suppressClick = false;
        });
        on(button, 'pointermove', e => {
            if (!dragging || e.pointerId !== dragging.id) return;
            const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
            if (!dragging.moved && Math.hypot(dx, dy) < 7) return;
            dragging.moved = true; suppressClick = true;
            config.position = relativePosition(dragging.start.left + dx, dragging.start.top + dy, viewport()); placeFloating();
        });
        const finish = (e, cancel = false) => {
            if (!dragging || e.pointerId !== dragging.id) return;
            if (cancel) config.position = dragging.position;
            else if (dragging.moved) persist();
            dragging = null; placeFloating();
            if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId);
        };
        on(button, 'pointerup', e => finish(e));
        on(button, 'pointercancel', e => finish(e, true));
        on(button, 'lostpointercapture', e => finish(e, true));
        on(button, 'click', e => { if (suppressClick) { suppressClick = false; e.preventDefault(); return; } open(); });
        on(button, 'keydown', e => {
            const vector = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
            if (!vector) return; e.preventDefault();
            const box = button.getBoundingClientRect(), step = e.shiftKey ? 30 : 10;
            update('position', relativePosition(box.left + vector[0] * step, box.top + vector[1] * step, viewport()));
        });
    }
    function syncLaunchers() {
        const visible = launcherVisibility(config), host = doc.getElementById('extensionsMenu');
        if ((!visible.wand || !host) && wand) { wand.remove(); wand = null; }
        if (visible.wand && host && !wand?.isConnected) {
            wand = doc.createElement('button'); wand.type = 'button'; wand.id = 'vesperchain-wand';
            wand.className = 'list-group-item flex-container flexGap5 vc-wand';
            wand.innerHTML = `${icon('book')}<span>Vesperchain</span>`;
            on(wand, 'click', () => {
                // Let the host's Wand click handlers run; never rewrite its open/closed state.
                const toggle = doc.getElementById('extensionsMenuButton');
                if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
                open();
            }); host.append(wand);
        }
        if (!visible.floating && floating) { floating.remove(); floating = null; dragging = null; }
        if (visible.floating && !floating) {
            floating = doc.createElement('button'); floating.id = 'vesperchain-launcher'; floating.type = 'button';
            floating.className = 'vc-root vc-launcher'; floating.innerHTML = icon('book'); doc.body.append(floating); bindDrag(floating);
        }
        if (floating) {
            floating.setAttribute('aria-label', l('เปิด Vesperchain · ลากหรือใช้ปุ่มลูกศรเพื่อย้าย', 'Open Vesperchain · Drag or use arrow keys to move'));
            floating.title = floating.getAttribute('aria-label');
            floating.hidden = Boolean(dialog?.open);
        }
        placeFloating(); applyAppearance();
    }

    function tabKeys(e) {
        const tab = e.target.closest('[role="tab"]');
        if (!tab || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
        const list = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
        const offset = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1;
        const next = e.key === 'Home' ? list[0] : e.key === 'End' ? list.at(-1) : list[(list.indexOf(tab) + offset + list.length) % list.length];
        e.preventDefault(); const id = next.id; next.click(); doc.getElementById(id)?.focus();
    }
    function mountDialog() {
        if (dialog) return;
        dialog = doc.createElement('dialog'); dialog.id = 'vesperchain-dialog'; dialog.className = 'vc-root vc-dialog';
        dialog.setAttribute('aria-labelledby', 'vc-title');
        dialog.innerHTML = `<div class="vc-atmosphere" aria-hidden="true"><div class="vc-mist"></div><div class="vc-orbit"></div><div class="vc-motes">${Array.from({ length: 16 }, (_, i) => `<i style="--n:${i};left:${(i * 37) % 100}%;top:${(i * 23) % 100}%"></i>`).join('')}</div></div>
          <header class="vc-header"><div class="vc-wordmark"><span class="vc-crest">${icon('crown')}</span><div><span class="vc-eyebrow">THE BLACK LEDGER</span><h1 id="vc-title">Vesperchain</h1></div></div><div class="vc-header-actions"><button type="button" data-command="drawer" aria-label="Settings">${icon('gear')}</button><button type="button" data-command="close" aria-label="Close">${icon('close')}</button></div></header>
          <div class="vc-context"></div><div class="vc-body"><nav class="vc-decks" role="tablist" aria-label="System decks"></nav><div class="vc-book" id="vc-deck-panel" role="tabpanel"><div class="vc-breadcrumb"></div><nav class="vc-tabs" role="tablist" aria-label="Deck pages"></nav><section class="vc-page" id="vc-page" role="tabpanel"></section></div></div>
          <footer class="vc-footer"><span>${icon('gem')}<span>INTERFACE FOUNDATION · 0.1</span></span><button type="button" data-command="drawer">${icon('spark')}<span class="vc-customize">Appearance & effects</span></button></footer>`;
        doc.body.append(dialog);
        on(dialog, 'click', e => {
            if (e.target === dialog) {
                const r = dialog.getBoundingClientRect();
                if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
            }
            const command = e.target.closest('[data-command]')?.dataset.command;
            if (command === 'close') return close();
            if (command === 'drawer') return openDrawer();
            const deckId = e.target.closest('[data-deck]')?.dataset.deck;
            const pageId = e.target.closest('[data-page]')?.dataset.page;
            if (deckId) { const deck = DECKS.find(d => d.id === deckId); active = remembered.get(deckId) || deck.pages[0]; renderPage(); doc.getElementById(`vc-deck-${deckId}`)?.focus(); }
            else if (pageId && PAGES[pageId]) { active = pageId; renderPage(); doc.getElementById(`vc-tab-${pageId}`)?.focus(); }
            else feedback(e);
        });
        on(dialog, 'keydown', tabKeys);
        on(dialog, 'close', () => { stopAnimations(); syncLaunchers(); if (returnFocus?.isConnected) returnFocus.focus(); });
        on(dialog, 'cancel', e => { e.preventDefault(); close(); });
    }
    function renderContext() {
        if (!dialog) return;
        const name = context().name2;
        dialog.querySelector('.vc-context').innerHTML = `<span>${icon('moon')}${l('พื้นที่ของเรื่องราว', 'Your story space')}</span><span>${name ? escape(name) : l('ยังไม่ได้เลือกตัวละคร', 'No character selected')}</span>`;
    }
    function renderPage() {
        if (!dialog) return;
        stopAnimations();
        const deck = DECKS.find(d => d.pages.includes(active)), data = PAGES[active]; remembered.set(deck.id, active);
        dialog.querySelector('.vc-decks').innerHTML = DECKS.map((d, i) => `<button type="button" id="vc-deck-${d.id}" role="tab" data-deck="${d.id}" aria-controls="vc-deck-panel" aria-selected="${d.id === deck.id}" tabindex="${d.id === deck.id ? 0 : -1}"><span class="vc-deck-number">0${i + 1}</span><span class="vc-deck-symbol">${icon(d.icon)}</span><span class="vc-deck-label">${l(d.th, d.en)}</span><span class="vc-deck-sub">${d.en}</span></button>`).join('');
        dialog.querySelector('#vc-deck-panel').setAttribute('aria-labelledby', `vc-deck-${deck.id}`);
        dialog.querySelector('.vc-breadcrumb').innerHTML = `${icon(deck.icon)}<span>${deck.en}</span>${icon('chevron')}<span>${l(data[0], data[1])}</span>`;
        dialog.querySelector('.vc-tabs').innerHTML = deck.pages.map(id => `<button type="button" role="tab" id="vc-tab-${id}" data-page="${id}" aria-controls="vc-page" aria-selected="${id === active}" tabindex="${id === active ? 0 : -1}">${l(PAGES[id][0], PAGES[id][1])}</button>`).join('');
        const page = dialog.querySelector('.vc-page'); page.setAttribute('aria-labelledby', `vc-tab-${active}`);
        const heading = `<div class="vc-section-heading"><span class="vc-eyebrow">${data[1]}</span><h2>${l(data[0], data[1])}</h2><p>${l(data[2], data[3])}</p></div>`;
        if (active === 'home') {
            page.innerHTML = `<div class="vc-hero"><div class="vc-hero-copy"><span class="vc-eyebrow">CHAPTER I / AN UNWRITTEN FORTUNE</span><h2>${l('ใต้เงานคร<br>เหนือคำสาบาน', 'Beneath the city.<br>Beyond the oath.')}</h2><p>${l('เปิดสมุดบัญชีของคุณ แล้วเลือกเส้นทางถัดไป', 'Open your ledger. Choose the next road.')}</p><button type="button" class="vc-primary" data-page="shop">${l('สำรวจร้านและคอก', 'Explore the menagerie')}${icon('arrow')}</button></div><div class="vc-sigil" aria-hidden="true"><div class="vc-sigil-ring"></div><div class="vc-sigil-inner">${icon('book')}</div><span>V</span></div></div>
              <div class="vc-home-links">${[['contracts', 'scales', l('ข้อเสนอและคำสาบาน', 'Offers & obligations')], ['travel', 'compass', l('เส้นทางแห่ง Avarenth', 'Roads of Avarenth')], ['codex', 'book', l('หอจดหมายเหตุ', 'The veiled archive')]].map(([id, mark, title]) => `<button type="button" data-page="${id}">${icon(mark)}<span>${title}</span>${icon('arrow')}</button>`).join('')}</div>
              <p class="vc-phase-note">${l('เริ่มต้นด้วยอินเทอร์เฟซ · ระบบเกมและการเชื่อม AI ยังไม่เปิดใช้งาน', 'Interface foundation · Game simulation and AI integration are not connected yet.')}</p>`;
        } else if (active === 'settings') {
            page.innerHTML = heading + `<article class="vc-reference"><span class="vc-reference-icon">${icon('gear')}</span><h3>${l('ปรับแต่งจาก Extensions drawer', 'Customize in the Extensions drawer')}</h3><p>${l('ตัวเปิด UI ธีม ฟอนต์ ความหนาแน่น และเอฟเฟกต์ทั้งหมดอยู่ในหน้าตั้งค่าเดียวกัน', 'Launchers, palettes, typography, spacing, and effects live together in one settings panel.')}</p><button type="button" class="vc-primary" data-command="drawer">${l('เปิดหน้าตั้งค่า', 'Open settings')}${icon('arrow')}</button></article>`;
        } else {
            page.innerHTML = heading + `<div class="vc-reference-grid"><article class="vc-reference"><span class="vc-eyebrow">LORE REFERENCE</span><h3>${l('ข้อมูลอ้างอิง', 'Reference notes')}</h3><ul>${data[4].map(f => `<li>${escape(f)}</li>`).join('')}</ul></article><article class="vc-empty"><span class="vc-empty-mark">${icon(deck.icon)}</span><h3>${l('ยังไม่เชื่อมข้อมูลแคมเปญ', 'Campaign not connected')}</h3><p>${l('หน้านี้เตรียมไว้สำหรับระบบถัดไป ข้อมูลอ้างอิงไม่ได้สร้างสินค้า รับงาน หรือเปลี่ยนสถานะในแชต', 'This page is reserved for the next system layer. Reference notes do not create inventory, accept contracts, or change your chat.')}</p><span class="vc-tag">${l('อินเทอร์เฟซพร้อม · รอระบบเกม', 'Interface ready · Simulation pending')}</span></article></div>`;
        }
        dialog.querySelector('[data-command="close"]').setAttribute('aria-label', l('ปิด', 'Close'));
        dialog.querySelector('[data-command="drawer"]').setAttribute('aria-label', l('ตั้งค่า', 'Settings'));
        dialog.querySelector('.vc-customize').textContent = l('ปรับรูปลักษณ์และเอฟเฟกต์', 'Appearance & effects');
        renderContext(); applyAppearance();
        if (config.transitions) animate(page, [{ opacity: 0.35, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250, easing: 'ease-out' });
    }
    function open() {
        if (!config.enabled || destroyed) return;
        mountDialog(); if (dialog.open) return;
        returnFocus = doc.activeElement; renderPage(); dialog.showModal(); syncLaunchers();
        dialog.querySelector('[data-command="close"]').focus();
    }
    function close() { if (dialog?.open) dialog.close(); applyAppearance(); }
    function openDrawer() {
        close(); mountDrawer();
        returnFocus = drawer?.querySelector('summary');
        const host = doc.getElementById('extensions-settings-button');
        const content = host?.querySelector('.drawer-content');
        if (content && !content.classList.contains('openDrawer')) host.querySelector('.drawer-toggle')?.click();
        if (drawer) {
            drawer.querySelector('details').open = true;
            drawer.scrollIntoView({ behavior: 'auto', block: 'center' });
            drawer.querySelector('summary').focus();
        }
    }
    function mount() { if (destroyed) return; mountDrawer(); syncLaunchers(); }
    let mounting = false;
    const observer = new win.MutationObserver(() => {
        // Observe only missing/replaced host mounts. Our own renders never trigger remount loops.
        const needsDrawer = !drawer?.isConnected && (doc.getElementById('extensions_settings2') || doc.getElementById('extensions_settings'));
        const needsWand = launcherVisibility(config).wand && !wand?.isConnected && doc.getElementById('extensionsMenu');
        if ((!needsDrawer && !needsWand) || mounting) return;
        mounting = true; win.queueMicrotask(() => { mounting = false; mount(); });
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    on(win, 'resize', placeFloating); on(win.visualViewport, 'resize', placeFloating); on(win.visualViewport, 'scroll', placeFloating);
    on(media, 'change', applyAppearance);
    on(doc, 'visibilitychange', () => { if (doc.hidden) stopAnimations(); applyAppearance(); });
    const ctx = context(), changed = ctx.event_types?.CHAT_CHANGED;
    if (changed) ctx.eventSource?.on(changed, renderContext);
    mount();
    return { open, close, openDrawer, getConfig: () => normalize(config),
        destroy() { destroyed = true; close(); abort.abort(); observer.disconnect(); stopAnimations();
            if (changed) ctx.eventSource?.removeListener?.(changed, renderContext);
            [drawer, dialog, wand, floating, fontLink].forEach(n => n?.remove());
        } };
}
