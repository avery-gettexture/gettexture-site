// Mechanical structural differ (STEP C): parses BOTH the authored template
// files (docs/brief-template-planet.md, -nodes.md) and live assembleBrief()
// output into pure structure -- entry types and their field names, in
// order -- using the SAME parser for both sides, so the checker can never
// drift from what the template actually says (no hand-copied vocabulary to
// go stale). Compares structure only: never field VALUES. Read-only, pure
// functions -- no I/O, no Supabase, no AI calls.
//
// What this catches (and what it doesn't): a missing/extra/reordered
// field, an entry type the template doesn't define, a non-ISO date, a
// counts-line component silently dropped, an enumerated string outside the
// template's own demonstrated vocabulary. It does NOT check that a value
// is CORRECT (e.g. that a date is the right date) -- certify-calendars.mjs's
// live-recompute checks already own correctness; this owns shape.

// ── Generic indentation-based block parser ──────────────────────────────
//
// The whole document format nests in a uniform +2-space-per-level scheme:
// a line is either a bulleted block header ("- NAME: value", opening a
// child block at indent+2) or a plain field ("NAME: value"). A plain OR
// bulleted field with an EMPTY value (e.g. "PASSAGE:", "TIMELINE:",
// "ACTIVATIONS:") is ALSO a block opener, its children living at indent+2
// -- this is what lets PASSAGE/PHASE/TIMELINE/ACTIVATIONS all nest through
// the same mechanism as a bulleted TIMELINE entry or ACTIVATIONS fact.
// Comment lines (anything whose trimmed content starts with "#") and blank
// lines are stripped before parsing; every real comment in both templates
// is a full line, never inline, so this fully removes annotations.

function tokenize(text) {
  const tokens = [];
  for (const raw of text.split('\n')) {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    tokens.push({ indent, content: trimmed });
  }
  return tokens;
}

const BULLET_RE = /^- ([A-Za-z_]+):\s*(.*)$/;
const FIELD_RE = /^([A-Za-z_]+):\s*(.*)$/;

// Parses siblings at exactly `indent`, starting at tokens[pos]. Returns
// { items, next }. Each item is { type: 'field', name, value } or
// { type: 'block', name, value, children }. A non-bullet, non-field line
// (e.g. a SHAPE segment's plain prose bullet with no "NAME:" prefix) is
// skipped -- it carries no field-vocabulary information for this checker.
function parseSiblings(tokens, pos, indent) {
  const items = [];
  let i = pos;
  while (i < tokens.length && tokens[i].indent >= indent) {
    const t = tokens[i];
    if (t.indent > indent) { i++; continue; } // orphaned deeper line -- defensive skip
    const bulletMatch = t.content.match(BULLET_RE);
    const plainMatch = !bulletMatch ? t.content.match(FIELD_RE) : null;
    if (bulletMatch || (plainMatch && plainMatch[2] === '')) {
      const [, name, value] = bulletMatch ?? plainMatch;
      i++;
      const sub = parseSiblings(tokens, i, indent + 2);
      items.push({ type: 'block', name, value, children: sub.items });
      i = sub.next;
    } else if (plainMatch) {
      items.push({ type: 'field', name: plainMatch[1], value: plainMatch[2] });
      i++;
    } else {
      i++; // unstructured prose (SHAPE segment) -- not vocabulary-bearing
    }
  }
  return { items, next: i };
}

function parseDocument(text) {
  return parseSiblings(tokenize(text), 0, 0).items;
}

// ── Entry / fact-block extraction ────────────────────────────────────────
//
// An "entry" is any bulleted block anywhere in the document whose own
// first field is named ID or TYPE (covers both header orders: most entries
// lead "- ID: ...\n  TYPE: X"; the Nodes variant's ECLIPSE entries lead
// "- TYPE: ECLIPSE\n  ID: ..."). Its own TYPE field's value is its entry
// type -- read wherever TYPE appears among its fields, not assumed to be
// first. A "fact" is the same shape one level deeper, inside a field
// literally named ACTIVATIONS. Fact type isn't an explicit field in the
// format -- classified here by which second leg is present (NATAL_ASPECT
// vs PAIR_ASPECT), which the format itself uses to distinguish them.
function fieldNames(children) {
  return children.filter(c => c.name !== 'ACTIVATIONS').map(c => c.name);
}

function findField(children, name) {
  const f = children.find(c => c.name === name);
  return f ? f.value : undefined;
}

function extractEntries(items) {
  const entries = [];
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'block') {
        if (node.name === 'ID' || node.name === 'TYPE') {
          const typeField = node.children.find(c => c.name === 'TYPE');
          const type = node.name === 'TYPE' ? node.value : typeField?.value;
          const facts = [];
          const activationsBlock = node.children.find(c => c.name === 'ACTIVATIONS');
          if (activationsBlock) {
            for (const factNode of activationsBlock.children) {
              if (factNode.type === 'block' && (factNode.name === 'ID')) {
                const factType = factNode.children.some(c => c.name === 'PAIR_ASPECT')
                  ? 'PAIR_ACTIVATION'
                  : factNode.children.some(c => c.name === 'NATAL_ASPECT')
                    ? 'NATAL_ACTIVATION'
                    : 'UNKNOWN_ACTIVATION';
                facts.push({ type: factType, id: factNode.value, fields: fieldNames(factNode.children) });
              }
            }
          }
          entries.push({ type, id: node.name === 'ID' ? node.value : findField(node.children, 'ID'), fields: fieldNames(node.children), facts });
        }
        // Never descend into an ACTIVATIONS block generically -- its fact
        // children are already extracted above (they also start with
        // "- ID:", so the generic walk would otherwise re-match each one
        // as a bogus top-level entry with no TYPE field, merging every
        // fact type's fields into one stray "undefined"-typed vocabulary
        // bucket).
        if (node.name !== 'ACTIVATIONS') walk(node.children);
      }
    }
  }
  walk(items);
  return entries;
}

// ── Vocabulary derivation (from the template only) ──────────────────────
//
// vocabulary[type] = { order: [field names, union order across every
// template example of that type], required: Set of fields present in
// EVERY example }. Same shape for factVocabulary, keyed by synthetic fact
// type (NATAL_ACTIVATION / PAIR_ACTIVATION).
function buildVocabulary(entries) {
  const byType = new Map();
  for (const e of entries) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type).push(e.fields);
  }
  const vocab = {};
  for (const [type, fieldLists] of byType) {
    const order = [];
    for (const fields of fieldLists) for (const f of fields) if (!order.includes(f)) order.push(f);
    const required = order.filter(f => fieldLists.every(fields => fields.includes(f)));
    vocab[type] = { order, required: new Set(required) };
  }
  return vocab;
}

function buildFactVocabulary(entries) {
  const allFacts = entries.flatMap(e => e.facts);
  const byType = new Map();
  for (const f of allFacts) {
    if (!byType.has(f.type)) byType.set(f.type, []);
    byType.get(f.type).push(f.fields);
  }
  const vocab = {};
  for (const [type, fieldLists] of byType) {
    const order = [];
    for (const fields of fieldLists) for (const f of fields) if (!order.includes(f)) order.push(f);
    const required = order.filter(f => fieldLists.every(fields => fields.includes(f)));
    vocab[type] = { order, required: new Set(required) };
  }
  return vocab;
}

// Checks a live entry/fact's fields against a derived vocabulary: every
// field recognized, every required field present, relative order preserved
// (a subsequence of the vocabulary's own order -- optional fields may be
// absent, but present fields can't be transposed).
function checkAgainstVocabulary(label, id, fields, vocab, failures) {
  if (!vocab) {
    failures.push({ entry: `${label} ${id}`, field: '(type)', issue: `entry/fact type not found anywhere in the template's own vocabulary` });
    return;
  }
  for (const f of fields) {
    if (!vocab.order.includes(f)) {
      failures.push({ entry: `${label} ${id}`, field: f, issue: `field not in template's vocabulary for this type (known: ${vocab.order.join(', ')})` });
    }
  }
  for (const req of vocab.required) {
    if (!fields.includes(req)) {
      failures.push({ entry: `${label} ${id}`, field: req, issue: `required field missing (template shows it on every example of this type)` });
    }
  }
  // Order: the live field list, restricted to recognized fields, must be a
  // subsequence of vocab.order.
  const recognized = fields.filter(f => vocab.order.includes(f));
  let cursor = -1;
  for (const f of recognized) {
    const idx = vocab.order.indexOf(f);
    if (idx <= cursor) {
      failures.push({
        entry: `${label} ${id}`, field: f,
        issue: `out of order -- expected order ${vocab.order.join(' > ')}, found ${recognized.join(' > ')}`,
      });
      break; // one order failure per entry is enough signal
    }
    cursor = idx;
  }
}

// ── Contract check 1: ISO dates only ─────────────────────────────────────
//
// Scans the raw text for common NON-ISO date signatures (a regression
// class FIX 2 already produced once -- toLocaleDateString-style "Jun 29,
// 2026"). Doesn't need the template: ISO YYYY-MM-DD is a universal,
// template-independent contract restated in every template's own header.
const NON_ISO_DATE_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;
function checkIsoDatesOnly(text, failures) {
  for (const line of text.split('\n')) {
    if (NON_ISO_DATE_RE.test(line)) {
      failures.push({ entry: '(document)', field: '(date)', issue: `non-ISO date found: "${line.trim()}"` });
    }
  }
}

// ── Contract check 2: counts line names every entry type present ────────
//
// Self-consistency within one document: every entry TYPE actually found in
// the body must have a named component in its own [counts] line. Presence
// only -- per STEP C's instruction, this compares no values, so it does
// NOT check that the stated number is arithmetically correct.
function checkCountsLineComponents(text, entries, failures) {
  const countsLine = text.split('\n').find(l => l.trim().startsWith('[counts]'));
  if (!entries.length) return; // nothing to require a component for
  if (!countsLine) {
    failures.push({ entry: '(document)', field: '[counts]', issue: 'no [counts] line found' });
    return;
  }
  const presentTypes = new Set(entries.map(e => e.type));
  for (const type of presentTypes) {
    if (type === 'ECLIPSE_ACTIVATION') continue; // counted separately as "eclipse-to-transit facts", never as an entries component -- both templates agree
    if (!countsLine.includes(type)) {
      failures.push({ entry: '(document)', field: '[counts]', issue: `entry type ${type} is present in the body but has no component in the [counts] line: "${countsLine.trim()}"` });
    }
  }
}

// ── Contract check 3: enumerated strings from the template's own vocabulary ──
//
// STATUS/TETHER/TYPE vocabularies are derived from literal values seen in
// the template (per entry type, since STATUS's valid phrases differ
// between NATAL_CONTACT and SKY_CONTACT). MOTION and the SHAPE/OPENED_BY/
// CLOSES trigger-word vocabulary are hand-extracted from the templates'
// own prose comments, which enumerate them explicitly with " | " --
// docs/brief-template-planet.md's PHASE note ("MOTION: FORWARD |
// RETROGRADE") and SHAPE note ("Segment events: ingress | re-ingress |
// retro-ingress | station retrograde | station direct | egress"). A value
// outside these sets is a genuine finding, not a false positive -- if the
// template's own illustrative examples don't demonstrate a phrase the code
// can legitimately produce, that is a real template-vocabulary gap worth
// surfacing, not something to paper over here.
const MOTION_VALUES = new Set(['FORWARD', 'RETROGRADE']); // brief-template-planet.md PHASE note
const TRIGGER_WORD_PREFIXES = ['ingress', 're-ingress', 'retro-ingress', 'station retrograde', 'station direct', 'egress'];

export function checkConformance(templateText, outputText, variant) {
  const templateItems = parseDocument(templateText);
  const outputItems = parseDocument(outputText);
  const templateEntries = extractEntries(templateItems);
  const outputEntries = extractEntries(outputItems);

  const vocab = buildVocabulary(templateEntries);
  const factVocab = buildFactVocabulary(templateEntries);

  const failures = [];

  for (const e of outputEntries) {
    checkAgainstVocabulary('entry', e.id, e.fields, vocab[e.type], failures);
    for (const f of e.facts) {
      checkAgainstVocabulary('activation fact (in ' + e.id + ')', f.id, f.fields, factVocab[f.type], failures);
    }
  }

  checkIsoDatesOnly(outputText, failures);
  checkCountsLineComponents(outputText, outputEntries, failures);

  // STATUS / TETHER / TYPE vocabulary, derived per entry TYPE from literal
  // template values (via raw field extraction, not the structural tree --
  // simplest correct way to get the exact phrase strings).
  const templateStatusByType = new Map();
  const templateTetherValues = new Set();
  const templateTypeValues = new Set(templateEntries.map(e => e.type));
  for (const e of templateEntries) {
    const raw = rawFieldValue(templateText, e.id, 'STATUS');
    if (raw !== undefined) {
      if (!templateStatusByType.has(e.type)) templateStatusByType.set(e.type, new Set());
      templateStatusByType.get(e.type).add(raw);
    }
    const tether = rawFieldValue(templateText, e.id, 'TETHER');
    if (tether !== undefined) templateTetherValues.add(tether);
  }

  for (const e of outputEntries) {
    if (!templateTypeValues.has(e.type)) {
      failures.push({ entry: `entry ${e.id}`, field: 'TYPE', issue: `TYPE "${e.type}" not in template's vocabulary (known: ${[...templateTypeValues].join(', ')})` });
    }
    const statusRaw = rawFieldValue(outputText, e.id, 'STATUS');
    if (statusRaw !== undefined) {
      const known = templateStatusByType.get(e.type);
      if (!known || !known.has(statusRaw)) {
        failures.push({
          entry: `entry ${e.id}`, field: 'STATUS',
          issue: `STATUS "${statusRaw}" not demonstrated in the template for ${e.type} (known: ${known ? [...known].join(' | ') : '(none)'})`,
        });
      }
    }
    const tetherRaw = rawFieldValue(outputText, e.id, 'TETHER');
    if (tetherRaw !== undefined && !templateTetherValues.has(tetherRaw)) {
      failures.push({ entry: `entry ${e.id}`, field: 'TETHER', issue: `TETHER "${tetherRaw}" not in template's vocabulary` });
    }
  }

  // MOTION (planet variant only) and trigger-word vocabulary (OPENED_BY/
  // CLOSES), hand-derived from the templates' own prose -- see header
  // comment above.
  if (variant === 'planet') {
    for (const line of outputText.split('\n')) {
      const m = line.match(/^\s*MOTION:\s*(.+)$/);
      if (m && !MOTION_VALUES.has(m[1].trim())) {
        failures.push({ entry: '(PHASE)', field: 'MOTION', issue: `MOTION "${m[1].trim()}" not in template's vocabulary (FORWARD | RETROGRADE)` });
      }
      const trig = line.match(/^\s*(OPENED_BY|CLOSES):\s*(.+)$/);
      if (trig) {
        const value = trig[2].trim();
        const matchesKnown = TRIGGER_WORD_PREFIXES.some(p => value.startsWith(p));
        if (!matchesKnown) {
          failures.push({ entry: '(PHASE)', field: trig[1], issue: `"${value}" doesn't start with a known trigger word (${TRIGGER_WORD_PREFIXES.join(' | ')})` });
        }
      }
    }
  }

  return { pass: failures.length === 0, failures };
}

// Extracts one field's raw value for a specific entry (matched by its ID,
// at entry-level indent 2 -- never a nested ACTIVATIONS fact, which lives
// at indent 6 and could otherwise collide on a coincidentally-equal ID).
// Used only for the small set of "enumerated string" fields (STATUS,
// TETHER) where the exact literal phrase is needed, not the structural
// tree (which records field names, not values).
function rawFieldValue(text, entryId, fieldName) {
  const tokens = tokenize(text);
  let i = tokens.findIndex(t => t.indent === 2 && (t.content === `- ID: ${entryId}` || t.content === `- TYPE: ${entryId}`));
  if (i === -1) return undefined;
  i++;
  while (i < tokens.length && tokens[i].indent >= 4) {
    if (tokens[i].indent === 4) {
      const m = tokens[i].content.match(new RegExp(`^${fieldName}:\\s*(.*)$`));
      if (m) return m[1];
    }
    i++;
  }
  return undefined;
}
