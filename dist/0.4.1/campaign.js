import { validateNpc, speakerSegments } from './npc-model.js';
// Pure, deterministic replay. Only confirmed records and explicit user decisions affect state.
export const CAMPAIGN_KEY = 'vesperchainCampaign';
export const ARCHIVE_KEY = 'vesperchainArchives';
export const STATE_VERSION = 1;
export const ENTITY_TYPES = ['inventory', 'creatures', 'shops', 'projects', 'npcs', 'factions', 'branches', 'routes', 'notes'];
export const SCENE_FIELDS = ['region', 'city', 'place', 'room', 'day', 'month', 'year', 'period', 'weather'];
export const RECORD_FIELDS = ['version', 'eventId', 'baseRevision', 'scene', 'resources', 'entities', 'offers', 'contractUpdates', 'transactions', 'npcProfiles', 'speciesProfiles', 'breedingRecords', 'purchaseOffers', 'purchaseUpdates'];
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
function keysOnly(value, keys, path = 'record') {
    requireThat(obj(value), `Expected an object at ${path}.`);
    const unknown = Object.keys(value).filter(key => !keys.includes(key));
    requireThat(!unknown.length, `Unknown field at ${unknown.slice(0, 3).map(key => `${path}.${key.slice(0, 120)}`).join(', ')}. Allowed fields: ${keys.join(', ')}.`);
}
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
        entities: Object.fromEntries(ENTITY_TYPES.map(k => [k, {}])), contracts: {}, species: {}, breeding: {}, purchases: {}, transactions: [], seen: {} };
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
        keysOnly(record, RECORD_FIELDS);
        requireThat(record.version === 1 && idValid(record.eventId) && number(record.baseRevision), 'Missing version, unique eventId, or baseRevision.');
        return { record, error: null };
    } catch (e) { return { record: null, error: e.message }; }
}
function list(value, limit = 100) { requireThat(Array.isArray(value) && value.length <= limit, 'Invalid or oversized list.'); return value; }
function validateOffer(offer) {
    keysOnly(offer, ['id', 'title', 'issuer', 'objective', 'terms', 'deadlineDay', 'reward', 'deliver'], 'record.offers');
    requireThat(idValid(offer.id), 'Contract needs a stable ID.');
    for (const k of ['title', 'issuer', 'objective', 'terms']) requireThat(text(offer[k]) && offer[k].trim(), `Contract needs ${k}.`);
    requireThat(offer.deadlineDay === null || number(offer.deadlineDay), 'Contract needs deadlineDay or null.');
    keysOnly(offer.reward, ['silver', 'xp'], 'record.offers.reward'); requireThat(number(offer.reward.silver) && number(offer.reward.xp), 'Invalid reward.');
    const ids = new Set();
    for (const item of list(offer.deliver, 30)) {
        keysOnly(item, ['itemId', 'quantity'], 'record.offers.deliver'); requireThat(idValid(item.itemId) && number(item.quantity) && item.quantity > 0 && !ids.has(item.itemId), 'Invalid or duplicated delivery item.'); ids.add(item.itemId);
    }
}
function resources(next, patch) {
    keysOnly(patch, RESOURCE_FIELDS, 'record.resources');
    for (const [key, value] of Object.entries(patch)) {
        requireThat(value === null || number(value), `Invalid ${key}.`);
        requireThat(key !== 'level' || value === null || value > 0, 'Level must be positive.'); next.resources[key] = value;
    }
    for (const [current, max] of [['hp', 'maxHp'], ['mana', 'maxMana'], ['stamina', 'maxStamina']]) {
        if (next.resources[current] !== null && next.resources[max] !== null) requireThat(next.resources[current] <= next.resources[max], `${current} exceeds maximum.`);
    }
}
function entityUpdates(next, groups) {
    keysOnly(groups, ENTITY_TYPES, 'record.entities');
    for (const [kind, rows] of Object.entries(groups)) for (const row of list(rows)) {
        keysOnly(row, ['id', 'name', 'status', 'location', 'details', 'quantity', 'remove', 'profile', 'owned', 'species'], `record.entities.${kind}[${String(row?.id || '?').slice(0, 80)}]`);
        requireThat(idValid(row.id), 'Entity needs a stable ID.');
        if (row.profile !== undefined) { requireThat(kind === 'npcs', 'Only NPCs have identity profiles.'); const profile = validateNpc(row.profile); requireThat(profile.id === row.id && profile.name === row.name, 'NPC identity mismatch.'); }
        if (row.owned !== undefined) requireThat(['creatures', 'npcs'].includes(kind) && typeof row.owned === 'boolean', 'Ownership is only valid for creatures and NPCs.');
        if (row.species !== undefined) requireThat(kind === 'creatures' && text(row.species, 120) && row.species.trim(), 'Creature species needs a name.');
        if (row.remove === true) { delete next.entities[kind][row.id]; continue; }
        requireThat(text(row.name, 200) && row.name.trim(), 'Entity needs a name.');
        for (const field of ['status', 'location', 'details']) if (row[field] !== undefined) requireThat(text(row[field]), `Invalid entity ${field}.`);
        if (kind === 'inventory') requireThat(number(row.quantity), 'Inventory needs a nonnegative quantity.');
        else if (row.quantity !== undefined) requireThat(number(row.quantity), 'Invalid quantity.');
        requireThat(Object.keys(next.entities[kind]).length < 500 || next.entities[kind][row.id], 'Entity capacity reached.');
        next.entities[kind][row.id] = { ...next.entities[kind][row.id], ...copy(row) };
        indexSpecies(next, row.species || row.profile?.species);
    }
}
function transaction(next, tx) {
    keysOnly(tx, ['id', 'reason', 'silverDelta', 'items'], 'record.transactions');
    requireThat(idValid(tx.id) && text(tx.reason) && tx.reason.trim(), 'Transaction needs ID and reason.');
    requireThat(Number.isSafeInteger(tx.silverDelta) && Math.abs(tx.silverDelta) <= 1000000000, 'Invalid transaction value.');
    const old = next.transactions.find(t => t.id === tx.id);
    if (old) { requireThat(JSON.stringify(old) === JSON.stringify(tx), 'Conflicting transaction ID.'); return; }
    requireThat(!tx.id.startsWith('contract-') && !tx.id.startsWith('sale-'), 'Contract and sale payouts are controlled by user confirmation.');
    const seen = new Set();
    for (const item of list(tx.items, 50)) {
        keysOnly(item, ['itemId', 'delta'], 'record.transactions.items');
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
    const next = normalizeState(state);
    if (record.scene) {
        keysOnly(record.scene, SCENE_FIELDS, 'record.scene');
        for (const [key, value] of Object.entries(record.scene)) {
            requireThat(value === null || (['day', 'year'].includes(key) ? number(value) && value > 0 : text(value, 300)), `Invalid scene ${key}.`); next.scene[key] = value;
        }
    }
    if (record.resources) resources(next, record.resources);
    for (const input of list(record.speciesProfiles || [], 30)) saveSpecies(next, input);
    if (record.entities) {
        requireThat(!record.entities.npcs?.some(row => row.profile), 'Supply complete NPC profiles through npcProfiles.');
        entityUpdates(next, record.entities);
    }
    for (const input of list(record.npcProfiles || [], 30)) {
        const profile = validateNpc(input);
        entityUpdates(next, { npcs: [{ id: profile.id, name: profile.name, status: profile.status || '', location: profile.location || '', details: profile.background || '', profile }] });
    }
    for (const input of list(record.breedingRecords || [], 30)) saveBreeding(next, input, anchor);
    for (const input of list(record.purchaseOffers || [], 20)) purchaseOffer(next, input, anchor);
    for (const input of list(record.purchaseUpdates || [], 20)) purchaseUpdate(next, input);
    for (const offer of list(record.offers || [], 20)) {
        validateOffer(offer); const current = next.contracts[offer.id];
        if (current) requireThat(JSON.stringify(current.offer) === JSON.stringify(offer), 'Contract terms are immutable; issue a new contract ID.');
        else next.contracts[offer.id] = { offer: copy(offer), anchor, status: 'offered', signature: null, evidence: null };
    }
    for (const update of list(record.contractUpdates || [], 20)) {
        keysOnly(update, ['id', 'ready', 'evidence'], 'record.contractUpdates');
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
    const next = normalizeState(state);
    if (['npc-upsert', 'species-upsert', 'breeding-add', 'ownership', 'purchase-counter', 'purchase-sell', 'purchase-decline'].includes(action.kind)) { extensionAction(next, action); next.revision++; return next; }
    const contract = next.contracts[action.contractId];
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
    let state = normalizeState(campaign.baseline); const frames = {}, errors = [], used = new Set();
    for (const action of campaign.actions.filter(a => a.after === 'baseline')) {
        used.add(action.id); try { state = applyAction(state, action); } catch (e) { errors.push({ actionId: action.id, reason: e.message }); }
    }
    for (let index = campaign.startAfter; index < messages.length; index++) {
        const message = messages[index]; if (!message || message.is_user || message.is_system) continue;
        const anchor = messageKey(message, index), { record, error } = parseRecord(message.mes);
        const moneyStart = state.transactions.length, balanceBefore = state.resources.silver;
        let status = 'carried', reason = error;
        if (record) { try { state = applyRecord(state, record, anchor); status = 'confirmed'; } catch (e) { reason = e.message; } }
        if (reason) { status = 'rejected'; errors.push({ index, anchor, reason }); }
        for (const action of campaign.actions.filter(a => a.after === anchor)) {
            used.add(action.id);
            try { state = applyAction(state, action); } catch (e) { errors.push({ anchor, index, actionId: action.id, reason: e.message }); }
        }
        const speakerIds = new Set((speakerSegments(message.mes) || []).map(c => c.speaker).filter(Boolean));
        const npcs = Object.fromEntries([...speakerIds].filter(id => state.entities.npcs[id]).map(id => [id, copy(state.entities.npcs[id])]));
        const money = state.transactions.slice(moneyStart).filter(tx => tx.silverDelta !== 0).map(tx => ({ ...copy(tx), source: 'transaction' }));
        const delta = state.resources.silver !== null && balanceBefore !== null ? state.resources.silver - balanceBefore - money.reduce((total, tx) => total + tx.silverDelta, 0) : 0;
        if (delta) money.unshift({ id: `balance-${anchor}`, reason: 'Balance adjustment', silverDelta: delta, items: [], source: 'balance' });
        frames[index] = { npcs, money, anchor, scene: copy(state.scene), revision: state.revision, status, reason };
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
    const state = input.state; keysOnly(state, ['revision', 'scene', 'resources', 'entities', 'contracts', 'transactions', 'seen', 'species', 'breeding', 'purchases']);
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
    validateWorldState(state);
    return { ...copy(input), state: normalizeState(state) };
}
export function continueCampaign(saved, owner, chatId, id, startAfter) {
    const valid = validateCheckpoint(saved); requireThat(valid.owner === owner, 'Checkpoint belongs to another character/group.');
    return { ...freshCampaign(owner, chatId, id), baseline: copy(valid.state), continuity: valid.continuity, title: valid.title, startAfter, continuedFrom: valid.id };
}


// Optional domains are added lazily so v1 campaigns/checkpoints remain readable.
export function normalizeState(input) {
    const next = copy(input); next.species ||= {}; next.breeding ||= {}; next.purchases ||= {};
    for (const rows of [next.entities.npcs, next.entities.creatures]) for (const row of Object.values(rows)) indexSpecies(next, row.profile?.species || row.species);
    return next;
}
export const speciesId = name => `sp-${digest(String(name).trim().normalize('NFKC').toLocaleLowerCase())}`;
export function indexSpecies(next, name) {
    if (!name || !text(name, 120) || !name.trim()) return null;
    const existing = Object.values(next.species).find(s => s.name.normalize('NFKC').toLocaleLowerCase() === name.trim().normalize('NFKC').toLocaleLowerCase());
    const id = existing?.id || speciesId(name);
    if (!next.species[id]) { requireThat(Object.keys(next.species).length < 500, 'Species capacity reached.'); next.species[id] = { id, name: name.trim(), description: '', traits: '', habitat: '', notes: '' }; }
    return id;
}
export function validateSpecies(input) {
    keysOnly(input, ['id', 'name', 'description', 'traits', 'habitat', 'notes'], 'record.speciesProfiles');
    requireThat(idValid(input.id) && text(input.name, 120) && input.name.trim(), 'Species needs ID and name.');
    for (const key of ['description', 'traits', 'habitat', 'notes']) requireThat(text(input[key]), `Species needs ${key} (use an empty string if unknown).`);
    return { ...copy(input), name: input.name.trim() };
}
function saveSpecies(next, input) {
    const species = validateSpecies(input);
    const duplicate = Object.values(next.species).find(s => s.id !== species.id && s.name.normalize('NFKC').toLocaleLowerCase() === species.name.trim().normalize('NFKC').toLocaleLowerCase());
    requireThat(!duplicate, `Species already indexed as ${duplicate?.id}. Use its existing ID.`);
    requireThat(Object.keys(next.species).length < 500 || next.species[species.id], 'Species capacity reached.');
    next.species[species.id] = species;
}
export function validateBreeding(input) {
    keysOnly(input, ['id', 'parentA', 'parentB', 'result', 'status', 'notes'], 'record.breedingRecords');
    requireThat(idValid(input.id) && idValid(input.parentA) && idValid(input.parentB) && (input.result === null || idValid(input.result)), 'Lineage needs species IDs.');
    requireThat(['observed', 'theory'].includes(input.status) && text(input.notes), 'Lineage needs observed/theory status and notes.');
    requireThat(input.status !== 'observed' || input.result !== null, 'Confirmed lineage needs a known result.');
    return copy(input);
}
function saveBreeding(next, input, anchor) {
    const row = validateBreeding(input);
    for (const id of [row.parentA, row.parentB, row.result].filter(Boolean)) requireThat(next.species[id], 'Discover or define every species before recording lineage.');
    const old = next.breeding[row.id];
    if (old) { requireThat(digest({ ...old, anchor: undefined }) === digest(row), 'Lineage event is immutable. Use a new event ID for a different result.'); return; }
    requireThat(Object.keys(next.breeding).length < 2000, 'Lineage capacity reached.');
    next.breeding[row.id] = { ...row, anchor };
}
function validatePurchase(input) {
    keysOnly(input, ['id', 'buyerId', 'kind', 'entityId', 'quantity', 'price', 'terms'], 'record.purchaseOffers');
    requireThat(idValid(input.id) && idValid(input.buyerId) && idValid(input.entityId) && ['inventory', 'creatures', 'npcs'].includes(input.kind), 'Purchase needs a buyer and owned entity.');
    requireThat(number(input.price) && input.price > 0 && number(input.quantity) && input.quantity > 0 && (input.kind === 'inventory' || input.quantity === 1) && text(input.terms), 'Invalid purchase quantity, price or terms.');
}
function purchasable(next, offer) {
    requireThat(next.entities.npcs[offer.buyerId]?.profile, 'Buyer is no longer available.');
    const entity = next.entities[offer.kind][offer.entityId];
    requireThat(entity, 'Sale target is missing.');
    if (offer.kind === 'inventory') requireThat(entity.quantity >= offer.quantity, 'Insufficient stock for this sale.');
    else requireThat(entity.owned === true, 'This individual is not in your possession.');
    requireThat(offer.kind !== 'npcs' || offer.buyerId !== offer.entityId, 'Buyer cannot also be the sale target.');
    return entity;
}
function purchaseOffer(next, offer, anchor) {
    validatePurchase(offer);
    requireThat(next.entities.npcs[offer.buyerId]?.profile, 'Purchase buyer needs a complete NPC profile.');
    const old = next.purchases[offer.id];
    if (old) { requireThat(digest(old.offer) === digest(offer), 'Purchase identity/terms are immutable. Use purchaseUpdates for negotiation.'); return; }
    purchasable(next, offer); requireThat(Object.keys(next.purchases).length < 1000, 'Purchase capacity reached.');
    next.purchases[offer.id] = { offer: copy(offer), anchor, status: 'offered', price: offer.price, round: 0, requestedPrice: null, history: [{ by: 'npc', price: offer.price, decision: 'offer', round: 0 }], buyerName: next.entities.npcs[offer.buyerId].name, targetName: next.entities[offer.kind][offer.entityId].name };
}
function purchaseUpdate(next, update) {
    keysOnly(update, ['id', 'round', 'decision', 'price', 'reason'], 'record.purchaseUpdates');
    const deal = next.purchases[update.id];
    requireThat(deal?.status === 'awaiting' && update.round === deal.round && ['accept', 'counter', 'decline'].includes(update.decision) && number(update.price) && update.price > 0 && text(update.reason), 'Negotiation response is stale or no counteroffer is pending.');
    if (update.decision === 'accept') requireThat(update.price === deal.requestedPrice, 'Accepted price must equal the user counteroffer.');
    requireThat(deal.history.length < 1000, 'Negotiation history limit reached. Close this negotiation and use a new offer ID.');
    deal.status = update.decision === 'decline' ? 'declined' : 'offered'; deal.price = update.price;
    deal.history.push({ by: 'npc', price: update.price, decision: update.decision, round: deal.round, reason: update.reason });
}
function extensionAction(next, action) {
    if (action.kind === 'npc-upsert') {
        const p = validateNpc(action.profile), old = next.entities.npcs[p.id];
        requireThat(digest(old || null) === action.expected, 'NPC changed; review the current profile before saving.');
        requireThat(typeof action.owned === 'boolean', 'Choose possession explicitly.');
        entityUpdates(next, { npcs: [{ id: p.id, name: p.name, profile: p, status: p.status || '', location: p.location || '', details: p.background || '', owned: action.owned }] }); return;
    }
    if (action.kind === 'species-upsert') {
        requireThat(digest(next.species[action.species.id] || null) === action.expected, 'Species changed; reopen the form.'); saveSpecies(next, action.species); return;
    }
    if (action.kind === 'breeding-add') { saveBreeding(next, action.record, action.after); return; }
    if (action.kind === 'ownership') {
        requireThat(['creatures', 'npcs'].includes(action.entityKind) && typeof action.owned === 'boolean', 'Invalid possession action.');
        const row = next.entities[action.entityKind][action.entityId]; requireThat(row && digest(row) === action.expected, 'Individual changed; reopen its possession control.'); row.owned = action.owned; return;
    }
    const deal = next.purchases[action.purchaseId];
    requireThat(deal && digest(deal) === action.expected && deal.anchor === action.offerAnchor, 'Purchase changed; review the latest offer.');
    requireThat(['offered', 'awaiting'].includes(deal.status), 'This negotiation is already closed.');
    requireThat(deal.history.length < 1000, 'Negotiation history limit reached.');
    if (action.kind === 'purchase-decline') { deal.status = 'declined'; deal.history.push({ by: 'user', decision: 'decline', round: deal.round }); return; }
    requireThat(deal.status === 'offered', 'Wait for the buyer response before making another bid.');
    purchasable(next, deal.offer);
    if (action.kind === 'purchase-counter') {
        requireThat(number(action.price) && action.price > 0 && action.price !== deal.price, 'Choose a different positive total price.');
        deal.status = 'awaiting'; deal.round++; deal.requestedPrice = action.price; deal.history.push({ by: 'user', decision: 'counter', price: action.price, round: deal.round }); return;
    }
    requireThat(next.resources.silver !== null && number(next.resources.silver + deal.price), 'Current balance is unknown or exceeds the limit.');
    const target = purchasable(next, deal.offer);
    if (deal.offer.kind === 'inventory') target.quantity -= deal.offer.quantity;
    else { target.owned = false; target.status = 'Transferred'; target.location = deal.buyerName; if (target.profile) { target.profile.status = target.status; target.profile.location = target.location; } }
    next.resources.silver += deal.price; deal.status = 'sold'; deal.history.push({ by: 'user', decision: 'sell', price: deal.price, round: deal.round });
    next.transactions.push({ id: `sale-${action.id}`, reason: `${deal.buyerName}: ${deal.targetName}`, silverDelta: deal.price, items: deal.offer.kind === 'inventory' ? [{ itemId: deal.offer.entityId, delta: -deal.offer.quantity }] : [] });
}
export function makeLocalAction(campaign, messages, input, id) {
    const result = replay(campaign, messages);
    requireThat(!result.errors.length, 'Resolve tracking errors before changing the ledger.');
    const after = Object.values(result.frames).at(-1)?.anchor || 'baseline';
    const action = { ...copy(input), id, after };
    applyAction(result.state, action); return action;
}
function validateWorldState(state) {
    const next = normalizeState(state);
    requireThat(obj(next.species) && Object.keys(next.species).length <= 500 && obj(next.breeding) && Object.keys(next.breeding).length <= 2000 && obj(next.purchases) && Object.keys(next.purchases).length <= 1000, 'Invalid world index.');
    const names = new Set();
    for (const [id, row] of Object.entries(next.species)) {
        requireThat(validateSpecies(row).id === id, 'Species ID mismatch.');
        const name = row.name.trim().normalize('NFKC').toLocaleLowerCase(); requireThat(!names.has(name), 'Duplicate saved species name.'); names.add(name);
    }
    for (const [id, row] of Object.entries(next.breeding)) {
        keysOnly(row, ['id', 'parentA', 'parentB', 'result', 'status', 'notes', 'anchor'], 'saved.breeding');
        const { anchor, ...data } = row; requireThat(text(anchor, 200) && data.id === id, 'Invalid lineage source.');
        validateBreeding(data); for (const sp of [data.parentA, data.parentB, data.result].filter(Boolean)) requireThat(next.species[sp], 'Missing lineage species.');
    }
    for (const [id, deal] of Object.entries(next.purchases)) {
        keysOnly(deal, ['offer', 'anchor', 'status', 'price', 'round', 'requestedPrice', 'history', 'buyerName', 'targetName'], 'saved.purchases');
        validatePurchase(deal.offer); requireThat(id === deal.offer.id && text(deal.anchor, 200) && ['offered', 'awaiting', 'declined', 'sold'].includes(deal.status) && number(deal.price) && deal.price > 0 && number(deal.round) && (deal.requestedPrice === null || number(deal.requestedPrice) && deal.requestedPrice > 0) && text(deal.buyerName, 200) && text(deal.targetName, 200), 'Invalid saved purchase.');
        requireThat(deal.status !== 'awaiting' || deal.requestedPrice !== null, 'Missing pending bid.');
        for (const step of list(deal.history, 1000)) {
            keysOnly(step, ['by', 'price', 'decision', 'round', 'reason'], 'saved.purchases.history');
            requireThat(['user', 'npc'].includes(step.by) && ['offer', 'accept', 'counter', 'decline', 'sell'].includes(step.decision) && number(step.round) && (step.price === undefined || number(step.price) && step.price > 0) && (step.reason === undefined || text(step.reason)), 'Invalid negotiation history.');
        }
    }
}
