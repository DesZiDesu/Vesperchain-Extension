export const KEY = 'vesperchain';
export const DEFAULTS = Object.freeze({
    schemaVersion: 1, enabled: true, showWand: true, showFloating: false,
    theme: 'obsidian', language: 'th', density: 'comfortable', textSize: 16,
    ornateFonts: true, ambient: true, particles: true, glow: true,
    transitions: true, pressEffects: true, reducedMotion: false,
    npcHeaders: true, narrativeHeaders: true, npcPortraits: true, npcDefaultScope: 'chat',
    sceneTracker: true, chatContracts: true, injectTrackingPrompt: true,
    intensity: 55, speed: 'normal', position: Object.freeze({ x: 0.95, y: 0.72 }),
});
const choices = { npcDefaultScope: ['chat', 'character'], theme: ['obsidian', 'moonstone'], language: ['th', 'en'],
    density: ['comfortable', 'compact'], speed: ['slow', 'normal', 'fast'] };
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const finite = (n, fallback) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
/** Copy and validate only known preferences. Never read/write campaign state. */
export function normalize(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const out = { ...DEFAULTS, position: { ...DEFAULTS.position } };
    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (typeof value === 'boolean' && typeof input[key] === 'boolean') out[key] = input[key];
        if (choices[key]?.includes(input[key])) out[key] = input[key];
    }
    out.textSize = clamp(finite(input.textSize, DEFAULTS.textSize), 14, 20);
    out.intensity = clamp(finite(input.intensity, DEFAULTS.intensity), 0, 100);
    for (const axis of ['x', 'y']) out.position[axis] = clamp(finite(input.position?.[axis], DEFAULTS.position[axis]), 0, 1);
    return out;
}
export function motionAllowed(config, systemReduced = false) {
    return config.enabled && !config.reducedMotion && !systemReduced;
}
export function launcherVisibility(config) {
    return { wand: config.enabled && config.showWand, floating: config.enabled && config.showFloating };
}
export function screenPosition(position, viewport, size = 56) {
    const inset = 16;
    const width = Math.max(0, viewport.width - size - inset * 2);
    const height = Math.max(0, viewport.height - size - inset * 2);
    return { left: (viewport.left || 0) + inset + position.x * width,
        top: (viewport.top || 0) + inset + position.y * height };
}
export function relativePosition(left, top, viewport, size = 56) {
    return { x: clamp((left - (viewport.left || 0) - 16) / Math.max(1, viewport.width - size - 32), 0, 1),
        y: clamp((top - (viewport.top || 0) - 16) / Math.max(1, viewport.height - size - 32), 0, 1) };
}
