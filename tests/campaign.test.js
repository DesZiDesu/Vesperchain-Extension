import test from 'node:test';
import assert from 'node:assert/strict';
import { blankState, freshCampaign, replay, makeDecision, checkpoint, continueCampaign, validateCheckpoint, parseRecord } from '../src/campaign.js';
import { identity } from '../src/tracking.js';
const campaign = () => freshCampaign('character:vesper.png', 'first-chat', 'campaign-1');
const packet = (eventId, baseRevision, rest = {}) => ({ version: 1, eventId, baseRevision, ...rest });
const message = (record, date = 'd1') => ({ name: 'Narrator', send_date: date, mes: `Story.\n\n\`\`\`vesperchain\n${JSON.stringify(record)}\n\`\`\`` });
const offer = { id: 'silk-job', title: 'Silk commission', issuer: 'Weavers', objective: 'Deliver two spools', terms: 'Two clean spools; no fee to decline.', deadlineDay: 10, reward: { silver: 100, xp: 25 }, deliver: [{ itemId: 'silk', quantity: 2 }] };
const initial = () => message(packet('e1', 0, { scene: { city: 'Vespergate', day: 1 }, resources: { silver: 800, xp: 0, level: 1 }, entities: { inventory: [{ id: 'silk', name: 'Silk', quantity: 3 }] }, offers: [offer] }));
test('historical scenes stay per message; no-record replies inherit known scene without guessing', () => {
    const r = replay(campaign(), [initial(), { mes: 'A quiet conversation.' }, message(packet('e2', 1, { scene: { city: 'Thornmere', day: 5 } }), 'd2')]);
    assert.equal(r.frames[0].scene.city, 'Vespergate'); assert.equal(r.frames[1].scene.city, 'Vespergate'); assert.equal(r.frames[2].scene.city, 'Thornmere');
    assert.equal(r.frames[0].scene.room, null); assert.equal(r.frames[1].status, 'carried');
});
test('user and system messages cannot inject game updates', () => {
    const r = replay(campaign(), [{ ...initial(), is_user: true }, { ...initial(), is_system: true }]);
    assert.deepEqual(r.state, blankState()); assert.deepEqual(r.frames, {});
});
test('repeated records are idempotent; conflicting or stale updates leave the whole previous state intact', () => {
    const first = initial(), broken = message(packet('e2', 1, { scene: { city: 'Wrong' }, transactions: [{ id: 'bad', reason: 'Impossible purchase', silverDelta: -1000, items: [] }] }), 'd2');
    const r = replay(campaign(), [first, first, broken]); assert.equal(r.state.resources.silver, 800); assert.equal(r.state.scene.city, 'Vespergate'); assert.equal(r.errors.length, 1);
    assert.equal(replay(campaign(), [first, message(packet('e3', 0, { resources: { silver: 99 } }))]).state.resources.silver, 800);
});
test('signing, verified objective, and confirmed handover settle money and items once', () => {
    const c = campaign(), messages = [initial()];
    c.actions.push(makeDecision(c, messages, 'sign', 'silk-job', 'Mali', 'signature-1'));
    assert.equal(replay(c, messages).state.contracts['silk-job'].status, 'signed');
    assert.throws(() => makeDecision(c, messages, 'settle', 'silk-job', '', 'invalid'));
    messages.push(message(packet('e2', 2, { contractUpdates: [{ id: 'silk-job', ready: true, evidence: 'The buyer inspected both spools.' }] }), 'd2'));
    c.actions.push(makeDecision(c, messages, 'settle', 'silk-job', '', 'delivery-1'));
    const r = replay(c, messages); assert.equal(r.state.resources.silver, 900); assert.equal(r.state.resources.xp, 25); assert.equal(r.state.entities.inventory.silk.quantity, 1);
    assert.deepEqual(replay(c, messages).state, r.state);
    assert.throws(() => makeDecision(c, messages, 'settle', 'silk-job', '', 'delivery-2'));
});
test('edit/swipe/delete suspends anchored decisions and rolls back derived payouts', () => {
    const c = campaign(), messages = [initial()]; c.actions.push(makeDecision(c, messages, 'sign', 'silk-job', 'Mali', 's1'));
    const changed = { ...messages[0], swipe_id: 1, mes: messages[0].mes.replace('Story.', 'Different story.') };
    const r = replay(c, [changed]); assert.equal(r.state.contracts['silk-job'].status, 'offered'); assert.equal(r.errors.length, 1);
    assert.equal(replay(c, []).state.resources.silver, null);
    assert.equal(replay(c, messages).state.contracts['silk-job'].status, 'signed');
});
test('contract conditions cannot be silently rewritten after offer/signature', () => {
    const r = replay(campaign(), [initial(), message(packet('e2', 1, { offers: [{ ...offer, reward: { silver: 999, xp: 0 } }] }), 'd2')]);
    assert.equal(r.state.contracts['silk-job'].offer.reward.silver, 100); assert.equal(r.errors.length, 1);
});
test('fresh chat is empty; explicit continuation is a deep copy with owner validation', () => {
    const c = campaign(), r = replay(c, [initial()]); const saved = checkpoint(c, r, 'Before the road', 'Mara awaits payment.', 'save-1', '2026-09-15');
    const next = continueCampaign(saved, c.owner, 'new-chat', 'campaign-2', 1);
    assert.equal(next.baseline.resources.silver, 800); next.baseline.resources.silver = 50; assert.equal(saved.state.resources.silver, 800);
    assert.equal(freshCampaign(c.owner, 'new-chat', 'c3').baseline.resources.silver, null);
    assert.throws(() => continueCampaign(saved, 'character:other.png', 'new-chat', 'c4', 0));
    assert.equal(replay(next, [initial()]).state.resources.silver, 50, 'new greeting is not reapplied after explicit continuation');
});
test('unsafe, incomplete and ambiguous machine records are rejected', () => {
    assert.ok(parseRecord('```vesperchain\n{}').error);
    assert.ok(parseRecord(initial().mes + initial().mes).error);
    assert.ok(parseRecord('```vesperchain\n{"__proto__":{}}\n```').error);
    assert.throws(() => validateCheckpoint({ format: 'other' }));
});
test('character zero, avatar identities and groups are distinct', () => {
    assert.deepEqual(identity({ characterId: 0, characters: [{ avatar: 'a.png' }], getCurrentChatId: () => 'chat' }), { owner: 'character:a.png', chatId: 'chat' });
    assert.equal(identity({ groupId: 0, chatId: 'chat' }).owner, 'group:0');
    assert.equal(identity({ name2: 'Unstable display name' }), null);
});
