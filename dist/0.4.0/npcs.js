import { esc, digest, copy } from './campaign.js';
import { NPC_FIELDS, validateNpc, speakerSegments, groupedSegments, speechParts } from './npc-model.js';
import { optimizePortrait, portraitStore } from './portraits.js';
import { choosePortraitCrop } from './portrait-editor.js';
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
export function createNpcs(getContext, getConfig, getModel, changed, makeDialog, commit, doc = document) {
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
            if(!body || message?.is_user || message?.is_system || !frame || node.querySelector('.mes_edit_textarea')){clean(node);last=null;continue;}
            const cache=renderCache.get(node), incoming=last;
            const preferences=`${epoch}:${config.npcPortraits}:${config.narrativeHeaders}:${config.language}`;
            if(cache && cache.frame===frame && cache.body===body && cache.view.isConnected && cache.incoming===incoming && cache.preferences===preferences){body.classList.add('vc-npc-original');last=cache.last;continue;}
            let chunks=speakerSegments(message.mes);
            const profiles=frame.npcs || {};
            // Plain narration also gets a folio; never guess a speaker for unlabelled quotes.
            const plain=String(message.mes).replace(/\s*```vesperchain\s*\n[\s\S]*?```\s*$/, '').trim();
            if(!chunks && config.narrativeHeaders && plain && plain.length<=100000 && !/\[\[\/?vc|```/.test(plain) && !speechParts(plain).some(p=>p.quoted))chunks=[{speaker:null,text:plain}];
            if(!chunks){clean(node);if(message.mes.includes('[[vc:'))last=null;continue;}
            // Presentation can recover without trusting rejected profiles or guessing identities.
            if (frame.status === 'rejected' || chunks.some(c => c.speaker && !profiles[c.speaker]?.profile)) {
                chunks = chunks.map(c => ({ speaker: null, text: c.text }));
                last = null;
            }
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
    const fieldLabels = () => ({ name:l('ชื่อบุคคล','Personal name'), role:l('บทบาท / อาชีพ','Role / occupation'), age:l('อายุ','Age'), pronouns:l('สรรพนาม','Pronouns'), species:l('เผ่าพันธุ์','Species'), appearance:l('รูปลักษณ์','Appearance'), personality:l('นิสัย','Personality'), background:l('ภูมิหลัง','Background'), goals:l('เป้าหมาย','Goals'), relationship:l('ความสัมพันธ์','Relationship'), status:l('สถานะปัจจุบัน','Current status'), location:l('สถานที่','Location') });
    function list() {
        const rows=Object.values(getModel().result.state.entities.npcs), species=[...new Set(rows.map(r=>r.profile?.species).filter(Boolean))];
        return `<div class="vc-toolbar"><input type="search" data-npc-search placeholder="${l('ค้นหา NPC…','Search NPCs…')}" aria-label="${l('ค้นหา NPC','Search NPCs')}"><select data-npc-filter aria-label="${l('กรองเผ่าพันธุ์','Filter species')}"><option value="">${l('ทุกเผ่าพันธุ์','All species')}</option>${species.map(sp=>`<option value="${esc(sp)}">${esc(sp)}</option>`).join('')}</select><button type="button" class="vc-primary" data-npc-new>${icon('spark')}${l('สร้าง NPC','Create NPC')}</button><label class="vc-import-label">${l('นำเข้าโปรไฟล์','Import profile')}<input type="file" data-npc-import accept="application/json,.json"></label></div><p class="vc-muted">${l('สร้างและแก้โปรไฟล์ได้เอง ช่องว่างคือข้อมูลที่ยังไม่เปิดเผย','Create and edit profiles yourself. Blank fields mean undisclosed facts.')}</p><div class="vc-npc-list">${rows.map(row=>`<article class="vc-record vc-npc-card" data-npc-searchable="${esc((row.name+' '+(row.profile?.role||'')).toLocaleLowerCase())}" data-npc-species="${esc(row.profile?.species||'')}"><div class="vc-record-heading"><h3>${esc(row.name)}</h3>${row.owned?`<span class="vc-tag">${l('ในครอบครอง','In possession')}</span>`:''}</div>${row.profile?.species?`<p>${esc(row.profile.species)}</p>`:''}${row.profile?.role||row.status?`<p>${esc(row.profile?.role||row.status)}</p>`:''}<div class="vc-actions"><button type="button" data-npc-open="${esc(row.id)}">${icon('book')}${l('ข้อมูลและภาพ','Profile & portrait')}</button><button type="button" data-npc-edit="${esc(row.id)}">${l('แก้ไข','Edit')}</button><button type="button" data-npc-copy="${esc(row.id)}">${l('ทำสำเนา','Duplicate')}</button></div>${!row.profile?`<p>${l('โปรไฟล์ยังไม่ครบ กดแก้ไขเพื่อเติมข้อมูล','Incomplete profile. Edit to supply its identity.')}</p>`:''}</article>`).join('')||`<div class="vc-empty-state"><h3>${l('ยังไม่มี NPC','No NPCs yet')}</h3><p>${l('กดสร้าง NPC หรือพบผู้คนใน Main Chat เพื่อเริ่มทะเบียน','Create a profile or meet people in Main Chat to start your roster.')}</p></div>`}</div>`;
    }
    function edit(id, source=null) {
        const {current,result}=getModel();if(!current)return;assertCurrent(current.id);
        const row=result.state.entities.npcs[id], original=source||row?.profile, labels=fieldLabels(), chat=current.id, revision=result.state.revision;
        const stableId=row?.id || win.crypto.randomUUID();
        const d=makeDialog(row?l('แก้ไข NPC','Edit NPC'):l('สร้าง NPC','Create NPC'),`<form data-npc-form><p class="vc-muted">${l('กรอกชื่อบุคคล ช่องอื่นเว้นว่างได้หากยังไม่ทราบ','Enter a personal name. Leave undisclosed fields blank.')}</p><div class="vc-form-grid">${NPC_FIELDS.map(k=>`<label class="vc-field">${labels[k]}${['appearance','personality','background','goals','relationship'].includes(k)?`<textarea name="${k}" rows="2" maxlength="1000">${esc(original?.[k]||'')}</textarea>`:`<input name="${k}" maxlength="${k==='name'?120:1000}" ${k==='name'?'required':''} value="${esc(original?.[k]|| (k==='name'?row?.name||'':''))}">`}</label>`).join('')}</div><label class="vc-option"><span>${l('บุคคลนี้อยู่ในครอบครองของตัวละคร','This individual is in your character’s possession')}<small>${l('ระบุแยกจาก NPC ที่เพียงพบในเรื่อง เพื่อใช้ตรวจข้อเสนอซื้อ','Separate possession from a person merely met in the story.')}</small></span><input name="owned" type="checkbox" ${row?.owned?'checked':''}></label><p class="vc-muted">ID: ${esc(stableId)}</p><button class="vc-primary" type="submit">${l('บันทึกโปรไฟล์','Save profile')}</button></form>`);
        on(d.querySelector('form'),'submit',e=>{e.preventDefault();try{
            assertCurrent(chat);if(getModel().result.state.revision!==revision)throw new Error(l('โปรไฟล์เปลี่ยนแล้ว กรุณาเปิดใหม่','State changed. Reopen this form.'));
            const data=new win.FormData(e.target), profile=validateNpc({id:stableId,...Object.fromEntries(NPC_FIELDS.map(k=>[k,data.get(k).trim()||null]))});
            commit({kind:'npc-upsert',profile,owned:data.has('owned'),expected:digest(row||null)});d.close();
        }catch(err){d.querySelector('.vc-review-error').textContent=err.message;}});
    }
    function exportProfile(id) {
        const profile=getModel().result.state.entities.npcs[id]?.profile;if(!profile)return;
        const url=win.URL.createObjectURL(new win.Blob([JSON.stringify(profile,null,2)],{type:'application/json'})), a=doc.createElement('a');a.href=url;a.download=`npc-${id}.json`;a.click();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
    }
    function manage(id) {
        const {current,result}=getModel();if(!current)return;assertCurrent(current.id);
        const row=result.state.entities.npcs[id];if(!row)return;
        const chatId=current.id, p=row.profile;
        const dialog=makeDialog(row.name,`<div class="vc-actions"><button type="button" data-npc-edit="${esc(id)}">${l('แก้ไขโปรไฟล์','Edit profile')}</button>${p?`<button type="button" data-npc-export="${esc(id)}">${l('ส่งออกโปรไฟล์','Export profile')}</button>`:''}</div>${p?`<dl class="vc-npc-fields">${NPC_FIELDS.map(k=>`<div><dt>${fieldLabels()[k]}</dt><dd>${esc(p[k]??l('ยังไม่เปิดเผย','Undisclosed'))}</dd></div>`).join('')}</dl>`:`<p>${l('โปรไฟล์เดิมยังไม่ครบ ให้ AI ส่ง npcProfiles ให้ครบก่อน','Legacy profile is incomplete. Ask the AI to supply every npcProfiles field.')}</p>`}<label class="vc-field">${l('ขอบเขตของ NPC นี้','This NPC’s scope')}<select data-npc-scope ${!p?'disabled':''}><option value="chat" ${scope(id)==='chat'?'selected':''}>Chat</option><option value="character" ${scope(id)==='character'?'selected':''}>Character</option></select></label><p>${l('Character ใช้เป็นข้อมูลเริ่มต้นของแชตใหม่ ไม่เขียนทับประวัติแชตอื่น การเปลี่ยนขอบเขตจะคัดลอกภาพไปด้วย','Character seeds new chats without rewriting other chat histories. Changing scope also copies the portrait.')}</p><label class="vc-field">${l('ภาพบุคคล · PNG / JPEG ไม่เกิน 6 MB','Portrait · PNG / JPEG up to 6 MB')}<input type="file" data-npc-image accept="image/png,image/jpeg"></label><p>${l('ลากและบีบซูมก่อนบันทึกเป็น 384 × 384 ภาพเก็บในอุปกรณ์นี้ ไม่แนบใน prompt หรือ checkpoint','Drag and pinch before saving at 384 × 384; stored on this device, excluded from prompts and checkpoints.')}</p><button type="button" data-npc-image-remove>${l('ลบภาพในขอบเขตนี้','Remove portrait in this scope')}</button><p data-npc-image-status role="status"></p>`);
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
            try{assertCurrent(chatId);dialog.querySelector('.vc-review-error').textContent='';const blob=await optimizePortrait(file,doc,img=>{assertCurrent(chatId);return dialog.isConnected && dialog.open ? choosePortraitCrop(img,dialog,l) : null;});if(!blob)return;assertCurrent(chatId);if(imageKey(id)!==expectedKey)throw new Error('Scope changed. Choose the image again.');await media.set(expectedKey,blob);assertCurrent(chatId);epoch++;render();dialog.querySelector('[data-npc-image-status]').textContent=l('บันทึกภาพแล้ว','Portrait saved.');}
            catch(err){error(err);}finally{uploadBusy=false;e.target.disabled=false;e.target.value='';}
        });
        on(dialog.querySelector('[data-npc-image-remove]'),'click',async()=>{
            if(uploadBusy)return;try{assertCurrent(chatId);await media.set(imageKey(id),null);assertCurrent(chatId);epoch++;render();dialog.querySelector('[data-npc-image-status]').textContent=l('ลบภาพแล้ว','Portrait removed.');}catch(err){error(err);}
        });
    }
    on(doc,'input',e=>{if(e.target.matches('[data-npc-search],[data-npc-filter]')){const root=e.target.closest('.vc-root'),query=root.querySelector('[data-npc-search]').value.toLocaleLowerCase(),sp=root.querySelector('[data-npc-filter]').value;root.querySelectorAll('[data-npc-searchable]').forEach(n=>n.hidden=!n.dataset.npcSearchable.includes(query)||(sp&&n.dataset.npcSpecies!==sp));}});
    on(doc,'change',async e=>{if(!e.target.matches('[data-npc-import]'))return;try{const file=e.target.files[0];if(!file)return;if(file.size>20000)throw new Error('NPC profile exceeds 20 KB.');const chat=getModel().current?.id;const profile=validateNpc(JSON.parse(await file.text()));assertCurrent(chat);edit(null,{...profile,id:win.crypto.randomUUID()});}catch(err){makeDialog(l('นำเข้าไม่ได้','Import failed'),`<p>${esc(err.message)}</p>`);}});
    on(doc,'click',e=>{if(!e.target.closest('.vc-root')&&!e.target.closest('#chat'))return;try{const button=e.target.closest('[data-npc-open]'),change=e.target.closest('[data-npc-edit]'),add=e.target.closest('[data-npc-new]'),clone=e.target.closest('[data-npc-copy]'),exportButton=e.target.closest('[data-npc-export]');if(button)manage(button.dataset.npcOpen);if(change)edit(change.dataset.npcEdit);if(add)edit();if(clone){const p=getModel().result.state.entities.npcs[clone.dataset.npcCopy]?.profile;if(p)edit(null,p);}if(exportButton)exportProfile(exportButton.dataset.npcExport);}catch(err){makeDialog(l('เปิดโปรไฟล์ไม่ได้','Profile unavailable'),`<p>${esc(err.message)}</p>`);}});
    return {reconcile,render,list,clean,reset(){epoch++;visible.disconnect();media.release();clean();},destroy(){abort.abort();visible.disconnect();clean();media.destroy().catch(()=>{});}};
}
