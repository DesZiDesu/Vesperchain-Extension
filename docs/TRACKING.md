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
- `entities`: inventory, creatures, shops, projects, npcs, factions, branches, routes, notes. Each group is an array of updates with stable `id`, `name`, optional `status`, `location`, `details`, `quantity`. Inventory requires quantity. `{id,remove:true}` removes a record.
- `npcProfiles`: arrays of complete identity objects `{id,name,role,age,pronouns,species,appearance,personality,background,goals,relationship,status,location}`. All keys required. Values are nonempty plain strings or explicit null for undisclosed facts (ID/name cannot be null). Name must be a personal name, never a job; common job-only labels and name equal to role are rejected. Do not expose undisclosed identity/secrets. Store full profiles here, not inside generic entity updates.
- `offers`: immutable agreements with `id`, `title`, `issuer`, `objective`, `terms`, `deadlineDay` (integer or null), `reward:{silver,xp}`, `deliver:[{itemId,quantity}]`. Decisions belong to the user. New terms require a new ID.
- `contractUpdates:[{id,ready:true,evidence}]`: story evidence makes a signed contract ready for reviewed handover. The UI, not this record, delivers items and awards the agreed silver/XP.
- `transactions:[{id,reason,silverDelta,items:[{itemId,delta}]}]`: atomic changes to existing inventory and known money. Do not mix with a silver absolute value or inventory upserts in the same record. IDs beginning `contract-` are reserved.

The prompt carries up to 20 recent entries per entity category, all active signed/ready contracts plus recent agreements, and reviewed continuity notes. The stored state remains complete within the documented capacity; this context subset is explicitly identified as incomplete. Unknown IDs or ambiguous facts must be clarified in Main Chat.

## Reconciliation and limits

Raw AI message records and explicit local decisions replay from a chat's baseline. Scene frames are historical; contract cards reflect the latest selected history. Editing, deleting or swiping an anchor can suspend its decision and downstream records, rather than transferring a signature to changed terms. Restore the original message/swipe or correct the rejected record before continuing. Recovery displays errors; a checkpoint cannot capture unresolved replay errors.

Malformed, oversized, stale, unsafe or multiple records are rejected atomically. A response with no record retains confirmed values. Generation freezes the prior state until it ends/stops; interrupted invalid records do not partially apply. Regeneration/swipe requests use the state before the replaced AI message. A host Continue operation which appends a second complete record to one message is currently rejected; use a new Main Chat reply or consolidate the message into one valid record.

Limits: 64 KB per record, 500 entities per category, 20 saved checkpoints per character/group, 2 MB per imported checkpoint. Checkpoint review is mandatory; notes are supplied by the user, not an automatic unreviewed AI summary. Imports copy state, not a full transcript. Signature buttons and imports do not trigger generation.

The integration relies on SillyTavern's chat identity and save API. A renamed chat ID is treated as a new identity; export a checkpoint before renaming if continuity is required. No claim of model compliance is made: if a model omits/rejects the format, the tracker displays carried/rejected status instead of fabricating an update.

## NPC presentation contract

Before the one tracking block, delimit an NPC's speaking passage with `[[vc:mara]]` and `[[/vc]]`. The ID must match a complete known `npcProfiles` entry (supply it in the same record when introducing someone). Multiple quoted paragraphs are welcome. Keep narrative and single-asterisk actions outside speaker markers; only quoted speech becomes dialogue. Existing mixed passages are split in order into narration and quoted speech. Narration never gains a dialogue border or resets the speaker. Never nest markers, place them inside code blocks, or supply HTML/image URLs. Missing/invalid profiles or malformed markers retain native text rather than hiding the reply.

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
