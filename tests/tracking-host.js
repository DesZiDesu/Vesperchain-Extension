const events = new Map(), chatName = localStorage.getItem('activeChat') || 'chat-a';
const types = Object.fromEntries(['CHAT_CHANGED', 'MESSAGE_RECEIVED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED', 'GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED'].map(x => [x, x]));
const ctx = { characterId: 0, characters: [{ avatar: 'vesper.png' }, { avatar: 'other.png' }], name1: 'Mali', name2: 'Vesperchain', chatId: chatName,
    chat: JSON.parse(localStorage.getItem(chatName + '-messages') || '[]'), chatMetadata: JSON.parse(localStorage.getItem(chatName + '-metadata') || '{}'),
    extensionSettings: JSON.parse(localStorage.getItem('settings') || '{}'), eventTypes: types, extensionPrompts: {},
    getCurrentChatId: () => ctx.chatId,
    saveSettingsDebounced() { localStorage.setItem('settings', JSON.stringify(ctx.extensionSettings)); },
    async saveChat() { localStorage.setItem(ctx.chatId + '-messages', JSON.stringify(ctx.chat)); localStorage.setItem(ctx.chatId + '-metadata', JSON.stringify(ctx.chatMetadata)); },
    setExtensionPrompt(key, value) { ctx.extensionPrompts[key] = value; },
    eventSource: { on(type, fn) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(fn); }, removeListener(type, fn) { events.get(type)?.delete(fn); }, async emit(type, ...args) { for (const fn of events.get(type) || []) await fn(...args); } },
};
window.SillyTavern = { getContext: () => ctx };
window.fixture = {
    async switchChat(id, character = 0) {
        ctx.chatId = id; ctx.characterId = character;
        ctx.chat = JSON.parse(localStorage.getItem(id + '-messages') || '[]'); ctx.chatMetadata = JSON.parse(localStorage.getItem(id + '-metadata') || '{}');
        localStorage.setItem('activeChat', id); this.render(); await ctx.eventSource.emit(types.CHAT_CHANGED);
    },
    async add(record, user = false, narrative = null) {
        ctx.chat.push({ name: user ? 'Mali' : 'Narrator', is_user: user, send_date: String(Date.now()) + ctx.chat.length,
            mes: record ? (narrative || 'The rain falls against the shutters.') + '\n```vesperchain\n' + JSON.stringify(record) + '\n```' : 'A quiet moment.' });
        this.render(); await ctx.eventSource.emit(types.MESSAGE_RECEIVED, ctx.chat.length - 1); await ctx.eventSource.emit(types.CHARACTER_MESSAGE_RENDERED, ctx.chat.length - 1); await ctx.saveChat();
    },
    render() {
        const chat = document.querySelector('#chat'); chat.replaceChildren();
        ctx.chat.forEach((m, i) => {
            const node = document.createElement('div'); node.className = 'mes'; node.setAttribute('mesid', i);
            const block = document.createElement('div'); block.className = 'mes_block'; const body = document.createElement('div'); body.className = 'mes_text';
            body.append(document.createTextNode(m.mes.split('```')[0]));
            if (m.mes.includes('```vesperchain')) { const pre = document.createElement('pre'), code = document.createElement('code'); code.className = 'language-vesperchain'; code.textContent = m.mes.split('```vesperchain')[1]; pre.append(code); body.append(pre); }
            block.append(body); node.append(block); chat.append(node);
        });
    },
    async emit(type, ...args) { await ctx.eventSource.emit(type, ...args); },
};
fixture.render(); document.querySelector('.drawer-toggle').onclick = () => document.querySelector('.drawer-content').classList.toggle('openDrawer');
