import test from 'node:test';
import assert from 'node:assert/strict';
import { NPC_FIELDS, validateNpc, speakerSegments, groupedSegments, speechParts } from '../src/npc-model.js';
import { blankState, applyRecord, freshCampaign, replay, validateCheckpoint, checkpoint } from '../src/campaign.js';
import { prose, seedNpcProfiles, NPC_LIBRARY } from '../src/npcs.js';
import { rasterSize } from '../src/portraits.js';
const profile = (id='mara',name='Mara Vey') => ({id,...Object.fromEntries(NPC_FIELDS.map(k=>[k,null])),name,role:'Inn Keeper',appearance:'Black hair',personality:'Patient'});
test('NPC creation requires every field and a personal name; a malformed profile rejects its whole transaction',()=>{
    const p=profile();assert.equal(validateNpc(p).name,'Mara Vey');
    for(const key of NPC_FIELDS){const broken={...p};delete broken[key];assert.throws(()=>validateNpc(broken));}
    for(const name of ['Inn Keeper','The innkeeper','เจ้าของโรงเตี๊ยม','Guard'])assert.throws(()=>validateNpc({...p,name}));
    const state=blankState();assert.throws(()=>applyRecord(state,{eventId:'e',baseRevision:0,resources:{silver:50},npcProfiles:[{id:'mara',name:'Mara'}]},'a'));
    assert.equal(state.resources.silver,null);
});
test('A A narration A B B A yields only three speaker headers; malformed/nested markers fall back',()=>{
    const raw='[[vc:mara]]“First.”\n\n“Second.”[[/vc]]\nA bell rings.\n[[vc:mara]]“Third.”[[/vc]][[vc:edric]]“Hello.”[[/vc]][[vc:edric]]“Wait.”[[/vc]][[vc:mara]]“Yes.”[[/vc]]';
    const grouped=groupedSegments(speakerSegments(raw));assert.deepEqual(grouped.chunks.filter(c=>c.header).map(c=>c.speaker),['mara','edric','mara']);
    assert.equal(groupedSegments(speakerSegments('[[vc:mara]]“Again.”[[/vc]]'),'mara').chunks[0].header,false);
    for(const raw of ['[[vc:mara]]missing end','[[vc:a]][[vc:b]]nested[[/vc]][[/vc]]','[[vc:constructor]]x[[/vc]]','[[vc:mara]]x[[/vc]] [[/vc]]'])assert.equal(speakerSegments(raw),null);
});
test('NPC presentation escapes script/HTML and distinguishes host quote and emphasis elements',()=>{
    const html=prose('*She waits.*\n\n“Hello.” <img src=x onerror=alert(1)>');
    assert.ok(html.includes('<em>She waits.</em>'));assert.ok(html.includes('<q>“Hello.”</q>'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
});
test('Only quoted speech becomes dialogue; actions and inline narration retain their order without extra headers',()=>{
    const text='*She touches the "sealed" letter.*\n“First.”\n\n“Second.” She pauses. “Third.”\n*She waits.*';
    const parts=speechParts(text);
    assert.deepEqual(parts.map(p=>p.quoted),[false,true,false,true,false]);
    assert.equal(parts[1].text,'“First.”\n\n“Second.”');
    const result=groupedSegments([{speaker:'mara',text}]);
    assert.equal(result.chunks.filter(c=>c.header).length,1);
    assert.ok(result.chunks.filter(c=>c.speaker).every(c=>!c.text.includes('She')));
    assert.equal(groupedSegments([{speaker:'edric',text:'*He waits silently.*'}],'mara').lastSpeaker,'mara');
    assert.ok(speechParts('An unfinished “sentence').every(p=>!p.quoted));
});
test('Historical NPC identities survive later updates and checkpoint round-trip',()=>{
    const campaign=freshCampaign('owner','chat','id');const msg=(p,base)=>({mes:'[[vc:mara]]“Hello.”[[/vc]]\n```vesperchain\n'+JSON.stringify({version:1,eventId:'e'+base,baseRevision:base,npcProfiles:[p]})+'\n```'});
    const result=replay(campaign,[msg(profile(),0),msg({...profile(),role:'Archivist'},1)]);
    assert.equal(result.frames[0].npcs.mara.profile.role,'Inn Keeper');assert.equal(result.frames[1].npcs.mara.profile.role,'Archivist');
    assert.equal(validateCheckpoint(checkpoint(campaign,result,'save','','save1','now')).state.entities.npcs.mara.profile.name,'Mara Vey');
});
test('Shared NPC seeds are explicit and copied per character without leaking another owner',()=>{
    const ctx={extensionSettings:{[NPC_LIBRARY]:{owner:{mara:profile()}}}};
    const seed=seedNpcProfiles(ctx,'owner');seed.mara.profile.name='Changed';assert.equal(ctx.extensionSettings[NPC_LIBRARY].owner.mara.name,'Mara Vey');assert.deepEqual(seedNpcProfiles(ctx,'another'),{});
});
test('Portrait header validation rejects SVG and detects raster dimensions before decoding',()=>{
    assert.throws(()=>rasterSize(new TextEncoder().encode('<svg onload="alert(1)"></svg>').buffer));
    const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const v=new DataView(bytes.buffer);v.setUint32(16,384);v.setUint32(20,512);assert.deepEqual(rasterSize(bytes.buffer),[384,512]);
});
