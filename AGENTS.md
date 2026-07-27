<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Texture — Project Rules

## Who decides
The founder (Avery) makes ALL product and design decisions. Never mark
anything decided, assumed, or resolved without their explicit confirmation —
even when the answer seems obvious. Avery is not a developer: explain every
plan and every change in plain, non-technical language.

## Source of truth
- `docs/SPEC.md` is the binding decision record (consolidated; includes the
  former Part II addendum).
- Items marked OPEN or DEFERRED are genuinely undecided. Do not build them,
  assume them, or foreclose them. Ask and stop.
- `docs/BRAND_VOICE_AND_IDENTITY.md` governs all user-facing copy. Register:
  matter-of-fact, non-predictive, no urgency, no mysticism, no dark patterns.

## How to work
- Work in plan mode first for any non-trivial task: read, propose a plan in
  plain language, wait for approval before editing anything.
  - Before every command approval and every file shown, state in one or two
  plain sentences what it does and whether it reads or writes (files,
  database, network). Avery approves the explanation, not the code.
- One task at a time. Touch only files the approved task requires.
- Surface every judgment call, assumption, and discovered problem explicitly.
  Never resolve ambiguity silently.
- All user-facing copy is run by Avery before it ships. If a copy need is
  trivial and blocking (e.g., a menu label), proceed with a sensible
  placeholder rather than halting — but flag it explicitly for Avery's
  review and rewrite. Never compress or paraphrase language Avery has
  approved. All non-trivial copy waits for verbatim approval.
- Never edit the AI prompt files (`lib/prompts/`), the transit/synthesis
  prompt documents (`docs/*_CALL_*.md`), or the brief-format templates
  (`docs/brief-template-*.md`) unless the task explicitly names the file —
  prompt content and the binding format contract are managed separately by
  the founder.
- Never produce visual design mockups, UI comps, or rendered design
  artifacts unless Avery explicitly requests one.
- Commit once per approved task with a plain-English message.
- SPEC IS PART OF DONE. No task is complete until docs/SPEC.md
  reflects every change the task made to the architecture,
  data model, ratified rulings, file/table inventory, or the
  shape of the app. The SPEC update is included in the same
  commit that makes the change — never deferred to "later."
  This applies whether or not the individual task brief
  mentions it: if a brief changes something real and does not
  call for a SPEC update, update SPEC anyway and flag that the
  brief omitted it. A change that lives only in code, or only
  in chat, and not in SPEC, is an unfinished change. When a
  task only investigates or decides (no code change) but
  produces a ruling that alters how the system is understood,
  record that ruling in SPEC as well.

## Hard rules
- Prices are placeholders. Never hardcode a price; use config values.
- Never write secrets from `.env.local` (or any env var) into committed files.
- Deterministic astrology math must be validated against a professional
  ephemeris (astro.com) before anything downstream depends on it, per SPEC.md.
- After any write to a live table, verify the resulting STATE with a fresh
  read — never trust a script's own success log alone. A script can report
  success while leaving the table wrong (e.g. an unpaginated read silently
  capping at Supabase's default row limit and leaving stale rows behind,
  caught only by checking the live row count directly, not the log).
