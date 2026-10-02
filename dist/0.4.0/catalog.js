// Navigation describes available views, never starting values or simulated mechanics.
export const DECKS = [
    { id: 'chronicle', th: 'ภาพรวม', en: 'Overview', icon: 'book', pages: ['home', 'character'] },
    { id: 'domain', th: 'สิ่งมีชีวิตและคลัง', en: 'Collection', icon: 'castle', pages: ['stock', 'research'] },
    { id: 'commerce', th: 'การค้า', en: 'Commerce', icon: 'scales', pages: ['contracts', 'purchases', 'ledger'] },
    { id: 'world', th: 'โลกและผู้คน', en: 'World', icon: 'compass', pages: ['npc', 'species', 'codex'] },
    { id: 'system', th: 'บันทึกและตั้งค่า', en: 'Settings & saves', icon: 'gear', pages: ['recovery', 'settings'] },
];
// Thai / English title and description.
export const PAGES = {
    home: ['ภาพรวม', 'Overview', 'ฉากปัจจุบันและสิ่งที่ต้องติดตาม', 'Your current scene and what needs attention.'],
    character: ['ตัวละคร', 'Character', 'ทรัพยากรและการเติบโตของตัวละคร', 'Your character’s resources and progression.'],
    stock: ['ทะเบียนและคลัง', 'Collection', 'สิ่งมีชีวิต ไอเทม และสถานที่ดูแล', 'Creatures, inventory and their facilities.'],
    research: ['งานวิจัยและฝึก', 'Research & training', 'โครงการที่บันทึกจากเรื่องราว', 'Projects recorded during the story.'],
    contracts: ['สัญญา', 'Contracts', 'ข้อเสนอ งานที่รับ และการส่งมอบ', 'Offers, accepted work and handovers.'],
    purchases: ['ข้อเสนอซื้อ', 'Purchase offers', 'ผู้ซื้อ ราคา และการต่อรอง', 'Buyers, prices and negotiations.'],
    species: ['เผ่าพันธุ์', 'Species index', 'เผ่าพันธุ์ที่พบและประวัติผลการผสม', 'Discovered species and recorded lineage.'],
    ledger: ['บัญชีและกิจการ', 'Ledger & business', 'เงิน การซื้อขาย และสาขา', 'Money, transactions and branches.'],
    npc: ['ผู้คน', 'People', 'ตัวละครที่พบและภาพบุคคล', 'The people you have met and their portraits.'],
    codex: ['บันทึกโลก', 'World journal', 'ความรู้ กลุ่ม และเส้นทางที่ค้นพบ', 'Discovered knowledge, factions and routes.'],
    recovery: ['จุดบันทึก', 'Checkpoints', 'บันทึกเรื่องราวและเล่นต่อในแชตใหม่', 'Save your story and continue in a new chat.'],
    settings: ['ตั้งค่า', 'Settings', 'รูปลักษณ์ ภาษา และการแสดงผล', 'Appearance, language and presentation.'],
};
