import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalize, launcherVisibility, motionAllowed, screenPosition, relativePosition } from '../src/config.js';
import { DECKS, PAGES } from '../src/catalog.js';

test('malformed saved preferences cannot inject CSS, retain NaN, or enable flags with strings', () => {
    const c = normalize({ theme: 'url(evil)', enabled: 'false', intensity: Infinity, textSize: -999, position: { x: NaN, y: 99 } });
    assert.equal(c.theme, DEFAULTS.theme); assert.equal(c.enabled, true); assert.equal(c.intensity, 55);
    assert.equal(c.textSize, 14); assert.deepEqual(c.position, { x: .95, y: 1 });
    assert.equal(normalize(null).theme, DEFAULTS.theme); assert.equal(normalize([]).enabled, true);
});
test('every launcher combination remains opt-in and disabling always hides both', () => {
    for (const enabled of [true, false]) for (const showWand of [true, false]) for (const showFloating of [true, false]) {
        assert.deepEqual(launcherVisibility({ enabled, showWand, showFloating }), { wand: enabled && showWand, floating: enabled && showFloating });
    }
});
test('system reduced motion cannot be overridden by extension preference', () => {
    assert.equal(motionAllowed(DEFAULTS, true), false);
    assert.equal(motionAllowed({ ...DEFAULTS, reducedMotion: true }), false);
    assert.equal(motionAllowed({ ...DEFAULTS, enabled: false }), false);
    assert.equal(motionAllowed(DEFAULTS), true);
});
test('drag placement stays inside resized and offset mobile viewports, round trips without drift', () => {
    for (const v of [{ width: 320, height: 480 }, { width: 1200, height: 800 }, { width: 390, height: 350, left: 10, top: 90 }]) {
        for (const position of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: .47, y: .71 }]) {
            const p = screenPosition(position, v);
            assert.ok(p.left >= (v.left || 0) + 16 && p.left + 56 <= (v.left || 0) + v.width - 16);
            assert.ok(p.top >= (v.top || 0) + 16 && p.top + 56 <= (v.top || 0) + v.height - 16);
            const next = relativePosition(p.left, p.top, v); assert.ok(Math.abs(next.x - position.x) < 1e-10); assert.ok(Math.abs(next.y - position.y) < 1e-10);
        }
    }
});
test('all sixteen pages have a unique owning deck and no unregistered routes', () => {
    const pages = DECKS.flatMap(d => d.pages); assert.equal(pages.length, 16);
    assert.equal(new Set(pages).size, pages.length); assert.deepEqual([...pages].sort(), Object.keys(PAGES).sort());
});
test('normalization returns independent positions, not a mutable shared default', () => {
    const a = normalize(), b = normalize(); a.position.x = 0; assert.equal(b.position.x, .95); assert.equal(DEFAULTS.position.x, .95);
});
