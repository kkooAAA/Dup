---
name: arrayfield-react-key-focus
description: ArrayField in SchemaField.tsx must key array items by index, never by item content, or targeting inputs lose focus per keystroke
metadata:
  type: feedback
---

In `frontend/src/components/meta/SchemaField.tsx`, `ArrayField` must give each array item a React `key` derived ONLY from its index — never from item content (`id`, `key`, `name`, free-text value).

**Why:** For Meta targeting arrays the "identifier" fields ARE the user-editable inputs (regions/cities/zips edit `key`; detailed targeting/custom audiences edit `id` — see [[targeting-schema-rendering]]). A prior `itemKey` heuristic used `item.id ?? item.key` thinking they were stable internal IDs. Typing one character mutated the key, which unmounted/remounted the row and stole input focus after every keystroke. This was the reported drafts-page targeting focus-loss bug.

**How to apply:** Items are only appended/removed (never reordered) via Add/Remove buttons, and every input is fully controlled by `value` from props, so index keys reconcile correctly. If you ever add reordering, introduce a truly stable synthetic id (e.g. a uuid assigned on item creation) — do NOT reach back to content fields for keys. Same rule applies to any new repeater UI.
