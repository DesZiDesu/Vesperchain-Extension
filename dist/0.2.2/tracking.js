import { createNpcs, seedNpcProfiles } from './npcs.js';
import { CAMPAIGN_KEY, ARCHIVE_KEY, blankState, freshCampaign, replay, messageKey, makeDecision, checkpoint, validateCheckpoint, continueCampaign, copy, esc, digest, ENTITY_TYPES } from './campaign.js';
import { icon } from './icons.js';

export const PROFILE_KEY = 'vesperchainProfiles';
const PROMPT_KEY = 'vesperchain-main-chat-v1';
export function identity(ctx) {
    const group = ctx.groupId;
    const character = ctx.characters?.[ctx.characterId] || ctx.character;
    const owner = group !== null && group !== undefined && group !== '' ? `group:${group}` : character?.avatar ? `character:${character.avatar}` : ctx.characterId !== undefined && ctx.characterId !== null ? `character-id:${ctx.characterId}` : null;
    const chatId = ctx.getCurrentChatId?.() ?? ctx.chatId;
    return owner && chatId !== null && chatId !== undefined && chatId !== '' ? { owner, chatId: String(chatId) } : null;
}
const freshId = () => globalThis.crypto.randomUUID();
const show = value => value === null || value === undefined || value === '' ? '—' : esc(value);
const initialResult = () => ({ state: blankState(), frames: {}, errors: [] });

export function createTracking(getContext, getConfig, doc = document) {
    const win = doc.defaultView, abort = new win.AbortController(), subscriptions = [];
    let npcs;
    let current = null, result = initialResult(), busy = false, generationType = '', destroyed = false;
    let observer = null, scheduled = false, saveError = '', saving = 0, panelDialog, sourceForReview = null, reviewChat = null;
    let lastDigest = '', pausedMessages = null;
    const callbacks = new Set();
    const on = (target, type, handler) => target?.addEventListener(type, handler, { signal: abort.signal });
    const l = (th, en) => getConfig().language === 'th' ? th : en;
    const profile = () => {
        const ctx = getContext(), who = identity(ctx); return who ? ctx.extensionSettings[PROFILE_KEY]?.[who.owner] : null;
    };
    const available = () => Boolean(identity(getContext()));
    const enabled = () => Boolean(getConfig().enabled && profile()?.enabled && current?.tracking !== false);
    function ownerProfiles() { const settings = getContext().extensionSettings; if (!settings[PROFILE_KEY]) settings[PROFILE_KEY] = {}; return settings[PROFILE_KEY]; }
    function checkCurrent(expected = current?.id) {
        const who = identity(getContext());
        if (!who || !current || current.owner !== who.owner || current.chatId !== who.chatId || current.id !== expected) throw new Error(l('แชตเปลี่ยนแล้ว กรุณาเปิดใหม่', 'The chat changed. Reopen this action.'));
    }
    function storeMetadata() {
        checkCurrent(); const ctx = getContext(), meta = ctx.chatMetadata, savedId = current.id;
        if (!meta || typeof ctx.saveChat !== 'function') throw new Error('Host chat saving is unavailable. Update SillyTavern before enabling tracking.');
        meta[CAMPAIGN_KEY] = current;
        saving++;
        // Call synchronously while this chat is current; do not defer a global save until after switching chats.
        let request;
        try { request = ctx.saveChat(); } catch (e) { saving--; throw e; }
        Promise.resolve(request).then(() => { if (current?.id === savedId) saveError = ''; }).catch(e => {
            if (current?.id === savedId) { saveError = `Save failed: ${e.message}. Keep this chat open and retry from Recovery.`; notify(); }
        }).finally(() => { saving = Math.max(0, saving - 1); });
    }
    function notify() { for (const fn of callbacks) fn(); }
    function loadChat() {
        npcs?.reset();
        busy = false; pausedMessages = null; generationType = ''; sourceForReview = null; reviewChat = null; panelDialog?.close();
        const ctx = getContext(), who = identity(ctx); result = initialResult(); lastDigest = ''; saveError = ''; current = null;
        if (!who || !profile()?.enabled || !getConfig().enabled) { cleanChat(); prompt(); notify(); return; }
        const saved = ctx.chatMetadata?.[CAMPAIGN_KEY];
        if (saved?.version > 1) { saveError = 'This campaign needs a newer Vesperchain version.'; cleanChat(); prompt(); notify(); return; }
        if (saved?.version === 1 && saved.owner === who.owner && saved.chatId === who.chatId) current = saved;
        else {
            current = freshCampaign(who.owner, who.chatId, freshId());
            current.baseline.entities.npcs = seedNpcProfiles(ctx, who.owner);
            current.npcScopes = Object.fromEntries(Object.keys(current.baseline.entities.npcs).map(id => [id, 'character']));
        } // Only explicitly shared NPC identities seed a new chat; campaign progress never does.
        sync();
    }
    function activeMessages() { return pausedMessages || getContext().chat || []; }
    function sync() {
        if (destroyed) return;
        if (!enabled()) { cleanChat(); prompt(); notify(); return; }
        try {
            checkCurrent(); result = replay(current, activeMessages());
            npcs?.reconcile();
            const changed = digest({ result, actions: current.actions, startAfter: current.startAfter, npcScopes: current.npcScopes, npcPublished: current.npcPublished });
            if (!busy && changed !== lastDigest) { current.latest = result.state; storeMetadata(); lastDigest = changed; }
        } catch (e) { saveError = e.message; }
        renderChat(); prompt(); notify();
    }
    function paintRoot(node) {
        const c = getConfig(); node.dataset.theme = c.theme; node.dataset.fonts = String(c.ornateFonts); node.dataset.language = c.language;
        node.style.setProperty('--vc-type-size', `${c.textSize}px`);
    }
    function cleanChat() {
        npcs?.clean();
        doc.querySelectorAll('#chat .vc-message-tracker, #chat .vc-contracts').forEach(n => n.remove());
        doc.querySelectorAll('#chat .vc-machine-hidden').forEach(n => n.classList.remove('vc-machine-hidden'));
    }
    function contractMarkup(contract, interactive = true) {
        const o = contract.offer, statuses = { offered: l('รอการตัดสินใจ', 'Awaiting decision'), signed: l('ลงนามแล้ว', 'Signed'), declined: l('ปฏิเสธแล้ว', 'Declined'), ready: l('พร้อมส่งมอบ', 'Ready for handover'), completed: l('ชำระครบแล้ว', 'Settled') };
        return `<article class="vc-parchment" data-contract-id="${esc(o.id)}"><div class="vc-paper-top"><span>ARTICLES OF AGREEMENT</span><span class="vc-wax">${icon('scales')}</span></div><h3>${esc(o.title)}</h3><p class="vc-issuer">${l('ผู้ออกสัญญา', 'Issued by')} · ${esc(o.issuer)}</p><p>${esc(o.objective)}</p><details><summary>${l('อ่านเงื่อนไขทั้งหมด', 'Read all terms')}</summary><p>${esc(o.terms)}</p>${o.deliver.length ? `<ul>${o.deliver.map(i => `<li>${esc(i.itemId)} × ${i.quantity}</li>`).join('')}</ul>` : ''}</details><div class="vc-paper-values"><span>${o.reward.silver} silver · ${o.reward.xp} XP</span><span>${o.deadlineDay === null ? l('ไม่มีกำหนดวัน', 'No deadline') : `Day ${o.deadlineDay}`}</span></div>${contract.signature ? `<p class="vc-signature">${esc(contract.signature)}</p>` : ''}<div class="vc-paper-actions"><span class="vc-contract-status">${statuses[contract.status]}</span>${interactive && contract.status === 'offered' ? `<button type="button" data-contract-review="sign" data-contract="${esc(o.id)}">${icon('book')}${l('ตรวจและลงนาม', 'Review & sign')}</button><button type="button" data-contract-review="decline" data-contract="${esc(o.id)}">${l('ปฏิเสธ', 'Decline')}</button>` : interactive && contract.status === 'ready' ? `<button type="button" data-contract-review="settle" data-contract="${esc(o.id)}">${l('ตรวจการส่งมอบ', 'Review handover')}${icon('arrow')}</button>` : ''}</div></article>`;
    }
    function renderChat() {
        const chat = doc.getElementById('chat'); if (!chat) return;
        const c = getConfig(), messages = getContext().chat || [];
        for (const node of chat.querySelectorAll('.mes[mesid]')) {
            const index = Number(node.getAttribute('mesid')), message = messages[index];
            if (!message || message.is_user || message.is_system) { node.querySelectorAll('.vc-message-tracker,.vc-contracts').forEach(n => n.remove()); continue; }
            const block = node.querySelector('.mes_block') || node;
            let tracker = node.querySelector('.vc-message-tracker');
            if (!c.sceneTracker) tracker?.remove();
            else {
                if (!tracker) { tracker = doc.createElement('div'); tracker.className = 'vc-root vc-message-tracker'; block.prepend(tracker); }
                const frame = result.frames[index];
                const scene = frame?.scene || blankState().scene;
                const label = !frame ? busy ? l('รอคำตอบจบ', 'Waiting for response') : l('ก่อนเริ่มแคมเปญนี้', 'Before this continuation') : frame.status === 'confirmed' ? l('ยืนยันจากข้อความนี้', 'Confirmed here') : frame.status === 'rejected' ? l('ข้อมูลอัปเดตไม่ผ่าน', 'Update rejected') : l('คงข้อมูลล่าสุดที่ยืนยัน', 'Last confirmed scene');
                const markup = `<div class="vc-scene-banner"><span class="vc-scene-crest">${icon('compass')}</span><div class="vc-scene-place"><div class="vc-scene-region">${[scene.region, scene.city].filter(Boolean).map(esc).join(' · ')}</div><h3>${esc(scene.place || scene.city || l('ยังไม่ทราบสถานที่', 'Location unknown'))}</h3>${scene.room ? `<div class="vc-scene-room">${esc(scene.room)}</div>` : ''}</div></div><div class="vc-scene-meta"><span>${icon('calendar')}Day ${show(scene.day)} · ${show(scene.month)} ${show(scene.year)}</span><span>${icon('moon')}${show(scene.period)}</span><span>${icon('weather')}${show(scene.weather)}</span></div><div class="vc-scene-state">${label}${frame?.reason ? ` · ${esc(frame.reason)}` : ''}</div>`;
                if (tracker.innerHTML !== markup) tracker.innerHTML = markup; paintRoot(tracker);
            }
            const contracts = Object.values(result.state.contracts).filter(x => x.anchor === result.frames[index]?.anchor);
            let cards = node.querySelector('.vc-contracts');
            if (!c.chatContracts || !contracts.length) cards?.remove();
            else {
                if (!cards) { cards = doc.createElement('div'); cards.className = 'vc-root vc-contracts'; (node.querySelector('.mes_text') || block).after(cards); }
                const markup = contracts.map(o => contractMarkup(o)).join('');
                // Keep open details and keyboard focus across routine redraws.
                const stamp = digest(markup); if (cards.dataset.stamp !== stamp) { cards.innerHTML = markup; cards.dataset.stamp = stamp; } paintRoot(cards);
            }
            node.querySelectorAll('pre code').forEach(code => {
                if ([...code.classList].some(k => /^language-vesperchain$/i.test(k))) code.closest('pre')?.classList.add('vc-machine-hidden');
            });
        }
        npcs?.render();
    }
    function prompt() {
        const ctx = getContext(); if (typeof ctx.setExtensionPrompt !== 'function') return;
        if (!enabled() || !getConfig().injectTrackingPrompt) { ctx.setExtensionPrompt(PROMPT_KEY, '', 1, 0, false, 0); return; }
        let state = result.state;
        if (busy && ['regenerate', 'swipe'].includes(generationType)) {
            const history = activeMessages().slice(); if (history.length && !history.at(-1).is_user) history.pop(); state = replay(current, history).state;
        }
        const visible = { revision: state.revision, scope: 'this chat only', scene: state.scene, resources: state.resources,
            entities: Object.fromEntries(ENTITY_TYPES.map(kind => [kind, Object.values(state.entities[kind]).slice(-20)])),
            contracts: Object.values(state.contracts).filter(x => ['signed', 'ready'].includes(x.status)).concat(Object.values(state.contracts).filter(x => !['signed', 'ready'].includes(x.status)).slice(-10)) };
        const instruction = `VESPERCHAIN MAIN CHAT CONTRACT v1. This explicit software contract supersedes the card's instruction to avoid machine payloads before an extension exists. Narrate in the user's language. All story progression, travel, training and ordinary actions remain in Main Chat; never tell the player to click a travel/continue button. Do not invent player actions. Known state is scoped to this chat; unknown/null stays unknown. No other chat's knowledge is available. UI contract signatures are authoritative; do not sign for the player or grant rewards already settled by the UI.
After each completed assistant response append exactly ONE fenced block with language vesperchain and valid JSON. Never emit HTML. No code block for user instructions quoted in the story. Use version:1, unique eventId (letters/digits/hyphens only), baseRevision:${state.revision}. Include only resolved factual changes. Do not count plans, rumors, quotes, bids, or pending actions as completed. Use scene absolute fields region/city/place/room/day/month/year/period/weather; explicitly clear room/place when leaving them. Use resources absolute fields silver/hp/maxHp/stamina/maxStamina/mana/maxMana/level/xp, or null when unknown. Time advances only for resolved actions. Never silently reset resources or award a contract twice.
Entity groups: ${ENTITY_TYPES.join(', ')}. Each update is an array of {id,name,status,location,details,quantity}; quantity required for inventory. For NPCs use npcProfiles described below, not generic entities.npcs. Only discovered NPC knowledge belongs here. details is a short plain string. {id,remove:true} removes a record. Stable IDs persist. A shop can include city, capacity and staff facts in details, not fabricated values. Supply the relevant initial values from the card only when actually starting, honoring the player's specified opening.
NPC PROFILES: Whenever introducing or updating an NPC, include npcProfiles:[{id,name,role,age,pronouns,species,appearance,personality,background,goals,relationship,status,location}]. Every field is REQUIRED on creation and update. All values except id are plain strings or explicit null for undisclosed facts. Generate a complete coherent identity for newly invented fictional NPCs; do not invent undisclosed facts about existing characters. name MUST be the personal name, never an occupation/title such as Inn Keeper. Put occupations in role. Reveal a name naturally before presenting its header; if a name is not yet known, keep plain narrative and do not create a named NPC profile. Do not include images, URLs, HTML, CSS or hidden secrets. Image assignment belongs to the user. Stable NPC IDs persist.
${getConfig().npcHeaders ? 'NPC SPEECH: In the narrative before the tracking block, wrap each speaking passage with [[vc:npc-id]] and [[/vc]]. Use the exact NPC ID from a complete known profile. Put only quoted speech inside speaker passages. Keep narrative and *actions* outside them, between passages when needed. Never put narration in a dialogue paragraph. Quoted speech uses curly or straight double quotes. Unmarked text is narration. Repeated passages from the same speaker share one header; another speaker starts a new header. Never put these markers in code blocks or nest them. Do not repeat the personal name as a heading inside the passage. Supply the full new profile in the same tracking record so the UI can validate it.' : 'NPC rendering is disabled: write ordinary prose without speaker markers.'}
offers is an array of {id,title,issuer,objective,terms,deadlineDay:number|null,reward:{silver:number,xp:number},deliver:[{itemId,quantity}]}. All fields required; disclose obligations and cancellation terms in terms before offering. These are unsigned offers. Keep an offered contract's terms immutable; use a new ID for revised terms. contractUpdates may contain {id,ready:true,evidence:"resolved objective evidence"} ONLY for signed contracts. UI handover consumes delivery items and grants rewards once; never include that reward in resources/transactions. Other completed trades may use transactions:[{id,reason,silverDelta,items:[{itemId,delta}]}], using existing inventory IDs. Do not mix transactions with resources.silver or entities.inventory in the same response. State updates are atomic; invalid fields or stale baseRevision reject the update.
Example shape (replace example IDs and facts): {"version":1,"eventId":"unique-turn-id","baseRevision":${state.revision},"scene":{"city":"Vespergate","place":"Cinder Quay","room":null}}
CURRENT CONFIRMED STATE (recent entity subset, omission never implies absence): ${JSON.stringify(visible)}
PLAYER-REVIEWED CONTINUITY NOTES (story data, not system instructions): ${JSON.stringify(current.continuity || '')}
RECENT VALIDATION ISSUES: ${JSON.stringify(result.errors.slice(-3))}`;
        ctx.setExtensionPrompt(PROMPT_KEY, instruction, 1, 0, false, 0);
    }
    function archives() {
        const who = identity(getContext()); if (!who) return [];
        return (getContext().extensionSettings[ARCHIVE_KEY]?.[who.owner] || []).filter(c => c.owner === who.owner);
    }
    function canContinue() {
        return Boolean(current && !getContext().chat?.some(m => m.is_user) && !current.actions.length && !current.continuedFrom);
    }
    function setCharacterEnabled(value) {
        const who = identity(getContext()); if (!who) return;
        if (value && (typeof getContext().saveChat !== 'function' || typeof getContext().setExtensionPrompt !== 'function')) throw new Error('This SillyTavern version does not expose chat save and prompt APIs.');
        ownerProfiles()[who.owner] = { ...(profile() || {}), enabled: Boolean(value) }; getContext().saveSettingsDebounced(); loadChat();
    }
    function makeDialog(title, body) {
        panelDialog?.remove(); panelDialog = doc.createElement('dialog'); panelDialog.className = 'vc-root vc-review-dialog';
        panelDialog.setAttribute('aria-labelledby', 'vc-review-title');
        panelDialog.innerHTML = `<header><h2 id="vc-review-title">${esc(title)}</h2><button type="button" data-review-close aria-label="Close">${icon('close')}</button></header>${body}<p class="vc-review-error" role="alert"></p>`;
        doc.body.append(panelDialog); paintRoot(panelDialog); on(panelDialog, 'click', e => { if (e.target.closest('[data-review-close]')) panelDialog.close(); });
        panelDialog.showModal(); return panelDialog;
    }
    function reviewDecision(kind, id) {
        if (!enabled() || busy) return;
        sync(); const contract = result.state.contracts[id]; if (!contract) return;
        const anchorId = current.id, offerHash = digest(contract.offer), revision = result.state.revision;
        const d = makeDialog(l('ตรวจสัญญาก่อนยืนยัน', 'Review agreement'), `${contractMarkup(contract, false)}${kind === 'sign' ? `<label class="vc-field">${l('ชื่อที่ใช้ลงนาม', 'Your signature')}<input id="vc-sign-input" maxlength="120" autocomplete="off" placeholder="${esc(getContext().name1 || '')}"></label>` : ''}${kind === 'settle' ? `<p>${esc(contract.evidence)}<br>${l('ระบบจะส่งมอบของและรับค่าตอบแทนพร้อมกัน', 'Items and payment settle together.')}</p>` : ''}<button class="vc-primary" type="button" id="vc-confirm-decision">${kind === 'sign' ? l('ลงนามในสัญญา', 'Sign agreement') : kind === 'decline' ? l('ยืนยันการปฏิเสธ', 'Confirm decline') : l('ยืนยันส่งมอบและรับเงิน', 'Confirm handover & payment')}</button>`);
        on(d.querySelector('#vc-confirm-decision'), 'click', () => {
            try {
                checkCurrent(anchorId); if (busy) throw new Error('Wait for the current response to finish.');
                const latest = replay(current, getContext().chat);
                if (latest.state.revision !== revision || digest(latest.state.contracts[id]?.offer) !== offerHash) throw new Error('The state changed. Close and review this contract again.');
                const action = makeDecision(current, getContext().chat, kind, id, d.querySelector('#vc-sign-input')?.value || '', freshId());
                current.actions.push(action); sync(); d.close();
            } catch (e) { d.querySelector('.vc-review-error').textContent = e.message; }
        });
    }
    function continuationDialog() {
        checkCurrent(); const owner = current.owner, chat = current.id;
        const notes = current.continuity || '';
        const d = makeDialog(l('จุดบันทึกและการเล่นต่อ', 'Checkpoints & continuation'), `<p>${l('บันทึกเฉพาะสถานะและเรื่องย่อที่ตรวจแล้ว ไม่คัดลอกประวัติแชตหรือคีย์ API', 'Save state and reviewed story notes, not the chat transcript or API keys.')}</p><label class="vc-field">${l('ชื่อจุดบันทึก', 'Checkpoint name')}<input id="vc-checkpoint-title" maxlength="120" value="${esc(current.title)}"></label><label class="vc-field">${l('เรื่องย่อ เหตุการณ์สำคัญ และสิ่งที่ต้องจำ', 'Story summary, key events and unresolved threads')}<textarea id="vc-continuity" rows="5" maxlength="6000">${esc(notes)}</textarea></label><button type="button" data-save-checkpoint>${icon('book')}${l('บันทึกจุดเล่นต่อ', 'Save checkpoint')}</button><hr><h3>${l('เล่นต่อในแชตใหม่', 'Continue in a new chat')}</h3><p>${l('นำเข้าได้ก่อนส่งข้อความผู้ใช้ครั้งแรกเท่านั้น แชตต้นทางไม่เปลี่ยนแปลง', 'Import only before the first user message. The source chat remains unchanged.')}</p><div class="vc-checkpoint-list">${archives().map(s => `<div><span>${esc(s.title)} · ${show(s.state.scene.place)} · Day ${show(s.state.scene.day)}</span><button type="button" data-preview-checkpoint="${esc(s.id)}">${l('ตรวจข้อมูล', 'Review')}</button><button type="button" data-export-checkpoint="${esc(s.id)}">${l('ส่งออก', 'Export')}</button><button type="button" data-remove-checkpoint="${esc(s.id)}">${l('ลบจุดบันทึก', 'Remove')}</button></div>`).join('') || l('ยังไม่มีจุดบันทึกของตัวละครนี้', 'No checkpoints for this character yet.')}</div><label class="vc-field">${l('นำเข้าไฟล์จุดบันทึก', 'Import checkpoint file')}<input id="vc-import-file" type="file" accept="application/json,.json"></label>`);
        on(d.querySelector('[data-save-checkpoint]'), 'click', () => {
            try {
                checkCurrent(chat); if (busy || saving) throw new Error('Wait for the response or save to finish.');
                const s = checkpoint(current, result, d.querySelector('#vc-checkpoint-title').value, d.querySelector('#vc-continuity').value, freshId(), new Date().toISOString());
                const settings = getContext().extensionSettings; settings[ARCHIVE_KEY] ||= {};
                const saved = settings[ARCHIVE_KEY][owner] ||= []; if (saved.length >= 20) throw new Error('Checkpoint limit (20) reached. Export and remove old checkpoints before saving more.');
                saved.push(s); getContext().saveSettingsDebounced(); continuationDialog();
            } catch (e) { d.querySelector('.vc-review-error').textContent = e.message; }
        });
        on(d, 'click', e => {
            const review = e.target.closest('[data-preview-checkpoint]'), exportButton = e.target.closest('[data-export-checkpoint]'), removeButton = e.target.closest('[data-remove-checkpoint]');
            if (removeButton) {
                try {
                    checkCurrent(chat); const id = removeButton.dataset.removeCheckpoint;
                    const saved = archives().find(s => s.id === id); if (!saved) return;
                    const confirm = makeDialog(l('ลบจุดบันทึก', 'Remove checkpoint'), `<p>${esc(saved.title)}</p><p>${l('ลบเฉพาะจุดบันทึกนี้ แชตที่เล่นอยู่ไม่เปลี่ยนแปลง', 'Remove only this checkpoint. Existing chats are unaffected.')}</p><button type="button" data-confirm-remove>${l('ยืนยันลบ', 'Confirm removal')}</button>`);
                    on(confirm.querySelector('[data-confirm-remove]'), 'click', () => {
                        try { checkCurrent(chat); const ctx = getContext(); ctx.extensionSettings[ARCHIVE_KEY][owner] = archives().filter(s => s.id !== id); ctx.saveSettingsDebounced(); continuationDialog(); }
                        catch (error) { confirm.querySelector('.vc-review-error').textContent = error.message; }
                    });
                } catch (error) { d.querySelector('.vc-review-error').textContent = error.message; }
            }
            if (review) reviewContinuation(archives().find(s => s.id === review.dataset.previewCheckpoint));
            if (exportButton) {
                const saved = archives().find(s => s.id === exportButton.dataset.exportCheckpoint); if (!saved) return;
                const url = win.URL.createObjectURL(new win.Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' }));
                const a = doc.createElement('a'); a.href = url; a.download = `vesperchain-${saved.id}.json`; a.click(); win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
            }
        });
        on(d.querySelector('#vc-import-file'), 'change', async e => {
            try {
                const file = e.target.files[0]; if (!file) return; if (file.size > 2000000) throw new Error('File exceeds 2 MB.');
                const parsed = JSON.parse(await file.text()); checkCurrent(chat); reviewContinuation(validateCheckpoint(parsed));
            } catch (error) { if (d.isConnected) d.querySelector('.vc-review-error').textContent = error.message; }
        });
    }
    function reviewContinuation(input) {
        try {
            const saved = validateCheckpoint(input); checkCurrent(); if (saved.owner !== current.owner) throw new Error('This checkpoint belongs to another character/group.');
            sourceForReview = saved; reviewChat = current.id;
            const d = makeDialog(l('ตรวจข้อมูลก่อนเล่นต่อ', 'Review continuation'), `<h3>${esc(saved.title)}</h3><p>${l('ต้นทาง', 'Source')} · ${esc(saved.sourceChat)}<br>${show(saved.state.scene.city)} / ${show(saved.state.scene.place)} · Day ${show(saved.state.scene.day)}<br>${show(saved.state.resources.silver)} silver · ${Object.keys(saved.state.contracts).length} contracts</p><label class="vc-field">${l('ตรวจและแก้เรื่องย่อก่อนนำเข้า', 'Review/edit continuity before importing')}<textarea id="vc-import-notes" rows="6" maxlength="6000">${esc(saved.continuity)}</textarea></label><p>${l('เริ่มต่อด้วยสำเนาสถานะที่แยกจากต้นฉบับ ระบบจะไม่สร้างคำตอบ AI จนกว่าคุณส่งข้อความเอง', 'Continue from an independent copy. No AI response is generated until you send a message.')}</p><button type="button" class="vc-primary" id="vc-confirm-import" ${canContinue() ? '' : 'disabled'}>${l('ยืนยันเล่นต่อในแชตนี้', 'Continue in this chat')}</button>${canContinue() ? '' : `<p>${l('กรุณาเปิดแชตใหม่ก่อน', 'Open a new chat first.')}</p>`}`);
            on(d.querySelector('#vc-confirm-import'), 'click', () => {
                try {
                    checkCurrent(reviewChat); if (!canContinue() || busy) throw new Error('This chat is no longer empty or is generating.');
                    const who = identity(getContext());
                    current = continueCampaign({ ...sourceForReview, continuity: d.querySelector('#vc-import-notes').value }, who.owner, who.chatId, freshId(), getContext().chat.length);
                    lastDigest = ''; sync(); d.close();
                } catch (e) { d.querySelector('.vc-review-error').textContent = e.message; }
            });
        } catch (e) { panelDialog?.querySelector('.vc-review-error')?.replaceChildren(doc.createTextNode(e.message)); }
    }
    function livePage(page) {
        if (!available()) return `<p>${l('เลือกตัวละครและเปิดแชตก่อน', 'Select a character and open a chat first.')}</p>`;
        if (!profile()?.enabled) return `<article class="vc-reference"><h3>${l('เริ่มติดตามตัวละครนี้', 'Enable this character')}</h3><p>${l('เรื่องราวดำเนินใน Main Chat ส่วน UI ติดตามสถานะและสัญญา แชตใหม่เริ่มข้อมูลใหม่เสมอ', 'Play in Main Chat; the UI tracks state and contracts. New chats start fresh.')}</p><button type="button" data-tracking-enable>${l('เปิดการติดตามสำหรับตัวละครนี้', 'Enable tracking for this character')}</button></article>`;
        if (!current) return `<p role="alert">${esc(saveError || 'Campaign is unavailable.')}</p>`;
        const s = result.state;
        const scope = `<p class="vc-scope-line">CHAT · ${esc(current.chatId)} · Revision ${s.revision}</p>${saveError ? `<p role="alert">${esc(saveError)}</p>` : ''}`;
        if (page === 'home' || page === 'scene' || page === 'travel' || page === 'time') return scope + `<div class="vc-live-scene"><h3>${[s.scene.city, s.scene.place, s.scene.room].filter(Boolean).map(esc).join(' / ') || l('ยังไม่ทราบสถานที่', 'Location unknown')}</h3><p>Day ${show(s.scene.day)} · ${show(s.scene.month)} ${show(s.scene.year)} · ${show(s.scene.period)} · ${show(s.scene.weather)}</p><p>${l('เดินทางและดำเนินเรื่องต่อได้ใน Main Chat ข้อมูลจะอัปเดตหลังคำตอบ AI จบ', 'Travel and continue the story in Main Chat. Tracking updates after each AI response.')}</p></div>${page === 'home' ? `<button type="button" data-continuation>${icon('book')}${l('จุดบันทึก / เล่นต่อในแชตใหม่', 'Checkpoints / continue in a new chat')}</button>` : ''}`;
        if (page === 'npc') return scope + npcs.list();
        if (page === 'contracts') return scope + (Object.values(s.contracts).map(c => contractMarkup(c)).join('') || `<p>${l('ยังไม่มีสัญญา เมื่อมีข้อเสนอในเนื้อเรื่อง ใบสัญญาจะปรากฏใต้ข้อความนั้น', 'No contracts yet. Story offers will appear as documents in the chat.')}</p>`);
        if (page === 'character' || page === 'ledger') return scope + `<dl class="vc-live-values">${Object.entries(s.resources).filter(([key]) => page === 'character' ? key !== 'silver' : key === 'silver').map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${show(value)}</dd></div>`).join('')}</dl>${page === 'ledger' ? s.transactions.slice(-30).map(t => `<p>${esc(t.reason)} · ${t.silverDelta > 0 ? '+' : ''}${t.silverDelta} silver</p>`).join('') : ''}`;
        if (page === 'recovery') return scope + `<div class="vc-scope-guide"><p>GLOBAL · ${l('หน้าตาและตัวเปิด UI', 'Appearance & launchers')}</p><p>CHARACTER · ${l('เปิดใช้การติดตามและจุดบันทึก', 'Tracking opt-in & checkpoints')}</p><p>CHAT · ${l('สถานะ เงิน สินค้า บุคคล สัญญา และเรื่องย่อ', 'State, resources, inventory, people, contracts & continuity')}</p><p>MESSAGE · ${l('ฉากที่ยืนยันในแต่ละข้อความ AI', 'Historical scene snapshots per AI message')}</p></div><button type="button" data-continuation>${l('จุดบันทึกและเล่นต่อ', 'Checkpoints & continuation')}</button><button type="button" data-tracking-retry>${l('ตรวจและบันทึกใหม่', 'Reconcile & retry save')}</button><p role="status">${esc(saveError || l('สถานะติดตามพร้อมใช้งาน', 'Tracking available'))}</p>${result.errors.map(e => `<p role="alert">${esc(e.reason)}</p>`).join('')}`;
        const kind = ({ stock: 'inventory', shop: 'shops', research: 'projects', npc: 'npcs', branches: 'branches', codex: 'notes', auction: 'notes' })[page];
        if (!kind) return null;
        const groups = page === 'stock' ? ['inventory', 'creatures'] : page === 'npc' ? ['npcs', 'factions'] : [kind];
        return scope + groups.map(group => `<h3>${esc(group)}</h3>${Object.values(s.entities[group]).map(e => `<article class="vc-reference"><h3>${esc(e.name)}</h3><p>${esc(e.status || '')} · ${esc(e.location || '')}${e.quantity === undefined ? '' : ` · ${e.quantity}`}</p><p>${esc(e.details || '')}</p></article>`).join('') || `<p>${l('ยังไม่มีข้อมูลยืนยันจากเรื่องราว', 'No confirmed story records yet.')}</p>`}`).join('');
    }
    on(doc, 'click', e => {
        const root = e.target.closest('.vc-root'); if (!root) return;
        try {
            if (e.target.closest('[data-tracking-enable]')) setCharacterEnabled(true);
            if (e.target.closest('[data-continuation]')) continuationDialog();
            if (e.target.closest('[data-tracking-retry]')) { lastDigest = ''; sync(); }
            const review = e.target.closest('[data-contract-review]'); if (review) reviewDecision(review.dataset.contractReview, review.dataset.contract);
        } catch (error) { saveError = error.message; notify(); }
    });
    const ctx = getContext(), types = ctx.eventTypes || ctx.event_types || {};
    const listen = (name, fn) => { if (types[name] && ctx.eventSource?.on) { ctx.eventSource.on(types[name], fn); subscriptions.push([types[name], fn]); } };
    listen('CHAT_CHANGED', loadChat);
    for (const type of ['MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MESSAGE_DELETED', 'MESSAGE_SWIPED', 'CHARACTER_MESSAGE_RENDERED']) listen(type, () => { if (!busy) sync(); else renderChat(); });
    listen('GENERATION_STARTED', (type, _options, dryRun) => {
        if (dryRun || !enabled()) return;
        generationType = type; pausedMessages = copy(getContext().chat); busy = true; prompt();
    });
    const ended = () => { busy = false; generationType = ''; pausedMessages = null; sync(); };
    listen('GENERATION_ENDED', ended); listen('GENERATION_STOPPED', ended);
    observer = new win.MutationObserver(records => {
        // Only observe host mutations, never our own tracking subtree or attributes.
        if (records.every(r => r.target.nodeType === 1 && r.target.closest?.('.vc-root'))) return;
        if (scheduled) return; scheduled = true;
        win.queueMicrotask(() => { scheduled = false; if (enabled()) renderChat(); });
    });
    const chat = doc.getElementById('chat'); if (chat) observer.observe(chat, { childList: true, subtree: true });
    npcs = createNpcs(getContext, getConfig, () => ({ current, result, busy, enabled: enabled() }), () => { lastDigest = ''; sync(); }, makeDialog, doc);
    loadChat();
    return { refresh() { if (!current && profile()?.enabled) loadChat(); else sync(); }, livePage, getResult: () => copy(result), getCampaign: () => current && copy(current),
        isCharacterEnabled: () => Boolean(profile()?.enabled), setCharacterEnabled, subscribe(fn) { callbacks.add(fn); return () => callbacks.delete(fn); },
        destroy() { destroyed = true; abort.abort(); observer.disconnect(); subscriptions.forEach(([t, fn]) => ctx.eventSource?.removeListener?.(t, fn));
            cleanChat(); npcs?.destroy(); panelDialog?.remove(); ctx.setExtensionPrompt?.(PROMPT_KEY, '', 1, 0, false, 0); callbacks.clear(); },
    };
}
