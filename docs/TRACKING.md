# Tracking protocol v1

The extension instructs the existing Main Chat generation to append one fenced `vesperchain` JSON record. It does not call a model itself or infer numbers from prose. The current revision and known state are injected through `setExtensionPrompt`. Disable injection independently in the drawer if configuring the same protocol yourself.

Example (only valid when current revision is 0):

````text
The shutters tremble in the rain.
```vesperchain
{"version":1,"eventId":"arrival-1","baseRevision":0,"scene":{"city":"Vespergate","place":"Cinder Quay","day":1,"period":"Morning","weather":"Rain"},"resources":{"silver":800}}
```
````

All values in this example are illustrative, not automatic starting values. The character/lore and actual story establish initial facts.

## Fields

- `version: 1`, a unique stable `eventId`, and exact `baseRevision` are mandatory. One accepted record advances revision once. User decisions also advance it.
- `scene`: region, city, place, room, day, month, year, period, weather. Unknowns are null. Day/year are positive integers; month/period are text.
- `resources`: silver, hp, maxHp, stamina, maxStamina, mana, maxMana, level, xp. These are absolute nonnegative integer values or null, with positive level and current values not exceeding known maxima.
- `entities`: inventory, creatures, shops, projects, npcs, factions, branches, routes, notes. Each group is an array of updates with stable `id`, `name`, optional `status`, `location`, `details`, `quantity`, `owned`, `species`. `owned` is a boolean only for creatures/NPCs; `species` is a species-name string only for creatures. NPC identity remains in `npcProfiles`; generic NPC updates may explicitly change possession with `{id,name,owned}`. Inventory requires quantity. `{id,remove:true}` removes a record.
- `npcProfiles`: arrays of complete identity objects `{id,name,role,age,pronouns,species,appearance,personality,background,goals,relationship,status,location}`. All keys required. Values are nonempty plain strings or explicit null for undisclosed facts (ID/name cannot be null). Name must be a personal name, never a job; common job-only labels and name equal to role are rejected. Do not expose undisclosed identity/secrets. Store full profiles here, not inside generic entity updates.
- `offers`: immutable agreements with `id`, `title`, `issuer`, `objective`, `terms`, `deadlineDay` (integer or null), `reward:{silver,xp}`, `deliver:[{itemId,quantity}]`. Decisions belong to the user. New terms require a new ID.
- `contractUpdates:[{id,ready:true,evidence}]`: story evidence makes a signed contract ready for reviewed handover. The UI, not this record, delivers items and awards the agreed silver/XP.
- `transactions:[{id,reason,silverDelta,items:[{itemId,delta}]}]`: atomic changes to existing inventory and known money. Do not mix with a silver absolute value or inventory upserts in the same record. IDs beginning `contract-` and `sale-` are reserved for UI payouts.

The prompt carries up to 20 recent entries per entity category, all active signed/ready contracts plus recent agreements, and reviewed continuity notes. The stored state remains complete within the documented capacity; this context subset is explicitly identified as incomplete. Unknown IDs or ambiguous facts must be clarified in Main Chat.

## Reconciliation and limits

Raw AI message records and explicit local decisions replay from a chat's baseline. Scene frames are historical; contract cards reflect the latest selected history. Editing, deleting or swiping an anchor can suspend its decision and downstream records, rather than transferring a signature to changed terms. Restore the original message/swipe or correct the rejected record before continuing. Recovery displays errors; a checkpoint cannot capture unresolved replay errors.

Malformed, oversized, stale, unsafe or multiple records are rejected atomically. A response with no record retains confirmed values. Generation freezes the prior state until it ends/stops; interrupted invalid records do not partially apply. Regeneration/swipe requests use the state before the replaced AI message. A host Continue operation which appends a second complete record to one message is currently rejected; use a new Main Chat reply or consolidate the message into one valid record.

Limits: 64 KB per record, 500 entities per category, 20 saved checkpoints per character/group, 2 MB per imported checkpoint. Checkpoint review is mandatory; notes are supplied by the user, not an automatic unreviewed AI summary. Imports copy state, not a full transcript. Signature buttons and imports do not trigger generation.

The integration relies on SillyTavern's chat identity and save API. A renamed chat ID is treated as a new identity; export a checkpoint before renaming if continuity is required. No claim of model compliance is made: if a model omits/rejects the format, the tracker displays carried/rejected status instead of fabricating an update.

## NPC presentation contract

Before the one tracking block, delimit an NPC's speaking passage with `[[vc:mara]]` and `[[/vc]]`. The ID must match a complete known `npcProfiles` entry (supply it in the same record when introducing someone). Multiple quoted paragraphs are welcome. Keep narrative and single-asterisk actions outside speaker markers; only quoted speech becomes dialogue. Existing mixed passages are split in order into narration and quoted speech. Narration never gains a dialogue border or resets the speaker. Never nest markers, place them inside code blocks, or supply HTML/image URLs. Well-formed passages with missing profiles or rejected tracking records show plain text without untrusted speaker headers. Malformed markers retain native text.

```text
The candle flickers.

[[vc:mara]]*She lays down the letter.*

“Read it carefully.”

“Your name belongs here.”[[/vc]]

[[vc:edric]]“The gates close soon.”[[/vc]]
```

The renderer emits one header for each speaker run, not each paragraph or repeated marker. Narration does not reset the speaker. A user turn resets the run. Historical frames retain only profiles referenced by their marked passages, avoiding a full NPC catalogue copy for every message.

Scope choices are user-owned, never an AI field. `current.npcScopes` and `npcPublished` track explicit sharing; `extensionSettings.vesperchainNpcCharacters[owner]` stores reusable complete identities. New chats copy those opted-in profiles into their baseline while all campaign resources/scenes start fresh. Existing chats do not retroactively import later changes. Local portrait blobs are separate from these records.

Text colors use the host's `--SmartThemeBodyColor`, `--SmartThemeQuoteColor`, and `--SmartThemeEmColor`; Scene Tracker also inherits body color. Native message text is only hidden while a valid replacement is present, restored during editing or disabling. AI data is escaped, not inserted as executable HTML.


## Rejected records and readable chat

Unknown fields report their schema path and permitted keys, for example `record.scene.time` (use the documented `period` field only when its value is established). The prompt identifies `scope`, `revision`, `contracts`, `seen` and `npcScopes` as read-only state fields, not fields to copy into a tracking record. This is guidance, not a guarantee of model compliance.

The scene strip’s Review record action exposes the rejected JSON as escaped, read-only text. Users may correct the original message through native editing. No automatic record repair, dropped-field acceptance or extra generation occurs. The known state remains unchanged until the full record validates.

For a well-formed speaker passage, presentation can strip delimiters and show the prose even if tracking failed or a profile is absent. It creates no NPC identity or named dialogue header from rejected data. Malformed/nested markers still use native fallback. Raw messages remain unchanged and are restored for editing or when presentation is disabled.


## Species and lineage

- `speciesProfiles:[{id,name,description,traits,habitat,notes}]`: all fields required, unknown details use empty strings. IDs are stable. Reuse an existing species ID for the same case-insensitive name. Definitions apply before entity/NPC discovery, so a new species and its individuals can share a record. NPC/creature species names are also indexed automatically.
- `breedingRecords:[{id,parentA,parentB,result,status,notes}]`: parent/result values are indexed species IDs. `status` is `observed` or `theory`; an observed result must be known, while a theory may use `result:null`. All fields required. Event contents are immutable; a different experiment/outcome needs a new ID. Index records never change possession counts or create offspring on their own.
- Limits: 500 indexed species and 2,000 lineage events per chat. Names differing only in case/normalized Unicode reuse the same identity. Recent prompt context includes up to 100 species and 50 lineage records; omitted entries do not mean absence.

## Purchases

`purchaseOffers:[{id,buyerId,kind,entityId,quantity,price,terms}]` uses a complete NPC buyer and an existing target. `kind` is `inventory`, `creatures` or `npcs`. Price is a positive integer **total** in silver. Inventory needs enough stock. Individuals require `owned:true`, quantity 1, and a buyer distinct from the target. Offers do not pay or transfer anything. IDs/target/terms are immutable.

A user counteroffer changes a purchase from `offered` to `awaiting`, increments `round`, and stores `requestedPrice`. The next ordinary AI response may contain:

```json
{"purchaseUpdates":[{"id":"silk-bid","round":1,"decision":"accept","price":170,"reason":"The buyer agrees to that total."}]}
```

This is an illustrative fragment of a full record, not a standalone payload. `decision` is `accept`, `counter` or `decline`. It must match the exact pending round. Acceptance must equal requestedPrice; another buyer price is a counter. Acceptance/counter returns the deal to `offered`, while decline closes it. Only a user `purchase-sell` decision can settle. Do not duplicate UI proceeds or consumed stock in resources, entities or transactions. User rejection is also authoritative. Active negotiations and recent closed deals are included in the normal prompt.

A confirmed individual sale retains identity and changes possession to false, recording the buyer as holder/location. Inventory subtracts the sold quantity. The payout enters the transaction log as `sale-<decision-id>`. Edits or deleted anchors suspend sale and funds together. Limits: 1,000 purchase offers and 1,000 history steps per negotiation.

## Manual decisions and financial presentation

NPC authoring, species edits, lineage entries and possession controls also use local decisions. They may apply at the `baseline` before the first AI response; otherwise they are anchored to the last selected AI response. Review forms reject a changed chat/revision, and creation/editing requires enabled tracking and completed generation. Malformed imported profiles require correction in a reviewed form.

Each historical frame carries new nonzero transactions for financial notices. Establishing a first known balance creates no notice. A subsequent absolute silver change, after subtracting separately recorded decision payouts, is a balance-adjustment notice. Duplicate records do not repeat transactions; rejected records cannot produce a notice from unconfirmed changes. Display switches do not alter accounting.
