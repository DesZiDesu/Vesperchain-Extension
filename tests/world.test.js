import test from 'node:test';
import assert from 'node:assert/strict';
import { freshCampaign, replay, makeLocalAction, applyRecord, blankState, digest, speciesId, checkpoint, validateCheckpoint, continueCampaign } from '../src/campaign.js';
import { NPC_FIELDS } from '../src/npc-model.js';
const npc = (id, species = 'Elf') => ({ id, ...Object.fromEntries(NPC_FIELDS.map(k => [k, null])), name: id === 'mara' ? 'Mara Vey' : 'Seren Thornveil', species });
const campaign = () => freshCampaign('character:vesper.png', 'chat', 'world-1');
const record = (id, rev, fields) => ({ version: 1, eventId: id, baseRevision: rev, ...fields });
const msg = (r, date = r.eventId) => ({ send_date: date, mes: 'Story.\n```vesperchain\n' + JSON.stringify(r) + '\n```' });
const offer = (id = 'buy-1', kind = 'inventory', entityId = 'silk') => ({ id, buyerId: 'mara', kind, entityId, quantity: kind === 'inventory' ? 2 : 1, price: 120, terms: 'Payment on confirmed sale.' });
const initial = (offers = [offer()]) => msg(record('arrival', 0, { resources: { silver: 300 }, npcProfiles: [npc('mara'), npc('seren', 'Human')], entities: { inventory: [{ id: 'silk', name: 'Silk', quantity: 5 }], creatures: [{ id: 'moth', name: 'Ash moth', species: 'Moth', owned: true }] }, purchaseOffers: offers }));
function decide(c, messages, kind, price) { const d = replay(c, messages).state.purchases['buy-1']; const action = makeLocalAction(c, messages, { kind: 'purchase-' + kind, purchaseId: 'buy-1', price, expected: digest(d), offerAnchor: d.anchor }, 'action-' + c.actions.length); c.actions.push(action); return replay(c, messages); }
test('manual NPC creation works before the first AI message, supports edits and indexes species once', () => {
    const c = campaign(); c.actions.push(makeLocalAction(c, [], { kind: 'npc-upsert', profile: npc('mara'), owned: false, expected: digest(null) }, 'create'));
    let r = replay(c, []); assert.equal(r.state.revision, 1); assert.equal(r.state.entities.npcs.mara.profile.age, null); assert.equal(r.state.species[speciesId('Elf')].name, 'Elf');
    const original = r.state.entities.npcs.mara; c.actions.push(makeLocalAction(c, [], { kind: 'npc-upsert', profile: { ...npc('mara'), role: 'Merchant' }, owned: false, expected: digest(original) }, 'edit'));
    r = replay(c, [msg(record('intro', 2, { npcProfiles: [npc('seren', 'elf')] }))]); assert.equal(r.errors.length, 0); assert.equal(Object.keys(r.state.species).length, 1); assert.equal(r.state.entities.npcs.mara.profile.role, 'Merchant');
});
test('manual creation requires a personal name and stale edits fail instead of overwriting', () => {
    const c = campaign(), messages = [initial()];
    assert.throws(() => makeLocalAction(c, messages, { kind: 'npc-upsert', profile: { ...npc('new'), name: 'Merchant' }, owned: false, expected: digest(null) }, 'bad'));
    assert.throws(() => makeLocalAction(c, messages, { kind: 'npc-upsert', profile: npc('mara'), owned: false, expected: digest(null) }, 'stale'));
});
test('species details and lineage distinguish theory, observed results, and separate offspring', () => {
    const c = campaign(), messages = [initial()]; let r = replay(c, messages);
    const theory = { id: 'theory', parentA: speciesId('Elf'), parentB: speciesId('Human'), result: null, status: 'theory', notes: 'Not observed yet.' };
    c.actions.push(makeLocalAction(c, messages, { kind: 'breeding-add', record: theory }, 'add-theory'));
    r = replay(c, messages); assert.equal(r.state.breeding.theory.status, 'theory'); assert.equal(Object.keys(r.state.entities.creatures).length, 1);
    assert.throws(() => makeLocalAction(c, messages, { kind: 'breeding-add', record: { ...theory, id: 'observed', status: 'observed' } }, 'bad'));
    const species = { id: 'half-elf', name: 'Half Elf', description: 'Observed hybrid', traits: 'Mixed lineage', habitat: '', notes: '' };
    messages.push(msg(record('result', 2, { speciesProfiles: [species], breedingRecords: [{ ...theory, id: 'observed', result: 'half-elf', status: 'observed', notes: 'Confirmed in the story.' }] })));
    r = replay(c, messages); assert.equal(r.errors.length, 0); assert.equal(r.state.breeding.observed.result, 'half-elf'); assert.equal(Object.keys(r.state.entities.creatures).length, 1);
});
test('unknown lineage species and duplicate names reject the entire record atomically', () => {
    const state = replay(campaign(), [initial()]).state;
    assert.throws(() => applyRecord(state, record('bad', 1, { scene: { city: 'Wrong' }, breedingRecords: [{ id: 'cross', parentA: 'missing', parentB: speciesId('Elf'), result: null, status: 'theory', notes: '' }] }), 'anchor'));
    assert.throws(() => applyRecord(state, record('bad', 1, { speciesProfiles: [{ id: 'duplicate', name: 'ELF', description: '', traits: '', habitat: '', notes: '' }] }), 'anchor'));
    assert.equal(state.scene.city, null);
});
test('new named species and NPC profile can arrive in one atomic record', () => {
    const state = applyRecord(blankState(), record('species', 0, { speciesProfiles: [{ id: 'elf', name: 'Elf', description: '', traits: '', habitat: '', notes: '' }], npcProfiles: [npc('mara')] }), 'anchor');
    assert.deepEqual(Object.keys(state.species), ['elf']);
});
test('counteroffers do not transfer possessions or funds, NPC acceptance still waits for explicit sale', () => {
    const c = campaign(), messages = [initial()]; let r = decide(c, messages, 'counter', 180);
    assert.equal(r.state.purchases['buy-1'].status, 'awaiting'); assert.equal(r.state.resources.silver, 300); assert.equal(r.state.entities.inventory.silk.quantity, 5);
    messages.push(msg(record('accepted', 2, { purchaseUpdates: [{ id: 'buy-1', round: 1, decision: 'accept', price: 180, reason: 'Agreed.' }] })));
    r = replay(c, messages); assert.equal(r.state.purchases['buy-1'].status, 'offered'); assert.equal(r.state.resources.silver, 300);
    r = decide(c, messages, 'sell'); assert.equal(r.state.resources.silver, 480); assert.equal(r.state.entities.inventory.silk.quantity, 3); assert.equal(r.state.purchases['buy-1'].status, 'sold');
    assert.equal(r.frames[1].money[0].silverDelta, 180); assert.equal(r.frames[1].money[0].reason, 'Mara Vey: Silk'); assert.deepEqual(replay(c, messages).state, r.state); assert.throws(() => decide(c, messages, 'sell'));
});
test('repeated bargaining rounds require the exact pending round and accepted price', () => {
    const c = campaign(), messages = [initial()]; decide(c, messages, 'counter', 200);
    const state = replay(c, messages).state;
    for (const patch of [{ round: 0, price: 200 }, { round: 1, price: 150 }]) assert.throws(() => applyRecord(state, record('bad', 2, { purchaseUpdates: [{ id: 'buy-1', decision: 'accept', reason: '', ...patch }] }), 'anchor'));
    messages.push(msg(record('counter', 2, { purchaseUpdates: [{ id: 'buy-1', round: 1, decision: 'counter', price: 160, reason: 'Budget.' }] })));
    decide(c, messages, 'counter', 180); assert.equal(replay(c, messages).state.purchases['buy-1'].round, 2);
    decide(c, messages, 'decline'); assert.equal(replay(c, messages).state.resources.silver, 300);
});
test('only explicitly possessed creatures/individuals can be offered and each transfers once', () => {
    const c = campaign(), messages = [initial([offer('buy-1', 'creatures', 'moth'), offer('buy-2', 'creatures', 'moth')])];
    const r = decide(c, messages, 'sell'); assert.equal(r.state.entities.creatures.moth.owned, false); assert.equal(r.state.entities.creatures.moth.location, 'Mara Vey');
    const d = r.state.purchases['buy-2']; assert.throws(() => makeLocalAction(c, messages, { kind: 'purchase-sell', purchaseId: 'buy-2', expected: digest(d), offerAnchor: d.anchor }, 'sell-again'));
    const bad = replay(campaign(), [initial([offer('buy-1', 'npcs', 'seren')])]); assert.equal(bad.errors.length, 1); assert.equal(bad.state.revision, 0);
});
test('owned NPC sale preserves identity and updates possession without deleting the person', () => {
    const c = campaign(), messages = [initial([])]; let r = replay(c, messages);
    c.actions.push(makeLocalAction(c, messages, { kind: 'ownership', entityKind: 'npcs', entityId: 'seren', owned: true, expected: digest(r.state.entities.npcs.seren) }, 'owner'));
    messages.push(msg(record('offer', 2, { purchaseOffers: [offer('buy-1', 'npcs', 'seren')] })));
    r = decide(c, messages, 'sell'); assert.equal(r.state.entities.npcs.seren.owned, false); assert.equal(r.state.entities.npcs.seren.profile.name, 'Seren Thornveil'); assert.equal(r.state.entities.npcs.seren.profile.location, 'Mara Vey');
});
test('unknown balance/insufficient stock cannot settle; offer and decline do not move money', () => {
    const c = campaign(), messages = [initial()]; const state = replay(c, messages).state; state.resources.silver = null;
    const d = state.purchases['buy-1']; const c2 = campaign(); c2.baseline = state;
    assert.throws(() => makeLocalAction(c2, [], { kind: 'purchase-sell', purchaseId: 'buy-1', expected: digest(d), offerAnchor: d.anchor }, 'sale'));
    assert.equal(decide(c, messages, 'decline').state.resources.silver, 300);
});
test('editing/removing a source suspends the sale and receipt and restores ownership', () => {
    const c = campaign(), messages = [initial()]; decide(c, messages, 'sell');
    const changed = { ...messages[0], mes: messages[0].mes.replace('Story.', 'Different story.') };
    const r = replay(c, [changed]); assert.equal(r.state.resources.silver, 300); assert.equal(r.state.entities.inventory.silk.quantity, 5); assert.equal(r.frames[0].money.length, 0); assert.equal(r.errors.length, 1);
});
test('money receipts show actual deltas once, ignore initial balance, and preserve signed payments', () => {
    const c = campaign(), messages = [initial()]; assert.equal(replay(c, messages).frames[0].money.length, 0);
    messages.push(msg(record('expense', 1, { transactions: [{ id: 'meal', reason: 'Meal', silverDelta: -25, items: [] }, { id: 'gift', reason: 'Gift', silverDelta: 10, items: [] }] })));
    messages.push(msg(record('correction', 2, { resources: { silver: 290 } })));
    const r = replay(c, messages); assert.deepEqual(r.frames[1].money.map(t => t.silverDelta), [-25, 10]); assert.equal(r.frames[2].money[0].silverDelta, 5); assert.equal(r.frames[2].money[0].source, 'balance');
    assert.throws(() => applyRecord(r.state, record('double', 3, { transactions: [{ id: 'sale-fake', reason: 'Fake payment', silverDelta: 100, items: [] }] }), 'anchor'));
});
test('v1 checkpoints round-trip species, lineage and pending negotiations, while old checkpoints migrate lazily', () => {
    const c = campaign(), messages = [initial()]; decide(c, messages, 'counter', 150);
    const saved = checkpoint(c, replay(c, messages), 'Save', '', 'save', '2026'); const valid = validateCheckpoint(saved); assert.equal(valid.state.purchases['buy-1'].requestedPrice, 150);
    const next = continueCampaign(valid, c.owner, 'new', 'new-campaign', 0); assert.deepEqual(replay(next, []).state, valid.state);
    const old = checkpoint(campaign(), replay(campaign(), []), 'Legacy', '', 'old', '2026'); delete old.state.species; delete old.state.breeding; delete old.state.purchases;
    assert.deepEqual(validateCheckpoint(old).state.species, {});
    const broken = structuredClone(saved); broken.state.breeding.bad = { id: 'bad', parentA: 'missing', parentB: speciesId('Elf'), result: null, status: 'theory', notes: '', anchor: 'm-1' }; assert.throws(() => validateCheckpoint(broken));
});

test('species names are trimmed on definition and duplicate saved species identities are rejected', () => {
    const c = campaign();
    const first = msg(record('species', 0, { speciesProfiles: [{ id: 'elf', name: ' Elf ', description: '', traits: '', habitat: '', notes: '' }], npcProfiles: [npc('mara')] }));
    const result = replay(c, [first]); assert.equal(result.state.species.elf.name, 'Elf'); assert.equal(Object.keys(result.state.species).length, 1);
    const saved = checkpoint(c, result, 'Save', '', 'save', '2026'); saved.state.species.other = { ...saved.state.species.elf, id: 'other', name: 'ELF' }; assert.throws(() => validateCheckpoint(saved));
});
