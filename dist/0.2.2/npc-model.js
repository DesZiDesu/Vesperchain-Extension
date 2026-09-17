// Complete NPC identity schema, independent of UI and storage.
export const NPC_FIELDS = ['name', 'role', 'age', 'pronouns', 'species', 'appearance', 'personality', 'background', 'goals', 'relationship', 'status', 'location'];
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export const npcId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id) && !forbidden.has(id);
const roleOnly = /^(?:(?:the|an?)\s+)?(?:inn\s*keeper|shop\s*keeper|merchant|guard|bartender|narrator|stranger|unknown|เจ้าของ(?:โรงเตี๊ยม|ร้าน)|พ่อค้า|แม่ค้า|ทหารยาม|คนแปลกหน้า)$/iu;
export function validateNpc(value) {
    if (!value || Array.isArray(value) || typeof value !== 'object' || !npcId(value.id)) throw new Error('NPC needs a stable ID.');
    if (Object.keys(value).some(k => !['id', ...NPC_FIELDS].includes(k))) throw new Error('Unknown NPC field.');
    for (const key of NPC_FIELDS) {
        if (!(key in value)) throw new Error(`NPC ${value.id}: missing ${key}. Supply every field; use null for undisclosed facts.`);
        if (value[key] !== null && (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > (key === 'name' ? 120 : 1000))) throw new Error(`Invalid NPC ${key}.`);
    }
    if (!value.name || roleOnly.test(value.name.trim()) || value.name.trim().toLocaleLowerCase() === value.role?.trim().toLocaleLowerCase()) throw new Error('NPC name must be a personal name, not a job or title.');
    return Object.fromEntries(['id', ...NPC_FIELDS].map(k => [k, typeof value[k] === 'string' ? value[k].trim() : value[k]]));
}

// Delimiters mark speaker passages, not executable HTML. Malformed passages fall back to native chat.
export function speakerSegments(raw) {
    const source = String(raw ?? '').replace(/\s*```vesperchain\s*\n[\s\S]*?```\s*$/, '');
    if (!source.includes('[[vc:')) return null;
    if (source.length > 100000 || source.includes('```')) return null;
    const pattern = /\[\[vc:([a-zA-Z0-9_-]{1,80})\]\]([\s\S]*?)\[\[\/vc\]\]/g;
    let end = 0; const chunks = [];
    for (const match of source.matchAll(pattern)) {
        if (match.index > end) chunks.push({ speaker: null, text: source.slice(end, match.index) });
        if (!npcId(match[1]) || !match[2].trim() || /\[\[\/?vc/.test(match[2])) return null;
        chunks.push({ speaker: match[1], text: match[2].trim() }); end = match.index + match[0].length;
        if (chunks.length > 200) return null;
    }
    if (end < source.length) chunks.push({ speaker: null, text: source.slice(end) });
    if (!end || chunks.some(c => /\[\[\/?vc/.test(c.text))) return null;
    return chunks.filter(c => c.text.trim());
}
export function speechParts(text) {
    // Emphasized actions stay narration even if they mention a quoted word.
    const source = String(text), parts = [];
    const tokens = /\*[^*]+\*|“[^”]+”|「[^」]+」|『[^』]+』|"(?:\\.|[^"\\])+"/g;
    let end = 0;
    const append = (value, quoted) => {
        if (!value.trim()) return;
        const last = parts.at(-1);
        if (last?.quoted === quoted) last.text += '\n\n' + value;
        else parts.push({ text: value, quoted });
    };
    for (const match of source.matchAll(tokens)) {
        append(source.slice(end, match.index), false);
        append(match[0], match[0][0] !== '*');
        end = match.index + match[0].length;
    }
    append(source.slice(end), false);
    return parts;
}
export function groupedSegments(chunks, previous = null) {
    let speaker = previous;
    const separated = chunks.flatMap(c => c.speaker ? speechParts(c.text).map(p => ({text:p.text,speaker:p.quoted ? c.speaker : null})) : [c]);
    return { chunks: separated.map(c => {
        const header = Boolean(c.speaker && c.speaker !== speaker);
        if (c.speaker) speaker = c.speaker;
        return { ...c, header };
    }), lastSpeaker: speaker };
}
