import { esc, digest, copy } from './campaign.js';
import { NPC_FIELDS, validateNpc, speakerSegments, groupedSegments, speechParts } from './npc-model.js';
import { optimizePortrait, portraitStore } from './portraits.js';
import { icon } from './icons.js';

export const NPC_LIBRARY = 'vesperchainNpcCharacters';
export function seedNpcProfiles(ctx, owner) {
    const saved = ctx.extensionSettings[NPC_LIBRARY]?.[owner] || {}, result = {};
    for (const [id, value] of Object.entries(saved).slice(0,500)) {
        try { const p = validateNpc(value); if(p.id===id)result[id] = {id,name:p.name,status:p.status || '',location:p.location || '',details:p.background || '',profile:p}; } catch { /* Keep invalid legacy data out of generation. */ }
    }
    return result;
}
// Strict text-only rendering; AI cannot supply HTML, CSS, links, or image sources.
export function prose(text) {
    return String(text).split(/\n\s*\n/).filter(x=>x.trim()).map(paragraph => {
        const fragments = paragraph.split(/("[^"\n]+"|“[^”]+”|「[^」]+」|『[^』]+』|\*[^*\n]+\*)/g);
        return `<p>${fragments.map(s => /^["“「『]/.test(s) && /["”」』]$/.test(s) ? `<q>${esc(s)}</q>` : /^\*[^*]+\*$/.test(s) ? `<em>${esc(s.slice(1,-1))}</em>` : esc(s)).join('').replace(/\n/g,'<br>')}</p>`;
    }).join('');
}
export function createNpcs(getContext, getConfig, getModel, changed, makeDialog, doc = document) {
    const win = doc.defaultView, media = portraitStore(win), abort = new win.AbortController();
    const l=(th,en)=>getConfig().language==='th'?th:en;
    let epoch=0, uploadBusy=false;
    const renderCache = new WeakMap();
    const on=(node,event,fn)=>node?.addEventListener(event,fn,{signal:abort.signal});
    const lib=()=>{const ctx=getContext(), owner=getModel().current.owner;ctx.extensionSettings[NPC_LIBRARY] ||= {};return ctx.extensionSettings[NPC_LIBRARY][owner] ||= {};};
    const scope=id=>getModel().current?.npcScopes?.[id] || 'chat';
    const imageKey=id=>JSON.stringify([getModel().current.owner,scope(id)==='character'?'character':getModel().current.id,id]);
    function assertCurrent(id) { const model=getModel(); if(!model.enabled || !model.current || model.current.id!==id || model.busy)throw new Error(l('แชตเปลี่ยนหรือ AI กำลังตอบ กรุณาเปิดใหม่','Chat changed or generating. Reopen this panel.')); }
    function reconcile() {
        const {current,result,busy}=getModel(); if(!current || busy)return;
        current.npcScopes ||= {}; current.npcPublished ||= {};
        let save=false;
        for(const row of Object.values(result.state.entities.npcs)) {
            if(!row.profile)continue;
            const id=row.id;
            if(!current.npcScopes[id]) current.npcScopes[id]=getConfig().npcDefaultScope;
            if(scope(id)==='character') {
                const hash=digest(row.profile);
                if(current.npcPublished[id]!==hash) { lib()[id]=copy(row.profile); current.npcPublished[id]=hash; save=true; }
            }
        }
        if(save)getContext().saveSettingsDebounced();
    }
    const visible = new win.IntersectionObserver(entries=>{
        for(const entry of entries)if(entry.isIntersecting) { visible.unobserve(entry.target); loadPortrait(entry.target); }
    },{rootMargin:'160px'});
    async function loadPortrait(node) {
        const stamp=epoch, key=node.dataset.portraitKey;
        try { const url=await media.url(key); if(!url || stamp!==epoch || !node.isConnected || node.dataset.portraitKey!==key)return;
            const img=doc.createElement('img');img.alt='';img.width=72;img.height=88;img.loading='lazy';img.decoding='async';
            img.onload=()=>{if(node.isConnected)node.classList.add('vc-has-portrait');};img.onerror=()=>img.remove();img.src=url;node.append(img);
        } catch { /* An unavailable local portrait keeps the readable initials. */ }
    }
    function header(p) {
        const initials=p.name.split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]).join('');
        return `<header class="vc-npc-header"><button type="button" class="vc-npc-portrait" data-npc-open="${esc(p.id)}" data-portrait-key="${esc(imageKey(p.id))}" aria-label="${esc(l('ข้อมูลและภาพของ ','Profile and portrait: ')+p.name)}"><span>${esc(initials)}</span></button><div class="vc-npc-nameplate">${p.role?`<span class="vc-npc-role">${esc(p.role)}</span>`:''}<h3>${esc(p.name)}</h3>${p.status?`<span class="vc-npc-status">${esc(p.status)}</span>`:''}</div></header>`;
    }
    function clean(node=doc) {
        node.querySelectorAll('.vc-npc-message').forEach(n=>{n.querySelectorAll('[data-portrait-key]').forEach(x=>visible.unobserve(x));n.remove();});
        node.querySelectorAll('.vc-npc-original').forEach(n=>n.classList.remove('vc-npc-original'));
    }
    function render() {
        const {result,enabled,busy}=getModel(), config=getConfig(), messages=getContext().chat || [];
        if(!enabled || !config.npcHeaders) {clean();return;}
        if(busy)return; // Leave committed layout still while a new reply streams.
        let last=null;
        for(const node of doc.querySelectorAll('#chat .mes[mesid]')) {
            const index=Number(node.getAttribute('mesid')), message=messages[index], body=node.querySelector('.mes_text');
            const frame=result.frames[index];
            if(!body || message?.is_user || message?.is_system || !frame || frame.status==='rejected' || node.querySelector('.mes_edit_textarea')){clean(node);last=null;continue;}
            const cache=renderCache.get(node), incoming=last;
            const preferences=`${epoch}:${config.npcPortraits}:${config.narrativeHeaders}:${config.language}`;
            if(cache && cache.frame===frame && cache.body===body && cache.view.isConnected && cache.incoming===incoming && cache.preferences===preferences){body.classList.add('vc-npc-original');last=cache.last;continue;}
            let chunks=speakerSegments(message.mes);
            const profiles=frame.npcs || {};
            // Plain narration also gets a folio; never guess a speaker for unlabelled quotes.
            const plain=String(message.mes).replace(/\s*```vesperchain\s*\n[\s\S]*?```\s*$/, '').trim();
            if(!chunks && config.narrativeHeaders && plain && plain.length<=100000 && !/\[\[\/?vc|```/.test(plain) && !speechParts(plain).some(p=>p.quoted))chunks=[{speaker:null,text:plain}];
            if(!chunks){clean(node);if(message.mes.includes('[[vc:'))last=null;continue;}
            if(chunks.some(c=>c.speaker && !profiles[c.speaker]?.profile)){clean(node);last=null;continue;}
            const grouped=groupedSegments(chunks,last); last=grouped.lastSpeaker;
            const merged=[];
            for(const c of grouped.chunks){const previous=merged.at(-1);if(!c.speaker && previous && !previous.speaker)previous.text+='\n\n'+c.text;else merged.push({...c});}
            const markup=merged.map(c=>!c.speaker?`<div class="vc-npc-narration${config.narrativeHeaders?' vc-narrative-folio':''}">${config.narrativeHeaders?`<header class="vc-narrative-heading">${icon('book')}<h4>${l('บทบรรยาย','Narrative')}</h4><span aria-hidden="true"></span></header>`:''}${prose(c.text)}</div>`:`${c.header?header(profiles[c.speaker].profile):''}<div class="vc-npc-dialogue" data-speaker="${esc(c.speaker)}">${prose(c.text)}</div>`).join('');
            let view=node.querySelector('.vc-npc-message');
            if(!view){view=doc.createElement('div');view.className='vc-npc-message';body.after(view);}
            const stamp=digest([markup,config.npcPortraits,epoch]);
            if(view.dataset.stamp!==stamp){view.querySelectorAll('[data-portrait-key]').forEach(x=>visible.unobserve(x));view.innerHTML=markup;view.dataset.stamp=stamp;if(config.npcPortraits)view.querySelectorAll('[data-portrait-key]').forEach(x=>visible.observe(x));}
            view.dataset.fonts=String(config.ornateFonts);
            body.classList.add('vc-npc-original');
            renderCache.set(node,{frame,body,view,incoming,last,preferences});
        }
    }
    function list() {
        const {result}=getModel();
        const rows=Object.values(result.state.entities.npcs);
        return `<p>${l('ข้อมูลเริ่มต้นแยก Chat เลือก Character เพื่อใช้โปรไฟล์ในแชตใหม่ ภาพเก็บเฉพาะเบราว์เซอร์นี้','Chat profiles are isolated. Character profiles seed new chats. Portraits stay in this browser.')}</p>`+ (rows.map(row=>`<article class="vc-reference"><h3>${esc(row.name)}</h3><p>${esc(row.profile?.role || row.status || '')} · ${scope(row.id)}</p><button type="button" data-npc-open="${esc(row.id)}">${icon('book')}${l('ข้อมูล ขอบเขต และภาพ','Profile, scope & portrait')}</button>${!row.profile?`<p>${l('รอ AI กรอกโปรไฟล์ครบทุกช่องก่อนแสดง Header','Waiting for a complete AI profile before showing a header.')}</p>`:''}</article>`).join('') || `<p>${l('ยังไม่มี NPC ที่ยืนยัน','No confirmed NPCs yet.')}</p>`);
    }
    function manage(id) {
        const {current,result}=getModel();if(!current)return;assertCurrent(current.id);
        const row=result.state.entities.npcs[id];if(!row)return;
        const chatId=current.id, p=row.profile;
        const dialog=makeDialog(row.name,`${p?`<dl class="vc-npc-fields">${NPC_FIELDS.map(k=>`<div><dt>${esc(k)}</dt><dd>${esc(p[k]??l('ยังไม่เปิดเผย','Undisclosed'))}</dd></div>`).join('')}</dl>`:`<p>${l('โปรไฟล์เดิมยังไม่ครบ ให้ AI ส่ง npcProfiles ให้ครบก่อน','Legacy profile is incomplete. Ask the AI to supply every npcProfiles field.')}</p>`}<label class="vc-field">${l('ขอบเขตของ NPC นี้','This NPC’s scope')}<select data-npc-scope ${!p?'disabled':''}><option value="chat" ${scope(id)==='chat'?'selected':''}>Chat</option><option value="character" ${scope(id)==='character'?'selected':''}>Character</option></select></label><p>${l('Character ใช้เป็นข้อมูลเริ่มต้นของแชตใหม่ ไม่เขียนทับประวัติแชตอื่น การเปลี่ยนขอบเขตจะคัดลอกภาพไปด้วย','Character seeds new chats without rewriting other chat histories. Changing scope also copies the portrait.')}</p><label class="vc-field">${l('ภาพบุคคล · PNG / JPEG ไม่เกิน 6 MB','Portrait · PNG / JPEG up to 6 MB')}<input type="file" data-npc-image accept="image/png,image/jpeg"></label><p>${l('ครอปกลางภาพ 384 × 384 เก็บในอุปกรณ์นี้ ไม่แนบภาพไปใน prompt หรือ checkpoint','Center-cropped to 384 × 384; stored on this device, excluded from prompts and checkpoints.')}</p><button type="button" data-npc-image-remove>${l('ลบภาพในขอบเขตนี้','Remove portrait in this scope')}</button><p data-npc-image-status role="status"></p>`);
        const error=e=>{if(dialog.isConnected)dialog.querySelector('.vc-review-error').textContent=e.message;};
        on(dialog.querySelector('[data-npc-scope]'),'change',async e=>{
            if(uploadBusy){e.target.value=scope(id);return;}
            const selected=e.target.value, oldScope=scope(id);e.target.disabled=true;
            try{assertCurrent(chatId);const oldKey=imageKey(id), blob=await media.get(oldKey);assertCurrent(chatId);
                const targetKey=JSON.stringify([current.owner,selected==='character'?'character':current.id,id]);
                if(blob)await media.set(targetKey,blob);assertCurrent(chatId);
                current.npcScopes[id]=selected;
                if(selected==='character'){lib()[id]=copy(p);current.npcPublished[id]=digest(p);}else{delete lib()[id];delete current.npcPublished[id];}
                getContext().saveSettingsDebounced();epoch++;changed();manage(id);
            }catch(err){e.target.value=oldScope;e.target.disabled=false;error(err);}
        });
        on(dialog.querySelector('[data-npc-image]'),'change',async e=>{
            const file=e.target.files[0];if(!file || uploadBusy)return;
            uploadBusy=true;e.target.disabled=true;const expectedKey=imageKey(id);
            try{assertCurrent(chatId);const blob=await optimizePortrait(file,doc);assertCurrent(chatId);if(imageKey(id)!==expectedKey)throw new Error('Scope changed. Choose the image again.');await media.set(expectedKey,blob);assertCurrent(chatId);epoch++;render();dialog.querySelector('[data-npc-image-status]').textContent=l('บันทึกภาพแล้ว','Portrait saved.');}
            catch(err){error(err);}finally{uploadBusy=false;e.target.disabled=false;e.target.value='';}
        });
        on(dialog.querySelector('[data-npc-image-remove]'),'click',async()=>{
            if(uploadBusy)return;try{assertCurrent(chatId);await media.set(imageKey(id),null);assertCurrent(chatId);epoch++;render();dialog.querySelector('[data-npc-image-status]').textContent=l('ลบภาพแล้ว','Portrait removed.');}catch(err){error(err);}
        });
    }
    on(doc,'click',e=>{const button=e.target.closest('[data-npc-open]');if(button)try{manage(button.dataset.npcOpen);}catch{/* Stale UI is inert. */}});
    return {reconcile,render,list,clean,reset(){epoch++;visible.disconnect();media.release();clean();},destroy(){abort.abort();visible.disconnect();clean();media.destroy().catch(()=>{});}};
}
