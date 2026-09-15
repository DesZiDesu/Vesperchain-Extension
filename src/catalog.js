// Read-only interface content. This is not authoritative campaign state.
export const DECKS = [
    { id: 'chronicle', th: 'บันทึกชีวิต', en: 'Chronicle', icon: 'book', pages: ['home', 'scene', 'character'] },
    { id: 'domain', th: 'ร้านและวิจัย', en: 'Domain', icon: 'castle', pages: ['shop', 'stock', 'research'] },
    { id: 'commerce', th: 'การค้า', en: 'Commerce', icon: 'scales', pages: ['ledger', 'contracts', 'auction', 'branches'] },
    { id: 'world', th: 'โลกภายนอก', en: 'Avarenth', icon: 'compass', pages: ['travel', 'time', 'npc', 'codex'] },
    { id: 'system', th: 'ระบบ', en: 'Sanctum', icon: 'gear', pages: ['recovery', 'settings'] },
];
// [Thai, English, Thai description, English description, read-only reference facts]
export const PAGES = {
    home: ['ภาพรวม', 'Overview', 'ทุกเรื่องราวเริ่มต้นด้วยหน้ากระดาษที่ยังว่างเปล่า', 'Every story begins with an unwritten page.', []],
    scene: ['ฉากและบทสนทนา', 'The living world', 'คำพูดและการตัดสินใจยังคงเป็นของคุณ', 'Your words. Your decisions. Your story.', ['Cinder Quay · Vespergate', 'ใช้แชตหลักของ SillyTavern เพื่อเล่าเรื่อง / Continue in SillyTavern Main Chat']],
    character: ['ตัวละคร', 'The protagonist', 'ตัวตน ภูมิหลัง และการเติบโต', 'Identity, origin, and progression.', ['ค่าเริ่มต้นอ้างอิง / Starter reference', 'HP 100 · Stamina 100 · Mana 30', 'Level 1 · XP 0 / 100']],
    shop: ['ร้านและคอก', 'The menagerie', 'พื้นที่สำหรับกิจการที่กำลังจะถือกำเนิด', 'A home for an enterprise yet to be born.', ['ร้านเริ่มต้น / Starter shop: 4 standard pens', 'Quarantine bay · 200 silver · 2 days', 'Workshop · 350 silver · 4 days']],
    stock: ['ทะเบียนและคลัง', 'The collection', 'ทุกสิ่งมีที่มา ทุกชีวิตมีตัวตน', 'Every object has a provenance. Every life, an identity.', ['Stable individual IDs · Condition · Location', 'Trust / Stress / Training tracked separately', 'Starter reference: 1 net · 2 crates · 7 ration-days']],
    research: ['ฝึกและวิจัย', 'The alchemy of knowledge', 'ค้นคว้า ฝึกฝน และดูแลวงจรชีวิต', 'Research, training, and careful cultivation.', ['Rank I research reference · 3 days / 40 silver', 'Setup 60 silver · Incubation 14 days', 'Maturation 30 more days · Nonsapient beasts only']],
    ledger: ['บัญชี', 'The black ledger', 'บันทึกสิ่งที่เกิดขึ้น ไม่ใช่สิ่งที่ถูกสัญญา', 'Record what happened, not what was promised.', ['Starting cash reference · 800 silver', '10 copper = 1 silver · 100 silver = 1 gold', 'Quotes, escrow, and settled payments remain separate']],
    contracts: ['สัญญา', 'Oaths & obligations', 'ทุกข้อตกลงมีเงื่อนไขและผลที่ตามมา', 'Every agreement has terms and consequences.', ['Starter offer · Live slime relocation · 120 silver / 25 XP', 'Mara’s lost crate · 3 days · 90 silver / 20 XP', '10 woodland silk spools · 10 days · 240 silver / 40 XP']],
    auction: ['ตลาดและประมูล', 'The veiled exchange', 'ราคาประเมิน ข้อเสนอ และการชำระจริง', 'Appraisals, offers, and settled sales.', ['Rank I reference · 80–180 silver', 'Auction commission · 10%, rounded up', 'Transfer only after confirmed payment']],
    branches: ['สาขาและคาราวาน', 'Beyond the first door', 'เส้นทางการค้าที่เชื่อมเมืองเข้าด้วยกัน', 'Trade routes that bind distant cities.', ['Thornmere permit · 600 silver', 'Premises, staff, security, and reserves are additional', 'Caravans consume travel time and cargo capacity']],
    travel: ['สำรวจและเดินทาง', 'Roads of Avarenth', 'การเดินทางมีต้นทุน และระยะทางมีความหมาย', 'Every journey has a cost. Distance matters.', ['From Vespergate · Fair-weather wagon routes', 'Thornmere · 4 days / Cinderhold · 6 days', 'Namar · 9 days / Frosthallow · 12 days']],
    time: ['เวลาและรายจ่าย', 'The turning year', 'เวลาผ่านไปตามการกระทำที่เสร็จสิ้น', 'Time advances through resolved actions.', ['12 months · 30 days each · 7-day week', 'Starter rent reference · 30 silver every 7 days, first due Day 8', 'Feed reference · Rank I: 2 / II: 6 / III: 18 silver per day']],
    npc: ['บุคคลและกลุ่มอำนาจ', 'Faces & allegiances', 'ชื่อเสียง ความไว้ใจ และความลับที่ยังไม่ถูกเปิดเผย', 'Reputation, trust, and secrets yet to be discovered.', ['Mara Vey · Broken Scale proprietor', 'Seren Thornveil · Field naturalist', 'Reputation −100…100 / Local heat 0…100']],
    codex: ['สารานุกรม', 'The veiled archive', 'เรื่องเล่าของโลกที่กว้างกว่าแผนที่', 'A world greater than its maps.', ['Lorebook reference · 280 entries', '32 World · 22 Rules · 6 Core species', '220 catalogue names include lineages, variants, and occupations']],
    recovery: ['เซฟและย้อนสถานะ', 'Threads of continuity', 'พื้นที่สำหรับประวัติเหตุการณ์และความต่อเนื่อง', 'A place for history and continuity.', ['Campaign storage is not connected in v0.1', 'No game transactions or chat messages are changed', 'Interface preferences are saved in SillyTavern']],
    settings: ['ตั้งค่า', 'The artisan’s chamber', 'ปรับแต่งรายละเอียดให้เป็นของคุณ', 'Make every detail your own.', []],
};
