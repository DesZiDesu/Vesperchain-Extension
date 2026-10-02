import { PAGES } from './catalog.js';

// Player instructions describe the shipped mechanics. Reading never invokes tracking or generation.
export const GUIDE_CHAPTERS = [
    {
        id: 'start', title: ['เริ่มเล่นใน 3 ขั้นตอน', 'Start in three steps'],
        intro: ['เล่นเรื่องราวใน Main Chat แล้วใช้ The Black Ledger ดูสิ่งที่เกิดขึ้นและตัดสินใจเรื่องสำคัญ', 'Play the story in Main Chat, then use The Black Ledger to review events and make important decisions.'],
        steps: [
            ['เลือกตัวละครและเปิดแชต จากนั้นไปที่ Extensions → Vesperchain → ทั่วไป เปิด Vesperchain และ “ติดตามแชตของตัวละครนี้”', 'Select a character and open a chat. In Extensions → Vesperchain → General, enable Vesperchain and “Track this character’s chats”.'],
            ['เปิด “ส่งสถานะและกติกาติดตามให้ AI” ไว้ แล้วส่งข้อความเล่นตามปกติ รอให้ AI ตอบจบ', 'Keep “Include tracking protocol in Main Chat” on. Send a normal roleplay message and wait for the AI to finish.'],
            ['เปิด Vesperchain จาก Wand menu หรือปุ่มใน Extensions ตรวจฉากและสถานะที่หน้า “ภาพรวม” แล้วกลับไปเล่นต่อในแชต', 'Open Vesperchain from the Wand menu or Extensions. Check Overview for your scene and state, then continue in chat.'],
        ],
        tip: ['แชตใหม่เริ่มสถานะใหม่ ถ้ายังไม่ทราบเงินหรือค่าสถานะ ช่องนั้นจะว่างจนกว่าจะมีข้อมูลยืนยัน', 'New chats start fresh. Unknown money and resources stay undisclosed until confirmed.'],
        example: ['เริ่มเรื่องที่ท่าเรือยามค่ำ ตัวละครของฉันมีเงิน 100 silver และกำลังมองหางาน', 'Begin at the docks at night. My character has 100 silver and is looking for work.'],
        pages: ['home', 'settings'],
    },
    {
        id: 'chat', title: ['แชตกับสมุดบันทึกทำงานร่วมกันอย่างไร', 'How chat and the ledger work together'],
        intro: ['คำตอบ AI เป็นเรื่องราว ส่วนเสริมเก็บข้อมูลที่ตรวจผ่านแล้วมาแสดงเป็น UI', 'The AI reply tells the story. The extension displays the updates that pass validation.'],
        steps: [
            ['เดินทาง สำรวจ สนทนา หรือดำเนินงานผ่าน Main Chat ใช้ข้อความธรรมดา ไม่ต้องเขียนคำสั่งพิเศษ', 'Travel, explore, talk and work through Main Chat using ordinary text. No special command syntax is required.'],
            ['เมื่อคำตอบจบ ฉาก เงิน ไอเทม และข้อมูลใหม่จะอัปเดตเมื่อ AI ส่งข้อมูลติดตามที่ถูกต้องมา ถ้าไม่มีข้อมูลใหม่ ระบบคงสถานะเดิม', 'After the reply finishes, valid tracking updates can change the scene, money, items and discoveries. A reply without an update keeps the previous state.'],
            ['ภาพรวมและตัวละครใช้ตรวจสถานะ สิ่งมีชีวิตและคลังใช้ดูของ การค้าใช้ดูสัญญาและข้อเสนอซื้อ โลกและผู้คนใช้ดู NPC เผ่าพันธุ์ และบันทึกโลก', 'Overview and Character show state; Collection holds possessions; Commerce holds contracts and offers; World holds NPCs, species and discoveries.'],
            ['ฉากอยู่เหนือข้อความ AI ส่วนกรอบ NPC ใบสัญญา ข้อเสนอซื้อ และแจ้งเงินจะปรากฏตามข้อมูลและสวิตช์ที่เปิดไว้', 'Scene strips sit above AI messages. NPC frames, contracts, purchase cards and money notices appear when their data and display switches are available.'],
        ],
        tip: ['การเปิดหน้า UI ไม่ทำให้เวลาเดิน ไม่สุ่มเหตุการณ์ และไม่เรียก AI เพิ่ม ผลลัพธ์ในเรื่องยังขึ้นอยู่กับคำตอบ AI', 'Opening a panel does not advance time, roll events or make an extra AI call. Story outcomes still depend on the AI reply.'],
        example: ['ฉันเดินไปตลาด ถามร้านค้าว่ามีสัตว์หายากอะไรขาย และราคาเท่าไหร่', 'I walk to the market and ask what rare animals are for sale and how much they cost.'],
        pages: ['home', 'character'],
    },
    {
        id: 'npc', title: ['สร้างและจัดการ NPC', 'Create and manage NPCs'],
        intro: ['สร้าง NPC เองได้ตั้งแต่ก่อน AI ตอบ หรือเก็บคนที่พบระหว่างเล่นไว้ในทะเบียน', 'Create an NPC before the first AI reply, or keep people discovered during play in your roster.'],
        steps: [
            ['ไปที่ โลกและผู้คน → ผู้คน กด “สร้าง NPC” ใส่ชื่อบุคคล เผ่าพันธุ์ และข้อมูลที่ต้องการ แล้วตรวจและบันทึก', 'Open World → People → Create NPC. Enter a personal name, species and any known details, then review and save.'],
            ['เว้นช่องที่ยังไม่รู้ได้ ข้อมูลที่เว้นไว้จะเป็นข้อมูลที่ยังไม่เปิดเผย ไม่ถูกเติมเอง', 'Leave unknown fields blank. They remain undisclosed instead of being filled automatically.'],
            ['ใช้ค้นหาชื่อหรือบทบาท กรองเผ่าพันธุ์ และกด “แก้ไข” หรือ “ทำสำเนา” บนการ์ด NPC', 'Search by name or role, filter by species, and use Edit or Duplicate on an NPC card.'],
            ['ส่งออกโปรไฟล์จากหน้าข้อมูล หรือนำเข้าไฟล์ JSON จากหน้าผู้คน การนำเข้าจะเปิดฟอร์มให้ตรวจเพื่อสร้าง NPC ใหม่', 'Export a profile from its detail panel, or import JSON from People. Import opens a review form to create a new NPC.'],
        ],
        tip: ['การพบหรือสร้าง NPC ไม่ได้แปลว่าอยู่ในครอบครอง ช่อง “ในครอบครอง” เป็นสถานะแยกสำหรับเรื่องราวที่มีการถือครองจริง', 'Meeting or creating an NPC does not establish possession. “In possession” is a separate status for individuals actually owned in the story.'],
        example: ['ฉันพบ Elf ชื่อ Mara Vey นักธรรมชาติวิทยาผู้ศึกษาสัตว์ในท่าเรือ และถามถึงงานของเธอ', 'I meet Mara Vey, an Elf naturalist studying dockside creatures, and ask about her work.'],
        pages: ['npc'],
    },
    {
        id: 'portraits', title: ['ภาพ NPC และขอบเขตการเก็บข้อมูล', 'NPC portraits and profile scope'],
        intro: ['ภาพใช้ไฟล์ที่คุณเลือก ส่วนขอบเขตกำหนดว่าจะใช้โปรไฟล์เฉพาะแชตนี้หรือเก็บให้แชตใหม่', 'Portraits use images you choose. Scope controls whether a profile stays in this chat or is available to future chats.'],
        steps: [
            ['เปิด “ข้อมูลและภาพ” ของ NPC หรือกดภาพ NPC ในแชต เลือกอัปโหลด PNG/JPEG ขนาดไม่เกิน 6 MB', 'Open Profile & portrait, or click an NPC portrait in chat. Upload a PNG/JPEG no larger than 6 MB.'],
            ['ลากภาพเพื่อจัดกรอบ บนมือถือใช้นิ้วสองนิ้วซูม แล้วกดใช้ภาพ ยกเลิกเพื่อเก็บภาพเดิม', 'Drag to frame the portrait; use two fingers to zoom on mobile. Choose Use image to save, or Cancel to keep the old image.'],
            ['Chat เก็บโปรไฟล์ในแชตนี้ Character เก็บเป็นโปรไฟล์ใช้ซ้ำในแชตใหม่ของตัวละครหรือกลุ่มเดียวกัน', 'Chat keeps the profile in this chat. Character makes it reusable in future chats of the same character or group.'],
            ['เปลี่ยนกลับเป็น Chat เพื่อหยุดใช้ซ้ำในแชตใหม่ สำเนาที่อยู่ในแชตเดิมยังอยู่', 'Switch back to Chat to stop seeding future chats. Copies already present in existing chats remain.'],
        ],
        tip: ['ภาพเก็บในเบราว์เซอร์นี้ ไม่รวมใน checkpoint และไม่ย้ายข้ามอุปกรณ์อัตโนมัติ การใช้โปรไฟล์ซ้ำไม่พาเงิน ความคืบหน้า หรือการถือครองไปด้วย', 'Portraits stay in this browser and are excluded from checkpoints; they do not sync automatically. Reusing a profile does not carry money, progress or possession.'],
        pages: ['npc'],
    },
    {
        id: 'species', title: ['ทะเบียนเผ่าพันธุ์', 'Build your species index'],
        intro: ['รวมเผ่าพันธุ์ที่เคยพบ พร้อมลักษณะ ถิ่นอาศัย และความรู้ที่สะสมจากเรื่อง', 'Collect species you have encountered, with traits, habitats and knowledge gathered during the story.'],
        steps: [
            ['เปิด โลกและผู้คน → เผ่าพันธุ์ ใช้ช่องค้นหาเพื่อหาเผ่าพันธุ์ที่บันทึกไว้', 'Open World → Species index and search your recorded species.'],
            ['เมื่อ NPC หรือสิ่งมีชีวิตมีข้อมูลเผ่าพันธุ์ ระบบเพิ่มชื่อเผ่าพันธุ์นั้นเข้าทะเบียนอัตโนมัติ', 'Species named in NPC or creature profiles are added to the index automatically.'],
            ['กด “เพิ่มเผ่าพันธุ์” เพื่อสร้างเอง หรือเปิดรายการที่มีอยู่เพื่อแก้คำอธิบาย ลักษณะ ถิ่นอาศัย และบันทึก', 'Choose Add species to author an entry, or open an existing one to edit its description, traits, habitat and notes.'],
        ],
        tip: ['ทะเบียนเป็นความรู้ของแชตนี้ ชื่อเผ่าพันธุ์ไม่ได้ทำให้ระบบรู้รายละเอียดทั้งหมดเอง ข้อมูลเพิ่มเติมต้องบันทึกจากเรื่องหรือกรอกเอง', 'The index belongs to this chat. A species name does not supply all its lore; record details from the story or enter them yourself.'],
        example: ['ถาม Mara ว่า Elf ในแถบนี้มีลักษณะเฉพาะและถิ่นอาศัยอย่างไร', 'Ask Mara about the traits and habitat of Elves in this region.'],
        pages: ['species'],
    },
    {
        id: 'lineage', title: ['บันทึกผลการผสมข้ามเผ่าพันธุ์', 'Record cross-species lineage'],
        intro: ['เก็บประวัติว่าคู่เผ่าพันธุ์ใดเคยให้ผลแบบไหน แยกผลที่พบจริงกับสมมติฐาน', 'Keep a history of parent species and outcomes, separating observed results from theories.'],
        steps: [
            ['เพิ่มเผ่าพันธุ์พ่อแม่ในทะเบียนก่อน ถ้าทราบเผ่าพันธุ์ผลลัพธ์ ให้เพิ่มผลลัพธ์ไว้ด้วย', 'Index both parent species first. If the resulting species is known, index that outcome too.'],
            ['ในหน้าเผ่าพันธุ์ กด “บันทึกผลการผสม” เลือกคู่เผ่าพันธุ์ ผลลัพธ์ และข้อมูลประกอบ', 'In Species index, choose Record lineage and select the parents, outcome and supporting details.'],
            ['เลือกผลที่พบจริงเมื่อยืนยันในเรื่องแล้ว ถ้าเป็นการคาดการณ์ เลือกสมมติฐาน ซึ่งระบุผลลัพธ์ว่ายังไม่ทราบได้', 'Use Observed for a result confirmed in the story. Use Theory for a prediction; its outcome may remain unknown.'],
            ['หากเกิดลูกหรือสิ่งมีชีวิตใหม่ ให้บันทึกตัวนั้นแยกเป็น NPC หรือสิ่งมีชีวิตในเรื่อง', 'If a new individual is born or created, record that individual separately as an NPC or creature.'],
        ],
        tip: ['การบันทึกไม่ได้เริ่มการผสม สร้างลูก หรือคำนวณพันธุกรรมอัตโนมัติ คู่เดิมไม่ได้รับประกันผลเดิมทุกครั้ง', 'Recording lineage does not start breeding, create offspring or simulate genetics. The same pairing does not guarantee the same outcome every time.'],
        example: ['ในโลกนี้มีบันทึกยืนยันว่า Elf กับ Human ให้กำเนิด Half-Elf หรือเป็นเพียงสมมติฐาน?', 'Does this world have an observed record of Elf and Human parents producing a Half-Elf, or is that only a theory?'],
        pages: ['species', 'stock'],
    },
    {
        id: 'collection', title: ['สิ่งมีชีวิต คลัง และโครงการ', 'Creatures, inventory and projects'],
        intro: ['ตรวจสิ่งที่เก็บจากการเล่น รวมถึงสถานที่ดูแล งานวิจัย และการฝึก', 'Review your recorded creatures and items, their facilities, research and training.'],
        steps: [
            ['สิ่งมีชีวิตและคลัง → ทะเบียนและคลัง รวมสิ่งมีชีวิต ไอเทม ร้าน และคอก กดรายละเอียดเพื่ออ่านข้อมูลเพิ่มเติม', 'Collection → Collection lists creatures, inventory, shops and facilities. Expand Details for more information.'],
            ['ไอเทมเก็บจำนวน สิ่งมีชีวิตเก็บเป็นรายตัว การพบสัตว์ไม่ได้ทำให้มันอยู่ในครอบครองโดยอัตโนมัติ', 'Items track quantity; creatures are individual entries. Encountering an animal does not automatically establish ownership.'],
            ['เมื่อเป็นของคุณจริง เปิดการจัดการถือครองบนรายการสิ่งมีชีวิต ตรวจและยืนยันสถานะ ก่อนนำไปขาย', 'When a creature is actually yours, review and confirm its possession from its entry before offering it for sale.'],
            ['งานวิจัยและฝึกแสดงโครงการที่บันทึกไว้ ดำเนินงานและให้เรื่องยืนยันความคืบหน้าผ่าน Main Chat', 'Research & training shows recorded projects. Carry out work and establish progress through Main Chat.'],
        ],
        tip: ['เวลาผ่านไปหรือการเปิดหน้าโครงการไม่ได้ทำให้งานเสร็จเอง เรื่องราวต้องระบุความคืบหน้าหรือผลสำเร็จ', 'Passing time or opening a project does not finish it automatically. The story must establish progress or completion.'],
        example: ['ฉันนำสัตว์ที่เลี้ยงไว้ไปฝึกที่คอก และตรวจผลการฝึกหลังจบวันนี้', 'I train my owned creature at the stable and review the results at the end of the day.'],
        pages: ['stock', 'research'],
    },
    {
        id: 'contracts', title: ['รับสัญญาและส่งมอบงาน', 'Sign contracts and hand over work'],
        intro: ['ข้อเสนอสัญญาแสดงใน Main Chat และหน้า การค้า → สัญญา ให้คุณตรวจเงื่อนไขก่อนรับ', 'Contract offers appear in Main Chat and Commerce → Contracts so you can review the terms before accepting.'],
        steps: [
            ['เปิดใบสัญญา ตรวจงานที่ต้องทำ กำหนดเวลา ของที่ส่งมอบ และรางวัล', 'Open the agreement and check the objective, deadline, required delivery and rewards.'],
            ['ถ้าตกลง ให้กรอกลายเซ็นและยืนยันรับงาน แล้วทำงานนั้นผ่าน Main Chat', 'If you agree, enter your signature and confirm. Carry out the work in Main Chat.'],
            ['เมื่อเรื่องบันทึกหลักฐานว่าทำสำเร็จ สัญญาจะพร้อมส่งมอบ เปิดหน้าตรวจส่งมอบอีกครั้ง', 'When the story records completion evidence, the contract becomes ready. Open the handover review.'],
            ['ตรวจของและรางวัล แล้วกดยืนยันส่งมอบ ระบบหักของและให้เงิน/XP พร้อมกันเพียงครั้งเดียว', 'Check the delivery and rewards, then confirm handover. Required stock is consumed and money/XP awarded together, once.'],
        ],
        tip: ['แค่ทำงานสำเร็จในเรื่องยังไม่ใช่การรับรางวัล ต้องยืนยันส่งมอบ และมีของตามเงื่อนไขครบ', 'Story completion alone does not claim rewards. Confirm handover with the required stock available.'],
        example: ['ฉันถาม Mara ว่ามีงานสำรวจที่ต้องการจ้างหรือไม่ ขอทราบเงื่อนไขและรางวัลก่อนตัดสินใจ', 'I ask Mara about paid survey work and request the terms and rewards before deciding.'],
        pages: ['contracts'],
    },
    {
        id: 'purchases', title: ['ขายของและต่อรองกับ NPC', 'Sell and negotiate with NPCs'],
        intro: ['เมื่อ NPC ที่รู้จักขอซื้อของหรือสิ่งมีชีวิตที่คุณมี ข้อเสนอที่บันทึกถูกต้องจะขึ้นเป็นการ์ดใน Main Chat', 'When a known NPC requests something you own, a valid recorded offer appears as a Main Chat card.'],
        steps: [
            ['ตรวจผู้ซื้อ สิ่งที่ขอซื้อ จำนวน และราคา ราคาเป็นยอดรวมทั้งข้อเสนอ หน้าการค้า → ข้อเสนอซื้อรวมรายการเหล่านี้ไว้ด้วย', 'Check the buyer, target, quantity and price. The price is the total for the offer. Commerce → Purchase offers lists these cards too.'],
            ['กดต่อรอง ใส่ราคาที่ต้องการทั้งยอด ระบบรอคำตอบ NPC และเตรียมข้อความให้ถ้าช่องแชตว่าง ส่งข้อความเองเพื่อคุยต่อ', 'Choose Counteroffer and enter your total asking price. If the composer is empty, a draft is prepared. Send your own chat message to hear the NPC’s response.'],
            ['NPC อาจรับราคา เสนอราคาใหม่ หรือปฏิเสธ คุณต่อรองได้อีก หรือกดไม่ขาย', 'The NPC may accept, propose another price or decline. Negotiate again or choose Do not sell.'],
            ['เมื่อพอใจราคา กด “ยืนยันขายและรับเงิน” ตรวจรายการแล้วจึงยืนยัน ระบบโอนของและเพิ่มเงินพร้อมกัน', 'When the price suits you, choose Confirm sale & payment, review the details and confirm. Possessions and funds transfer together.'],
        ],
        tip: ['NPC รับราคาแล้วยังไม่ขายจนกว่าคุณยืนยัน ยอดเงินต้องทราบและของต้องพอ สัตว์หรือ NPC ต้องระบุว่าอยู่ในครอบครอง การขายรายตัวใช้จำนวน 1', 'Price agreement is not a completed sale until you confirm. Your balance must be known and stock sufficient. Creatures/NPCs require explicit possession; individual sales use quantity 1.'],
        example: ['ฉันเสนอสัตว์ที่อยู่ในครอบครองให้ Mara ดู และถามว่าเธอต้องการซื้อด้วยราคาเท่าไหร่', 'I show Mara my owned creature and ask whether she wants to buy it and at what price.'],
        pages: ['purchases', 'stock'],
    },
    {
        id: 'money', title: ['เงินเข้า เงินออก และบัญชี', 'Money receipts and your ledger'],
        intro: ['ใบแจ้งเงินขนาดเล็กใน Main Chat บอกยอดที่เปลี่ยนและเหตุผล ส่วนหน้าบัญชีรวมรายการล่าสุด', 'Small Main Chat receipts show money changes and their reasons. The ledger collects recent transactions.'],
        steps: [
            ['เงินเข้าแสดงยอดบวก เงินออกแสดงยอดลบ ตรวจเหตุผลบนใบแจ้งเงินประกอบด้วย', 'Income shows a positive amount and expenses a negative amount. Read the reason alongside each receipt.'],
            ['การค้า → บัญชีและกิจการ แสดงเงิน silver ที่ทราบ รายการซื้อขาย และสาขาที่มีข้อมูล', 'Commerce → Ledger & business shows your known silver balance, transactions and recorded branches.'],
            ['การส่งมอบสัญญาและการขายที่ยืนยันสร้างใบแจ้งเงิน ข้อเสนอที่รออยู่หรือการต่อรองยังไม่เปลี่ยนเงิน', 'Confirmed handovers and sales generate receipts. Pending offers and negotiation do not change your money.'],
            ['เปิดหรือปิดใบแจ้งเงินได้ที่ ตั้งค่า → ทั่วไป การปิดการแสดงผลไม่ยกเลิกรายการที่บันทึกไว้', 'Toggle money notices in General settings. Hiding the notice does not undo recorded transactions.'],
        ],
        tip: ['การระบุยอดเงินครั้งแรกไม่ใช่เงินเข้า การแก้ยอดรวมภายหลังอาจแสดงเป็นการปรับยอด ควรตรวจคำอธิบายก่อนนับเป็นรายได้', 'Establishing your first balance is not income. A later absolute-balance correction may show as an adjustment; check its reason before treating it as earnings.'],
        example: ['ฉันซื้ออาหารจากร้าน จ่าย 10 silver และนำอาหารเข้าคลัง', 'I buy food from the shop, pay 10 silver and add the food to my inventory.'],
        pages: ['ledger'],
    },
    {
        id: 'world', title: ['สำรวจและเก็บความรู้ของโลก', 'Explore and keep world knowledge'],
        intro: ['ใช้บันทึกโลกอ่านสิ่งที่ค้นพบ ส่วนภาพรวมเก็บฉากล่าสุดของการเดินทาง', 'Use the World journal for discoveries and Overview for your current travel scene.'],
        steps: [
            ['เดินทางและถามข้อมูลใน Main Chat ฉากที่ยืนยันแล้วจะแสดงสถานที่ เวลา และสภาพอากาศที่ทราบ', 'Travel and ask questions in Main Chat. Confirmed scenes show the known location, time and weather.'],
            ['โลกและผู้คน → บันทึกโลก รวมความรู้ บันทึก กลุ่ม/องค์กร และเส้นทางที่ถูกบันทึกจากเรื่อง', 'World → World journal collects recorded knowledge, notes, factions and routes.'],
            ['เปิดรายละเอียดของรายการเพื่ออ่านข้อมูลประกอบ ร้านและคอกอยู่ในคลัง ส่วนสาขากิจการอยู่ในบัญชี', 'Expand an entry’s details for its context. Shops and facilities are in Collection; business branches are in Ledger & business.'],
        ],
        tip: ['ฉากของข้อความเก่าเก็บตามเวลาที่เกิดขึ้น การเดินทางใหม่ไม่เขียนทับฉากเก่า บันทึกการประมูลเป็นความรู้ในเรื่อง ไม่ใช่ระบบประมูลอัตโนมัติ', 'Old messages retain their historical scenes. New travel does not overwrite them. Auction notes are story knowledge, not an automatic auction system.'],
        example: ['ฉันถามผู้ดูแลคอกถึงเส้นทางไปป่าทางเหนือ และกลุ่มที่ควบคุมพื้นที่นั้น', 'I ask the stable keeper about the northern forest route and the faction controlling it.'],
        pages: ['codex', 'home'],
    },
    {
        id: 'checkpoints', title: ['บันทึกและเล่นต่อในแชตใหม่', 'Save and continue in a new chat'],
        intro: ['Checkpoint เก็บสถานะพร้อมเรื่องย่อที่คุณตรวจแล้ว เพื่อเริ่มเล่นต่อเป็นสำเนาแยกจากต้นทาง', 'A checkpoint saves state and your reviewed continuity notes, allowing an independent continuation.'],
        steps: [
            ['ไปที่ บันทึกและตั้งค่า → จุดบันทึก กดบันทึกหรือเล่นต่อ ตั้งชื่อและเขียนเหตุการณ์สำคัญที่ควรจำ', 'Open Settings & saves → Checkpoints → Save or continue. Name the save and write the important events to remember.'],
            ['ตรวจเรื่องย่อและสร้างจุดบันทึก เก็บความสัมพันธ์ เป้าหมาย และเหตุการณ์ที่สถานะอย่างเดียวบอกไม่ได้', 'Review the notes and create the checkpoint. Include relationships, goals and events that state values alone cannot explain.'],
            ['เปิดแชตใหม่ของตัวละครหรือกลุ่มเดิม ก่อนส่งข้อความแรก เปิดจุดบันทึก เลือกรายการ ตรวจข้อมูลและยืนยันเล่นต่อ', 'Open a new chat for the same character or group. Before your first user message, select the checkpoint, review it and confirm continuation.'],
            ['ส่งข้อความเล่นต่อเอง ส่งออกหรือนำเข้า JSON เพื่อเก็บไฟล์สำรองได้ แต่ต้องใช้กับตัวละครหรือกลุ่มเดิม', 'Send your own message to continue. Export/import JSON for a backup, using the same character or group.'],
        ],
        tip: ['Checkpoint ไม่เก็บบทสนทนาทั้งหมดหรือภาพ NPC และไม่รับประกันความจำ AI ทั้งหมด เรื่องใหม่แยกจากแชตเดิม เก็บได้สูงสุด 20 จุดต่อตัวละคร/กลุ่ม', 'Checkpoints do not include the full transcript or NPC portraits, or guarantee perfect AI memory. Continuations are independent; up to 20 checkpoints are kept per character/group.'],
        pages: ['recovery'],
    },
    {
        id: 'settings', title: ['ปรับหน้าตาและสิ่งที่แสดง', 'Customize appearance and display'],
        intro: ['กดฟันเฟืองในสมุดบันทึก หรือเปิด Extensions → Vesperchain การเปลี่ยนตั้งค่าบันทึกอัตโนมัติ', 'Use the ledger gear or Extensions → Vesperchain. Preferences save automatically.'],
        steps: [
            ['ทั่วไป: เปิดการติดตาม ปรับสิ่งที่แสดงใน Main Chat เลือกภาษา และเลือก Wand menu หรือปุ่มลอย', 'General: enable tracking, choose Main Chat displays and language, and configure Wand or floating launchers.'],
            ['รูปลักษณ์: เลือกธีม ระยะห่าง ขนาดตัวอักษร 14–20px และฟอนต์โบราณ เปิดระบบ NPC และภาพแยกกันได้ในทั่วไป', 'Appearance: choose theme, spacing, 14–20px text and ornate fonts. NPC rendering and portraits have separate switches in General.'],
            ['เอฟเฟกต์: ปรับหมอก อนุภาค แสง และการเปลี่ยนหน้า หรือเปิดลดการเคลื่อนไหว', 'Effects: adjust mist, particles, glow and transitions, or reduce motion.'],
            ['ลากปุ่มลอยเพื่อย้ายตำแหน่ง ถ้าหาไม่เจอ ใช้คืนตำแหน่งปุ่มลอยจากทั่วไป', 'Drag the floating launcher to move it. Use Reset launcher position in General if it becomes hard to find.'],
        ],
        tip: ['สีและฟอนต์ข้อความในแชตตาม SillyTavern ส่วนธีมและขนาดอักษรของส่วนเสริมใช้กับสมุดบันทึก อุปกรณ์ที่ตั้ง Reduce Motion ไว้จะลดการเคลื่อนไหวเสมอ', 'Chat text follows SillyTavern’s colors and font. Extension theme and text size style the ledger. Your device’s Reduce Motion setting is always respected.'],
        pages: ['settings'],
    },
    {
        id: 'recovery', title: ['เมื่อข้อมูลไม่ขึ้นหรือเล่นต่อไม่ได้', 'When updates or continuation fail'],
        intro: ['ตรวจการติดตามและข้อความที่เป็นต้นทางก่อน ส่วนเสริมจะเก็บสถานะล่าสุดที่ผ่านการตรวจไว้', 'Check tracking and the source reply first. The extension retains the last validated state.'],
        steps: [
            ['ไม่มีข้อมูล: ตรวจว่าเลือกแชต เปิดติดตามตัวละคร และเปิดส่งสถานะให้ AI แล้ว รอคำตอบจบ ข้อความที่ไม่มีข้อมูลติดตามอาจไม่เปลี่ยนสถานะ', 'No updates: select a chat, enable character tracking and the tracking prompt, then wait for a finished reply. A reply without tracking data may leave state unchanged.'],
            ['ข้อมูลอัปเดตไม่ผ่าน: กดตรวจข้อมูลบนฉากเพื่ออ่านสาเหตุ เก็บข้อความเดิมไว้ และแก้ส่วนที่ผิดผ่านตัวแก้ข้อความของ SillyTavern เมื่อเข้าใจแล้ว', 'Rejected update: use Review record on the scene strip to read the reason. Keep the source message and correct it with SillyTavern’s native editor once you understand the issue.'],
            ['หลังแก้ ลบ หรือสลับคำตอบ เงินและการตัดสินใจที่อิงคำตอบเดิมอาจถูกพัก ตรวจหน้าจุดบันทึก อย่ายืนยันรายการเดิมซ้ำโดยไม่ตรวจสถานะ', 'After editing, deleting or swiping a reply, dependent payments and decisions may be suspended. Review Checkpoints before confirming anything again.'],
            ['บันทึกผิดพลาด: ใช้ตรวจและบันทึกใหม่ในจุดบันทึก เล่นต่อไม่ได้: เปิดแชตใหม่ของตัวละครเดิมและนำเข้าก่อนส่งข้อความแรก', 'Save failure: use Reconcile & retry save in Checkpoints. Continuation unavailable: use a new same-character chat and import before your first user message.'],
        ],
        tip: ['อัปเดตส่วนเสริมแล้วรีโหลดตามปกติ ไม่จำเป็นต้องล้างข้อมูลเว็บไซต์ ภาพ NPC ในเครื่องจะหายหากล้างข้อมูลเบราว์เซอร์', 'After updating the extension, reload normally. Clearing website data is unnecessary and removes local NPC portraits.'],
        pages: ['recovery', 'settings'],
    },
];

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderGuide(language, index = null) {
    const lang = language === 'en' ? 1 : 0, l = (th, en) => lang ? en : th;
    const chapter = Number.isInteger(index) ? GUIDE_CHAPTERS[index] : null;
    const count = GUIDE_CHAPTERS.length;
    const status = chapter ? l(`หน้า ${index + 1} / ${count}`, `Page ${index + 1} / ${count}`) : l(`${count} หัวข้อ`, `${count} topics`);
    const controls = `<div class="vc-guide-controls"><select data-guide-select aria-label="${l('เลือกหัวข้อในคู่มือ', 'Choose a guide topic')}"><option value="contents" ${!chapter ? 'selected' : ''}>${l('สารบัญ', 'Contents')}</option>${GUIDE_CHAPTERS.map((c, i) => `<option value="${i}" ${chapter && i === index ? 'selected' : ''}>${i + 1}. ${escape(c.title[lang])}</option>`).join('')}</select><button type="button" data-guide-go="contents" ${!chapter ? 'disabled' : ''}>${l('สารบัญ', 'Contents')}</button></div>`;
    const body = chapter ? `<article class="vc-guide-chapter"><h3 id="vc-guide-heading" tabindex="-1">${escape(chapter.title[lang])}</h3><p class="vc-guide-intro">${escape(chapter.intro[lang])}</p><ol class="vc-guide-steps">${chapter.steps.map(step => `<li>${escape(step[lang])}</li>`).join('')}</ol>${chapter.example ? `<aside class="vc-guide-example"><h4>${l('ลองพิมพ์ใน Main Chat', 'Try typing in Main Chat')}</h4><p>${escape(chapter.example[lang])}</p></aside>` : ''}<aside class="vc-guide-tip"><h4>${l('ควรรู้ก่อนเล่น', 'Good to know')}</h4><p>${escape(chapter.tip[lang])}</p></aside><div class="vc-guide-links">${chapter.pages.map(id => `<button type="button" data-page="${id}">${l('เปิดหน้า', 'Open')} ${escape(PAGES[id][lang])}</button>`).join('')}</div></article>`
        : `<div class="vc-guide-contents"><h3 id="vc-guide-heading" tabindex="-1">${l('เลือกเรื่องที่อยากอ่าน', 'Choose what to read')}</h3><p class="vc-guide-intro">${l('เริ่มจากบทแรก หรือเลือกหัวข้อด้านล่าง อ่านได้โดยไม่เปิดการติดตามและไม่เปลี่ยนข้อมูลการเล่น', 'Start with the first chapter or choose a topic below. Reading does not require tracking or change your campaign.')}</p><div class="vc-guide-topics">${GUIDE_CHAPTERS.map((c, i) => `<button type="button" data-guide-go="${i}"><span class="vc-guide-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${escape(c.title[lang])}</span></button>`).join('')}</div></div>`;
    const pagination = `<nav class="vc-guide-pagination" aria-label="${l('หน้าคู่มือ', 'Guide pages')}"><button type="button" data-guide-go="${chapter ? index - 1 : -1}" ${!chapter || index === 0 ? 'disabled' : ''}>${l('ก่อนหน้า', 'Previous')}</button><span class="vc-guide-progress"><span role="status" aria-live="polite" data-guide-status>${status}</span><progress value="${chapter ? index + 1 : 0}" max="${count}" aria-label="${l('ตำแหน่งในคู่มือ', 'Position in guide')}"></progress></span><button type="button" data-guide-go="${chapter ? index + 1 : 0}" ${chapter && index === count - 1 ? 'disabled' : ''}>${chapter ? l('ถัดไป', 'Next') : l('เริ่มอ่าน', 'Start')}</button></nav>`;
    return controls + `<div class="vc-guide-reading" tabindex="0" aria-labelledby="vc-guide-heading">${body}</div>` + pagination;
}
