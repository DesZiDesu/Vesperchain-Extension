import { validateNpc, speakerSegments } from './npc-model.js';
// Pure, deterministic replay. Only confirmed records and explicit user decisions affect state.
export const CAMPAIGN_KEY = 'vesperchainCampaign';
export const ARCHIVE_KEY = 'vesperchainArchives';
export const STATE_VERSION = 1;
export const ENTITY_TYPES = ['inventory', 'creatures', 'shops', 'projects', 'npcs', 'factions', 'branches', 'routes', 'notes'];
export const SCENE_FIELDS = ['region', 'city', 'place', 'room', 'day', 'month', 'year', 'period', 'weather'];
const RESOURCE_FIELDS = ['silver', 'hp', 'maxHp', 'stamina', 'maxStamina', 'mana', 'maxMana', 'level', 'xp'];
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
export const copy = data => JSON.parse(JSON.stringify(data));
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const requireThat = (condition, reason) => { if (!condition) throw new Error(reason); };
const obj = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 1500) => typeof value === 'string' && value.length <= max;
const idValid = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !forbidden.has(value);
const number = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000;
function safeTree(value, depth = 0) {
    requireThat(depth <= 8, 'Record is too deeply nested.');
    if (typeof value === 'string') requireThat(value.length <= 6000, 'Text is too long.');
    if (typeof value === 'number') requireThat(Number.isFinite(value), 'Invalid number.');
    if (value && typeof value === 'object') {
        requireThat(Object.keys(value).length <= 20000, 'Too many fields.');
        for (const [key, item] of Object.entries(value)) { requireThat(!forbidden.has(key), 'Unsafe field name.'); safeTree(item, depth + 1); }
    }
}
function keysOnly(value, keys) { requireThat(obj(value), 'Expected an object.'); requireThat(Object.keys(value).every(k => keys.includes(k)), 'Unknown field in record.'); }
export function digest(value) {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    let a = 2166136261, b = 5381;
    for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ s.charCodeAt(i); }
    return (a >>> 0).toString(16) + (b >>> 0).toString(16);
}
export function messageKey(message, index) {
    return `m-${digest([message.send_date ?? index, message.name ?? '', message.swipe_id ?? 0, message.mes ?? ''])}`;
}
export function blankState() {
    return { revision: 0, scene: Object.fromEntries(SCENE_FIELDS.map(k => [k, null])),
        resources: Object.fromEntries(RESOURCE_FIELDS.map(k => [k, null])),
        entities: Object.fromEntries(ENTITY_TYPES.map(k => [k, {}])), contracts: {}, transactions: [], seen: {} };
}
export function freshCampaign(owner, chatId, id) {
    return { version: STATE_VERSION, id, owner, chatId, baseline: blankState(), startAfter: 0, actions: [], continuity: '', title: 'Vesperchain' };
}
export function parseRecord(raw) {
    const source = String(raw ?? '');
    const blocks = [...source.matchAll(/```vesperchain\s*\n([\s\S]*?)```/g)];
    if (!blocks.length) return { record: null, error: /```vesperchain\b/.test(source) ? 'Incomplete tracking record.' : null };
    if (blocks.length !== 1) return { record: null, error: 'Only one tracking record is allowed per response.' };
    try {
        requireThat(blocks[0][1].length <= 64000, 'Tracking record exceeds 64 KB.');
        const record = JSON.parse(blocks[0][1]); safeTree(record);
        keysOnly(record, ['version', 'eventId', 'baseRevision', 'scene', 'resources', 'entities', 'offers', 'contractUpdates', 'transactions', 'npcProfiles']);
        requireThat(record.version === 1 && idValid(record.eventId) && number(record.baseRevision), 'Missing version, unique eventId, or baseRevision.');
        return { record, error: null };
    } catch (e) { return { record: null, error: e.message }; }
}
function list(value, limit = 100) { requireThat(Array.isArray(value) && value.length <= limit, 'Invalid or oversized list.'); return value; }
function validateOffer(offer) {
    keysOnly(offer, ['id', 'title', 'issuer', 'objective', 'terms', 'deadlineDay', 'reward', 'deliver']);
    requireThat(idValid(offer.id), 'Contract needs a stable ID.');
    for (const k of ['title', 'issuer', 'objective', 'terms']) requireThat(text(offer[k]) && offer[k].trim(), `Contract needs ${k}.`);
    requireThat(offer.deadlineDay === null || number(offer.deadlineDay), 'Contract needs deadlineDay or null.');
    keysOnly(offer.reward, ['silver', 'xp']); requireThat(number(offer.reward.silver) && number(offer.reward.xp), 'Invalid reward.');
    const ids = new Set();
    for (const item of list(offer.deliver, 30)) {
        keysOnly(item, ['itemId', 'quantity']); requireThat(idValid(item.itemId) && number(item.quantity) && item.quantity > 0 && !ids.has(item.itemId), 'Invalid or duplicated delivery item.'); ids.add(item.itemId);
    }
}
function resources(next, patch) {
    keysOnly(patch, RESOURCE_FIELDS);
    for (const [key, value] of Object.entries(patch)) {
        requireThat(value === null || number(value), `Invalid ${key}.`);
        requireThat(key !== 'level' || value === null || value > 0, 'Level must be positive.'); next.resources[key] = value;
    }
    for (const [current, max] of [['hp', 'maxHp'], ['mana', 'maxMana'], ['stamina', 'maxStamina']]) {
        if (next.resources[current] !== null && next.resources[max] !== null) requireThat(next.resources[current] <= next.resources[max], `${current} exceeds maximum.`);
    }
}
function entityUpdates(next, groups) {
    keysOnly(groups, ENTITY_TYPES);
    for (const [kind, rows] of Object.entries(groups)) for (const row of list(rows)) {
        keysOnly(row, ['id', 'name', 'status', 'location', 'details', 'quantity', 'remove', 'profile']);
        requireThat(idValid(row.id), 'Entity needs a stable ID.');
        if (row.profile !== undefined) { requireThat(kind === 'npcs', 'Only NPCs have identity profiles.'); const profile = validateNpc(row.profile); requireThat(profile.id === row.id && profile.name === row.name, 'NPC identity mismatch.'); }
        if (row.remove === true) { delete next.entities[kind][row.id]; continue; }
        requireThat(text(row.name, 200) && row.name.trim(), 'Entity needs a name.');
        for (const field of ['status', 'location', 'details']) if (row[field] !== undefined) requireThat(text(row[field]), `Invalid entity ${field}.`);
        if (kind === 'inventory') requireThat(number(row.quantity), 'Inventory needs a nonnegative quantity.');
        else if (row.quantity !== undefined) requireThat(number(row.quantity), 'Invalid quantity.');
        requireThat(Object.keys(next.entities[kind]).length < 500 || next.entities[kind][row.id], 'Entity capacity reached.');
        next.entities[kind][row.id] = { ...next.entities[kind][row.id], ...copy(row) };
    }
}
function transaction(next, tx) {
    keysOnly(tx, ['id', 'reason', 'silverDelta', 'items']);
    requireThat(idValid(tx.id) && text(tx.reason) && tx.reason.trim(), 'Transaction needs ID and reason.');
    requireThat(Number.isSafeInteger(tx.silverDelta) && Math.abs(tx.silverDelta) <= 1000000000, 'Invalid transaction value.');
    const old = next.transactions.find(t => t.id === tx.id);
    if (old) { requireThat(JSON.stringify(old) === JSON.stringify(tx), 'Conflicting transaction ID.'); return; }
    requireThat(!tx.id.startsWith('contract-'), 'Contract payouts are controlled by signed delivery actions.');
    const seen = new Set();
    for (const item of list(tx.items, 50)) {
        keysOnly(item, ['itemId', 'delta']);
        requireThat(idValid(item.itemId) && !seen.has(item.itemId) && Number.isSafeInteger(item.delta), 'Invalid item delta.'); seen.add(item.itemId);
        const owned = next.entities.inventory[item.itemId]; requireThat(owned && number(owned.quantity + item.delta), 'Missing inventory item or insufficient quantity.'); owned.quantity += item.delta;
    }
    if (tx.silverDelta !== 0) { requireThat(next.resources.silver !== null && number(next.resources.silver + tx.silverDelta), 'Unknown or insufficient funds.'); next.resources.silver += tx.silverDelta; }
    next.transactions.push(copy(tx));
}
export function applyRecord(state, record, anchor) {
    const hash = digest(record);
    if (state.seen[record.eventId]) {
        requireThat(state.seen[record.eventId] === hash, 'Event ID was reused with different contents.'); return copy(state);
    }
    requireThat(record.baseRevision === state.revision, `Stale revision ${record.baseRevision}; expected ${state.revision}.`);
    const next = copy(state);
    if (record.scene) {
        keysOnly(record.scene, SCENE_FIELDS);
        for (const [key, value] of Object.entries(record.scene)) {
            requireThat(value === null || (['day', 'year'].includes(key) ? number(value) && value > 0 : text(value, 300)), `Invalid scene ${key}.`); next.scene[key] = value;
        }
    }
    if (record.resources) resources(next, record.resources);
    if (record.entities) {
        requireThat(!record.entities.npcs?.some(row => row.profile), 'Supply complete NPC profiles through npcProfiles.');
        entityUpdates(next, record.entities);
    }
    for (const input of list(record.npcProfiles || [], 30)) {
        const profile = validateNpc(input);
        entityUpdates(next, { npcs: [{ id: profile.id, name: profile.name, status: profile.status || '', location: profile.location || '', details: profile.background || '', profile }] });
    }
    for (const offer of list(record.offers || [], 20)) {
        validateOffer(offer); const current = next.contracts[offer.id];
        if (current) requireThat(JSON.stringify(current.offer) === JSON.stringify(offer), 'Contract terms are immutable; issue a new contract ID.');
        else next.contracts[offer.id] = { offer: copy(offer), anchor, status: 'offered', signature: null, evidence: null };
    }
    for (const update of list(record.contractUpdates || [], 20)) {
        keysOnly(update, ['id', 'ready', 'evidence']);
        const contract = next.contracts[update.id];
        requireThat(contract && contract.status === 'signed' && update.ready === true && text(update.evidence) && update.evidence.trim(), 'Only a signed contract with completion evidence can become ready.');
        contract.status = 'ready'; contract.evidence = update.evidence;
    }
    if (record.transactions?.length) {
        requireThat(record.resources?.silver === undefined, 'Do not mix a silver balance and money transactions in one update.');
        requireThat(!record.entities?.inventory, 'Do not mix inventory snapshots and item transactions in one update.');
        for (const tx of list(record.transactions, 50)) transaction(next, tx);
    }
    next.revision++; next.seen[record.eventId] = hash; return next;
}
export function applyAction(state, action) {
    const next = copy(state), contract = next.contracts[action.contractId];
    requireThat(contract && digest(contract.offer) === action.offerHash && contract.anchor === action.offerAnchor, 'The original contract changed or was removed; this decision needs review.');
    if (action.kind === 'sign' || action.kind === 'decline') {
        requireThat(contract.status === 'offered', 'This contract has already been decided.');
        if (contract.offer.deadlineDay !== null && state.scene.day !== null) requireThat(state.scene.day <= contract.offer.deadlineDay, 'The deadline has passed.');
        if (action.kind === 'sign') requireThat(text(action.signature, 120) && action.signature.trim(), 'Enter a signature.');
        contract.status = action.kind === 'sign' ? 'signed' : 'declined'; contract.signature = action.kind === 'sign' ? action.signature.trim() : null;
    } else if (action.kind === 'settle') {
        requireThat(contract.status === 'ready', 'Delivery has not been confirmed in the story.');
        for (const item of contract.offer.deliver) {
            const owned = next.entities.inventory[item.itemId]; requireThat(owned && owned.quantity >= item.quantity, 'Insufficient delivery items.'); owned.quantity -= item.quantity;
        }
        const { silver, xp } = contract.offer.reward;
        if (silver) { requireThat(next.resources.silver !== null && number(next.resources.silver + silver), 'Current balance is unknown.'); next.resources.silver += silver; }
        if (xp) {
            requireThat(next.resources.xp !== null && next.resources.level !== null && number(next.resources.xp + xp), 'XP or level is unknown.');
            next.resources.xp += xp;
            while (next.resources.xp >= 100 * next.resources.level) {
                next.resources.xp -= 100 * next.resources.level; next.resources.level++;
                for (const [key, delta] of [['maxHp', 5], ['maxStamina', 5], ['maxMana', 2]]) if (next.resources[key] !== null) next.resources[key] += delta;
            }
        }
        contract.status = 'completed';
        next.transactions.push({ id: `contract-${action.id}`, reason: contract.offer.title, silverDelta: silver, items: contract.offer.deliver.map(i => ({ itemId: i.itemId, delta: -i.quantity })) });
    } else throw new Error('Unknown decision.');
    next.revision++; return next;
}
export function replay(campaign, messages) {
    let state = copy(campaign.baseline); const frames = {}, errors = [], used = new Set();
    for (let index = campaign.startAfter; index < messages.length; index++) {
        const message = messages[index]; if (!message || message.is_user || message.is_system) continue;
        const anchor = messageKey(message, index), { record, error } = parseRecord(message.mes);
        let status = 'carried', reason = error;
        if (record) { try { state = applyRecord(state, record, anchor); status = 'confirmed'; } catch (e) { reason = e.message; } }
        if (reason) { status = 'rejected'; errors.push({ index, anchor, reason }); }
        for (const action of campaign.actions.filter(a => a.after === anchor)) {
            used.add(action.id);
            try { state = applyAction(state, action); } catch (e) { errors.push({ anchor, index, actionId: action.id, reason: e.message }); }
        }
        const speakerIds = new Set((speakerSegments(message.mes) || []).map(c => c.speaker).filter(Boolean));
        const npcs = Object.fromEntries([...speakerIds].filter(id => state.entities.npcs[id]).map(id => [id, copy(state.entities.npcs[id])]));
        frames[index] = { npcs, anchor, scene: copy(state.scene), revision: state.revision, status, reason };
    }
    for (const action of campaign.actions) if (!used.has(action.id)) errors.push({ actionId: action.id, reason: 'Decision source was edited, swiped, or deleted. Decision suspended; restore the source or review it.' });
    return { state, frames, errors };
}
export function makeDecision(campaign, messages, kind, contractId, signature, id) {
    const result = replay(campaign, messages), contract = result.state.contracts[contractId];
    requireThat(contract, 'Contract is no longer available.');
    const last = Object.values(result.frames).at(-1); requireThat(last, 'No confirmed conversation anchor.');
    const action = { id, kind, contractId, signature: signature || '', offerHash: digest(contract.offer), offerAnchor: contract.anchor, after: last.anchor };
    applyAction(result.state, action); return action;
}
export function checkpoint(campaign, result, title, continuity, id, createdAt) {
    requireThat(result.errors.length === 0, 'Resolve tracking errors before saving a continuation.');
    requireThat(text(title, 120) && title.trim() && text(continuity, 6000), 'Invalid checkpoint name or notes.');
    return { format: 'vesperchain-checkpoint', version: 1, id, owner: campaign.owner, title: title.trim(), continuity,
        sourceChat: campaign.chatId, createdAt, state: copy(result.state) };
}
export function validateCheckpoint(input) {
    requireThat(JSON.stringify(input).length <= 2000000, 'Checkpoint exceeds 2 MB.'); safeTree(input);
    keysOnly(input, ['format', 'version', 'id', 'owner', 'title', 'continuity', 'sourceChat', 'createdAt', 'state']);
    requireThat(input.format === 'vesperchain-checkpoint' && input.version === 1 && idValid(input.id) && text(input.owner, 400) && text(input.title, 120) && text(input.continuity, 6000) && text(input.sourceChat, 500) && text(input.createdAt, 100), 'Unsupported checkpoint.');
    const state = input.state; keysOnly(state, ['revision', 'scene', 'resources', 'entities', 'contracts', 'transactions', 'seen']);
    requireThat(number(state.revision), 'Invalid saved revision.');
    const probe = blankState(); resources(probe, state.resources);
    keysOnly(state.scene, SCENE_FIELDS);
    for (const key of SCENE_FIELDS) requireThat(state.scene[key] === null || (['day', 'year'].includes(key) ? number(state.scene[key]) && state.scene[key] > 0 : text(state.scene[key], 300)), 'Invalid saved scene.');
    keysOnly(state.entities, ENTITY_TYPES);
    for (const kind of ENTITY_TYPES) {
        requireThat(obj(state.entities[kind]), 'Missing entity scope.');
        for (const [key, row] of Object.entries(state.entities[kind])) { requireThat(key === row.id, 'Saved entity ID mismatch.'); entityUpdates(probe, { [kind]: [row] }); }
    }
    requireThat(obj(state.contracts) && obj(state.seen), 'Invalid saved records.');
    for (const [id, c] of Object.entries(state.contracts)) {
        validateOffer(c.offer); requireThat(id === c.offer.id && ['offered', 'signed', 'declined', 'ready', 'completed'].includes(c.status) && text(c.anchor, 200), 'Invalid saved contract.');
        requireThat(c.signature === null || text(c.signature, 120), 'Invalid signature.');
        if (['signed', 'ready', 'completed'].includes(c.status)) requireThat(text(c.signature, 120) && c.signature.trim(), 'Signed contract needs a signature.');
        requireThat(c.evidence === null || text(c.evidence), 'Invalid evidence.');
    }
    for (const [id, hash] of Object.entries(state.seen)) requireThat(idValid(id) && text(hash, 100), 'Invalid event history.');
    for (const tx of list(state.transactions, 10000)) {
        requireThat(idValid(tx.id) && text(tx.reason) && Number.isSafeInteger(tx.silverDelta), 'Invalid saved transaction.');
        for (const item of list(tx.items, 50)) requireThat(idValid(item.itemId) && Number.isSafeInteger(item.delta), 'Invalid saved transaction item.');
    }
    requireThat(RESOURCE_FIELDS.every(k => k in state.resources), 'Incomplete resources.');
    return copy(input);
}
export function continueCampaign(saved, owner, chatId, id, startAfter) {
    const valid = validateCheckpoint(saved); requireThat(valid.owner === owner, 'Checkpoint belongs to another character/group.');
    return { ...freshCampaign(owner, chatId, id), baseline: copy(valid.state), continuity: valid.continuity, title: valid.title, startAfter, continuedFrom: valid.id };
}
