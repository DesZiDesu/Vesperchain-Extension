import { esc, digest, validateSpecies, validateBreeding, speciesId } from './campaign.js';
import { icon } from './icons.js';

export function createWorldUi(getModel, commit, makeDialog, getConfig, doc = document) {
    const abort = new doc.defaultView.AbortController();
    const on = (node, type, fn) => node?.addEventListener(type, fn, { signal: abort.signal });
    const l = (th, en) => getConfig().language === 'th' ? th : en;
    const state = () => getModel().result.state;
    function checkedCommit(input, revision, chat) {
        const model = getModel();
        if (model.current?.id !== chat || model.busy || model.result.state.revision !== revision) throw new Error(l('ข้อมูลเปลี่ยนแล้ว กรุณาเปิดหน้าต่างใหม่', 'The state changed. Reopen this panel.'));
        commit(input);
    }
    const speciesName = id => state().species[id]?.name || l('ยังไม่ทราบ', 'Unknown');
    function lineage(row) {
        return `<article class="vc-record"><div class="vc-record-heading"><h4>${esc(speciesName(row.parentA))} × ${esc(speciesName(row.parentB))} → ${esc(speciesName(row.result))}</h4><span class="vc-tag">${row.status === 'observed' ? l('ยืนยันแล้ว', 'Observed') : l('สมมติฐาน', 'Theory')}</span></div>${row.notes ? `<p>${esc(row.notes)}</p>` : ''}</article>`;
    }
    function speciesPage() {
        const s = state(), rows = Object.values(s.species), crosses = Object.values(s.breeding);
        return `<div class="vc-toolbar"><input type="search" data-species-search placeholder="${l('ค้นหาเผ่าพันธุ์…', 'Search species…')}" aria-label="${l('ค้นหาเผ่าพันธุ์', 'Search species')}"><button type="button" data-species-new>${icon('spark')}${l('เพิ่มเผ่าพันธุ์', 'Add species')}</button><button type="button" data-breeding-new>${l('บันทึกผลการผสม', 'Record lineage')}</button></div><p class="vc-muted">${l('เก็บเผ่าพันธุ์ที่พบ ข้อมูลเฉพาะ และผลการผสมจากเรื่องราว สมมติฐานจะไม่ถูกนับเป็นผลยืนยัน', 'Discoveries, traits and story lineage. Theories are kept separate from observed results.')}</p><div class="vc-npc-list" data-species-list>${rows.map(sp => {
            const related = crosses.filter(r => [r.parentA, r.parentB, r.result].includes(sp.id)), observed = related.filter(r => r.status === 'observed');
            const encounters = [...Object.values(s.entities.npcs), ...Object.values(s.entities.creatures)].filter(r => (r.profile?.species || r.species)?.trim().toLocaleLowerCase() === sp.name.trim().toLocaleLowerCase()).length;
            return `<article class="vc-record" data-species-name="${esc(sp.name.toLocaleLowerCase())}"><h3>${esc(sp.name)}</h3><p>${l(`บันทึก ${encounters} ราย · ผลยืนยัน ${observed.length} รายการ`, `${encounters} recorded individuals · ${observed.length} observed results`)}</p>${sp.description ? `<p>${esc(sp.description)}</p>` : ''}<div class="vc-actions"><button type="button" data-species-open="${esc(sp.id)}">${l('ข้อมูลและสายเลือด', 'Details & lineage')}</button><button type="button" data-species-edit="${esc(sp.id)}">${l('แก้ไข', 'Edit')}</button></div></article>`;
        }).join('') || `<p class="vc-muted">${l('เมื่อพบ NPC หรือสิ่งมีชีวิตที่ระบุเผ่าพันธุ์ ระบบจะเพิ่มเข้าทะเบียนให้อัตโนมัติ', 'Species are indexed automatically from NPC and creature profiles.')}</p>`}</div>${crosses.length ? `<section class="vc-record-section"><h3>${l('ประวัติผลการผสม', 'Lineage history')}</h3><div class="vc-record-list">${crosses.slice().reverse().map(lineage).join('')}</div></section>` : ''}`;
    }
    function speciesDetails(id) {
        const sp = state().species[id]; if (!sp) return;
        const related = Object.values(state().breeding).filter(r => [r.parentA, r.parentB, r.result].includes(id));
        const d = makeDialog(sp.name, `<dl class="vc-npc-fields">${[['description', l('ข้อมูลทั่วไป', 'Description')], ['traits', l('ลักษณะเฉพาะ', 'Traits')], ['habitat', l('ถิ่นที่พบ', 'Habitat')], ['notes', l('บันทึก', 'Notes')]].map(([k,title]) => `<div><dt>${title}</dt><dd>${esc(sp[k]) || '—'}</dd></div>`).join('')}</dl><h3>${l('สายเลือดและผลการผสม', 'Lineage & outcomes')}</h3><div class="vc-record-list">${related.map(lineage).join('') || `<p>${l('ยังไม่มีผลที่บันทึกไว้', 'No recorded results yet.')}</p>`}</div><p class="vc-muted">${l('ผลที่ผ่านมาไม่รับประกันผลครั้งต่อไป ให้ AI ใช้กฎโลกและข้อมูลที่ยืนยันแล้วในแชต', 'Past outcomes do not guarantee another result. The story uses its world rules and confirmed knowledge.')}</p><div class="vc-actions"><button type="button" data-species-edit="${esc(id)}">${l('แก้ไขข้อมูล', 'Edit details')}</button><button type="button" data-breeding-new="${esc(id)}">${l('เพิ่มผลการผสม', 'Add lineage')}</button></div>`);
        return d;
    }
    function editSpecies(id) {
        const { current, result } = getModel(); if (!current) return;
        const existing = result.state.species[id], revision = result.state.revision, chat = current.id;
        const titles = { name: l('ชื่อเผ่าพันธุ์', 'Species name'), description: l('ข้อมูลทั่วไป', 'Description'), traits: l('ลักษณะเฉพาะ', 'Traits'), habitat: l('ถิ่นที่พบ', 'Habitat'), notes: l('บันทึกเพิ่มเติม', 'Notes') };
        const d = makeDialog(existing ? l('แก้ไขเผ่าพันธุ์', 'Edit species') : l('เพิ่มเผ่าพันธุ์', 'Add species'), `<form data-species-form>${Object.entries(titles).map(([key,title]) => `<label class="vc-field">${title}${key === 'name' ? `<input name="${key}" maxlength="120" required value="${esc(existing?.[key] || '')}">` : `<textarea name="${key}" rows="2" maxlength="1500">${esc(existing?.[key] || '')}</textarea>`}</label>`).join('')}<button class="vc-primary" type="submit">${l('บันทึก', 'Save')}</button></form>`);
        on(d.querySelector('form'), 'submit', e => {
            e.preventDefault(); try {
                const values = Object.fromEntries(new doc.defaultView.FormData(e.target)); for (const k in values) values[k] = values[k].trim();
                const species = validateSpecies({ id: existing?.id || speciesId(values.name), ...values });
                checkedCommit({ kind: 'species-upsert', species, expected: digest(existing || null) }, revision, chat); d.close();
            } catch (err) { d.querySelector('.vc-review-error').textContent = err.message; }
        });
    }
    function recordBreeding(preferred) {
        const { current, result } = getModel(); if (!current) return;
        const species = Object.values(result.state.species), revision = result.state.revision, chat = current.id;
        const options = selected => species.map(sp => `<option value="${esc(sp.id)}" ${sp.id === selected ? 'selected' : ''}>${esc(sp.name)}</option>`).join('');
        const d = makeDialog(l('บันทึกสายเลือดและผลการผสม', 'Record lineage & outcome'), species.length ? `<form data-breeding-form><div class="vc-form-grid"><label class="vc-field">${l('เผ่าพันธุ์ต้นทาง A', 'Parent species A')}<select name="parentA">${options(preferred)}</select></label><label class="vc-field">${l('เผ่าพันธุ์ต้นทาง B', 'Parent species B')}<select name="parentB">${options()}</select></label></div><label class="vc-field">${l('เผ่าพันธุ์ที่ได้', 'Result species')}<select name="result"><option value="">${l('ยังไม่ทราบ', 'Unknown')}</option>${options()}</select></label><label class="vc-field">${l('ประเภทข้อมูล', 'Evidence')}<select name="status"><option value="observed">${l('ผลที่ยืนยันแล้ว', 'Observed result')}</option><option value="theory">${l('สมมติฐาน / ยังไม่ทดลอง', 'Theory / untested')}</option></select></label><label class="vc-field">${l('เงื่อนไขและสิ่งที่พบ', 'Conditions & observations')}<textarea name="notes" rows="3" maxlength="1500"></textarea></label><p class="vc-muted">${l('หากเป็นเผ่าพันธุ์ใหม่ ให้เพิ่มในทะเบียนก่อน การบันทึกนี้ไม่สร้างสิ่งมีชีวิตหรือปรับจำนวนในครอบครอง', 'Add new species to the index first. This record does not create an individual or change your possessions.')}</p><button class="vc-primary" type="submit">${l('บันทึกผล', 'Save result')}</button></form>` : `<p>${l('เพิ่มเผ่าพันธุ์ต้นทางในทะเบียนก่อน', 'Add the parent species to the index first.')}</p>`);
        on(d.querySelector('form'), 'submit', e => { e.preventDefault(); try {
            const record = Object.fromEntries(new doc.defaultView.FormData(e.target)); record.result ||= null; record.id = doc.defaultView.crypto.randomUUID(); validateBreeding(record);
            checkedCommit({ kind: 'breeding-add', record }, revision, chat); d.close();
        } catch (err) { d.querySelector('.vc-review-error').textContent = err.message; } });
    }
    function purchaseMarkup(deal, interactive = true) {
        const labels = { offered: l('รอตัดสินใจ', 'Awaiting decision'), awaiting: l('รอ NPC ตอบราคา', 'Awaiting buyer response'), sold: l('ขายสำเร็จ', 'Sold'), declined: l('ไม่ขาย / เจรจาจบ', 'Closed without sale') };
        const { offer } = deal, model = getModel();
        const target = state().entities[offer.kind]?.[offer.entityId];
        const unavailable = offer.kind === 'inventory' ? !target || target.quantity < offer.quantity : target?.owned !== true;
        const canSell = !unavailable && state().resources.silver !== null && !model.busy;
        return `<article class="vc-purchase vc-record" data-purchase-id="${esc(offer.id)}"><div class="vc-record-heading"><span class="vc-eyebrow">${l('ข้อเสนอซื้อ', 'PURCHASE OFFER')}</span><span class="vc-tag">${labels[deal.status]}</span></div><h3>${esc(deal.buyerName)} ${l('ต้องการซื้อ', 'wants to buy')} ${esc(deal.targetName)}</h3><p>${l('จำนวน', 'Quantity')} ${offer.quantity} · ${l('ราคารวม', 'Total price')} <strong class="vc-price">${deal.price.toLocaleString()} silver</strong></p>${offer.terms ? `<p>${esc(offer.terms)}</p>` : ''}${deal.status === 'awaiting' ? `<p>${l('คุณขอราคา', 'Your counteroffer')}: ${deal.requestedPrice.toLocaleString()} silver</p><p class="vc-muted">${l('กลับไปส่งข้อความใน Main Chat เพื่อให้ NPC ตอบข้อเสนอครั้งนี้', 'Send your next Main Chat message for the buyer to respond.')}</p>` : ''}<details><summary>${l('ประวัติการต่อรอง', 'Negotiation history')}</summary>${deal.history.map(step => `<p>${step.by === 'npc' ? esc(deal.buyerName) : l('คุณ', 'You')} · ${esc(step.decision)}${step.price === undefined ? '' : ` · ${step.price.toLocaleString()} silver`}${step.reason ? ` · ${esc(step.reason)}` : ''}</p>`).join('')}</details>${interactive && ['offered', 'awaiting'].includes(deal.status) ? `<div class="vc-actions">${deal.status === 'offered' ? `<button type="button" class="vc-primary" data-purchase-review="sell" data-purchase="${esc(offer.id)}" ${canSell ? '' : 'disabled'}>${l('ขายที่ราคานี้', 'Sell at this price')}</button><button type="button" data-purchase-review="counter" data-purchase="${esc(offer.id)}" ${model.busy || unavailable ? 'disabled' : ''}>${l('ต่อรองราคา', 'Counteroffer')}</button>` : ''}<button type="button" data-purchase-review="decline" data-purchase="${esc(offer.id)}" ${model.busy ? 'disabled' : ''}>${l('ไม่ขาย', 'Do not sell')}</button></div>${deal.status === 'offered' && !canSell ? `<p class="vc-muted">${l('ตรวจยอดเงินและของในครอบครองก่อนขาย', 'Confirm your balance and available possessions before selling.')}</p>` : ''}` : ''}</article>`;
    }
    function purchasesPage() {
        const deals = Object.values(state().purchases), open = deals.filter(d => ['offered', 'awaiting'].includes(d.status)), past = deals.filter(d => !['offered', 'awaiting'].includes(d.status));
        return open.map(d => purchaseMarkup(d)).join('') + (past.length ? `<details class="vc-disclosure"><summary>${l('การซื้อขายที่จบแล้ว', 'Closed negotiations')} (${past.length})</summary>${past.map(d => purchaseMarkup(d, false)).join('')}</details>` : '') || `<div class="vc-empty-state"><h3>${l('ยังไม่มีข้อเสนอซื้อ', 'No purchase offers yet')}</h3><p>${l('เมื่อ NPC ขอซื้อไอเทม สัตว์ หรือบุคคลที่คุณมีในครอบครอง ข้อเสนอจะปรากฏที่นี่และใน Main Chat', 'NPC offers for your items, creatures or owned individuals appear here and in Main Chat.')}</p></div>`;
    }
    function reviewPurchase(kind, id) {
        const { current, result, busy } = getModel(); if (!current || busy) return;
        const deal = result.state.purchases[id]; if (!deal) return;
        const revision = result.state.revision, chat = current.id;
        const d = makeDialog(l('ตรวจข้อเสนอซื้อ', 'Review purchase offer'), `${purchaseMarkup(deal, false)}${kind === 'counter' ? `<label class="vc-field">${l('ราคารวมที่ต้องการ (silver)', 'Your total asking price (silver)')}<input type="number" data-bid-price min="1" max="1000000000" step="1" value="${deal.price}"></label><p>${l('บันทึกราคาที่ขอ แล้วส่งข้อความใน Main Chat เพื่อให้ NPC ตอบ ไม่มีการเรียก AI เพิ่มอัตโนมัติ', 'Save your bid, then send a Main Chat message for a response. No automatic extra AI request.')}</p>` : kind === 'sell' ? `<p>${l('เมื่อยืนยัน ระบบจะโอนของและรับเงินพร้อมกัน', 'Confirm to transfer the possession and receive payment together.')}</p>` : ''}<button class="vc-primary" type="button" data-confirm-purchase>${kind === 'counter' ? l('ยืนยันราคาที่ขอ', 'Confirm counteroffer') : kind === 'sell' ? l('ยืนยันขายและรับเงิน', 'Confirm sale & payment') : l('ยืนยันไม่ขาย', 'Confirm no sale')}</button>`);
        on(d.querySelector('[data-confirm-purchase]'), 'click', () => { try {
            checkedCommit({ kind: `purchase-${kind}`, purchaseId: id, expected: digest(deal), offerAnchor: deal.anchor, ...(kind === 'counter' ? { price: Number(d.querySelector('[data-bid-price]').value) } : {}) }, revision, chat); d.close();
            if (kind === 'counter') {
                const composer = doc.getElementById('send_textarea');
                if (composer && !composer.value.trim()) { composer.value = l(`ฉันขอต่อรองราคารวมของ ${deal.targetName} เป็น ${Number(d.querySelector('[data-bid-price]').value)} silver`, `I counteroffer ${Number(d.querySelector('[data-bid-price]').value)} silver total for ${deal.targetName}.`); composer.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true })); }
            }
        } catch (err) { d.querySelector('.vc-review-error').textContent = err.message; } });
    }
    function moneyMarkup(rows) {
        return `<div class="vc-money-list">${rows.map(tx => `<article class="vc-money" data-money-id="${esc(tx.id)}" data-direction="${tx.silverDelta > 0 ? 'in' : 'out'}"><span class="vc-money-icon">${icon(tx.silverDelta > 0 ? 'arrow' : 'gem')}</span><div><span>${tx.silverDelta > 0 ? l('เงินเข้า', 'Money received') : l('เงินออก', 'Money spent')}</span><p>${esc(tx.source === 'balance' ? l('ยอดเงินเปลี่ยนแปลง', 'Balance adjustment') : tx.reason)}</p></div><strong>${tx.silverDelta > 0 ? '+' : '−'}${Math.abs(tx.silverDelta).toLocaleString()}<small> silver</small></strong></article>`).join('')}</div>`;
    }
    on(doc, 'input', e => { if (e.target.matches('[data-species-search]')) { const query = e.target.value.toLocaleLowerCase(); doc.querySelectorAll('[data-species-name]').forEach(n => n.hidden = !n.dataset.speciesName.includes(query)); } });
    on(doc, 'click', e => {
        const root = e.target.closest('.vc-root'); if (!root) return;
        try {
            const open = e.target.closest('[data-species-open]'), edit = e.target.closest('[data-species-edit]'), add = e.target.closest('[data-species-new]'), breeding = e.target.closest('[data-breeding-new]'), buy = e.target.closest('[data-purchase-review]');
            if (open) speciesDetails(open.dataset.speciesOpen); if (edit) editSpecies(edit.dataset.speciesEdit); if (add) editSpecies(); if (breeding) recordBreeding(breeding.dataset.breedingNew); if (buy) reviewPurchase(buy.dataset.purchaseReview, buy.dataset.purchase);
        } catch (err) { makeDialog(l('ตรวจข้อมูลก่อนทำรายการ', 'Review required'), `<p>${esc(err.message)}</p>`); }
    });
    return { speciesPage, purchasesPage, purchaseMarkup, moneyMarkup, destroy() { abort.abort(); } };
}
