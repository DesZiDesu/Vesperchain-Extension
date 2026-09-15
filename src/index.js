import { createApp } from './app.js';

// Uses the public SillyTavern context API, independent of extension directory name.
const INSTANCE = '__vesperchainExtension';
async function boot() {
    if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    const context = () => globalThis.SillyTavern?.getContext?.();
    for (let attempt = 0; attempt < 80; attempt++) {
        const ctx = context();
        if (ctx?.extensionSettings && typeof ctx.saveSettingsDebounced === 'function') return createApp(context);
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('SillyTavern context did not become ready. Reload SillyTavern after it finishes loading.');
}
if (!globalThis[INSTANCE]) {
    globalThis[INSTANCE] = boot().catch(error => {
        console.error('[Vesperchain] Initialization failed:', error);
        globalThis[INSTANCE] = null;
        const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
        const message = document.createElement('p'); message.setAttribute('role', 'alert');
        message.textContent = `Vesperchain: ${error.message}`; host?.append(message);
    });
}
