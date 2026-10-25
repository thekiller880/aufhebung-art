// Deterministic Plotinian reading. Works with no LLM key; the LLM (if any) only rewrites the prose.
// Soul  = the felt surface of the user's loves (Qloo tags, sensed).
// Nous  = the Forms behind them (archetypes inferred from the tag field).
// One   = the single thread that every leap across domains returns to.

export const FORMS = [
  { key: 'return', name: 'Return', greek: 'epistrophē', re: /myst|\bspirit|transcend|meditat|ascen|pilgrim|nostalg|memory|origin|myth|ancient|chant|choral|esoter|occult|reflective/i,
    gloss: 'the turn back toward an origin', one: 'Your thread is epistrophē, the turn back: the things you love keep circling toward an origin, a first image they try to recover.' },
  { key: 'contemplation', name: 'Contemplation', greek: 'theōria', re: /philosoph|theory|metaphys|essay|minimal|ambient|stillness|drone|contemplat|classical|logic|ethic|idealis|rationalis|thought/i,
    gloss: 'making by beholding', one: 'Your thread is theōria: for Plotinus even nature makes by contemplating, and you love works that think by looking.' },
  { key: 'beauty', name: 'Beauty', greek: 'to kalon', re: /art|museum|paint|gallery|architect|design|beaut|ethereal|dream pop|baroque|renaissance|sculpt|romantic|lyric|poetry|aesthetic/i,
    gloss: 'form mastering matter until it shines', one: 'Your thread is Beauty: the moment form wins over matter and the thing shines with something not its own (Ennead I.6).' },
  { key: 'descent', name: 'Descent', greek: 'proodos', re: /dark|goth|horror|noir|crime|thriller|dystop|war|tragedy|haunt|eerie|uncanny|ghost|ruin|death|nocturn|doom|industrial/i,
    gloss: 'procession outward into shadow and matter', one: 'Your thread is the Descent: you look for form at the far edge, where it is almost darkness and still holds.' },
  { key: 'worldsoul', name: 'World-Soul', greek: 'psychē tou pantos', re: /nature|cosmic|space|science fiction|sci-fi|astronom|landscape|folk|ocean|desert|earth|planet|ecolog|travel|outdoor/i,
    gloss: 'the whole as one living system', one: 'Your thread is the World-Soul: the sense that everything is one living system, and you keep finding it in very different bodies.' },
  { key: 'labyrinth', name: 'Self-thinking Intellect', greek: 'noēsis noēseōs', re: /labyrinth|myster|puzzle|surreal|experiment|mind|psycholog|cerebral|avant|postmodern|meta|infinite|paradox|math|science/i,
    gloss: 'mind turning on itself and finding the whole', one: 'Your thread is Nous thinking itself: you love works that fold back on themselves and hold the whole inside each part.' },
  { key: 'exile', name: 'Exile', greek: 'tolma', re: /melanch|alienat|sad|lonel|existential|post-rock|indie|grief|nostalg|isolat|despair|anxiety|absurd|loss/i,
    gloss: 'the soul’s daring to be apart, and its homesickness', one: 'Your thread is tolma, the soul’s daring to stand apart, and the homesickness that comes with it. Your loves are beautiful exiles.' },
  { key: 'virtue', name: 'Virtue', greek: 'aretē', re: /virtue|moral|compassion|kindness|redemption|hope|uplift|inspir|heartwarm|friendship|community|humanit|self-help|self-improv|motivation|ambition|individualis|self-overcom|discipline|perseveran|courage|sacrifice|justice|determin|principled|perfection|competition|idealistic|devoted|everyman|family|practice/i,
    gloss: 'excellence of a self, shaped inward and then acting outward', one: 'Your thread is aretē, excellence in the old sense: for Plotinus (Ennead I.2) virtue is a self put in order inside, which then shows up in how it acts on others.' },
  { key: 'eros', name: 'Eros', greek: 'erōs', re: /love|romanc|desire|passion|sensual|soul music|r&b|ballad|intimate/i,
    gloss: 'longing that pulls the eye upward', one: 'Your thread is Eros: longing itself, each thing you love a step toward a beauty you cannot quite name.' },
];

export function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
export const pick = (arr, seed) => arr[hash(seed) % arr.length];

export function formsOf(tags) {
  const score = Object.fromEntries(FORMS.map(f => [f.key, 0]));
  for (const t of tags) for (const f of FORMS) if (f.re.test(t)) score[f.key]++;
  return FORMS.map(f => ({ ...f, score: score[f.key] })).filter(f => f.score > 0).sort((a, b) => b.score - a.score);
}

const GENERIC = /^(fiction|nonfiction|history|biography|english|american|book|novel|movie|film|music|place|unknown|rock|pop|loyal|unique|social|clean|airy|fashionable|classics|literature|novels|audiobook|unfinished|drama|religion|religious|christian|two word title|contraction in title|one word title)$/i;
const AMENITY = /wheelchair|parking|bathroom|restroom|coat check|gift shop|tours?$|city center|kids|wifi|wi-fi|accessible|seating|credit card|reservation|ticket|cafe|catering|delivery|takeout|outdoor seating|happy hour|shopping|nightlife|foodie|district|getaway|bottle|black dog|key$|ambulance|earpiece|translator|real estate|\d/i;
export const usable = t => !/suicide|rape|abuse|murder|torture/i.test(t) && !GENERIC.test(t) && !AMENITY.test(t) && t.length < 28;

export function readTaste(seeds, leaps) {
  const seedTags = seeds.flatMap(s => s.tags || []);
  const allTags = [...seedTags, ...leaps.flatMap(l => l.items.flatMap(i => i.tags || []))];
  // Round-robin across seeds so every love colours the Soul, favouring tags that touch a Form.
  const lists = seeds.map(s => (s.tags || []).filter(usable).sort((a, b) => Number(FORMS.some(f => f.re.test(b))) - Number(FORMS.some(f => f.re.test(a)))));
  const textures = [];
  for (let r = 0; textures.length < 8 && r < 6; r++) for (const l of lists) if (l[r] && !textures.some(t => t.toLowerCase() === l[r].toLowerCase())) textures.push(l[r]);

  let forms = formsOf(seedTags.length ? seedTags : allTags);
  if (forms.length < 3) forms = [...forms, ...formsOf(allTags).filter(f => !forms.some(g => g.key === f.key))];
  if (!forms.length) forms = [{ ...FORMS[0], score: 0 }];
  const top = forms.slice(0, 3);
  const one = top[0];

  const soul = {
    textures,
    text: textures.length
      ? `Soul first: what you sense. Your loves share a felt weather of ${listify(textures.slice(0, 5).map(t => t.toLowerCase()))}. This is the level of images and moods, where Plotinus would say the soul is busy with the many.`
      : 'Soul first: what you sense. Your loves arrive as images and moods, the many, before any pattern is seen.',
  };
  const nous = {
    forms: top.map(f => ({ key: f.key, name: f.name, greek: f.greek, gloss: f.gloss, weight: f.score })),
    text: `Nous: what you see through them. Beneath the moods stand ${top.length === 1 ? 'one Form' : `${top.length} Forms`}: ${top.map(f => `${f.name} (${f.greek}), ${f.gloss}`).join('; ')}. For Plotinus, the Forms in Intellect are not separate; each one contains the rest.`,
  };
  const theOne = { form: one.key, text: `The One: ${one.one} Not one more item on the list: the reason the list holds together.` };

  for (const leap of leaps) for (const item of leap.items) { item.why = whyFor(item, leap, seeds, one); item.plain = plainFor(item, leap, seeds); }
  return { soul, nous, one: theOne };
}

export function listify(a) { return a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }

// One plain-English line per pick: what the data actually says.
function plainFor(item, leap, seeds) {
  const itags = new Set((item.tags || []).map(t => t.toLowerCase()));
  const shared = [...new Set(seeds.flatMap(s => (s.tags || []).filter(t => itags.has(t.toLowerCase()) && usable(t))))].slice(0, 2);
  const src = item.mock ? 'In the stand-in data' : 'Qloo';
  const aff = item.affinity ? ` (affinity ${Math.round(item.affinity * 100)}/100)` : '';
  const who = item.who ? ` by ${item.who}` : '';
  return `${src}${item.mock ? ',' : ' says'} people who love ${listify(seeds.slice(0, 3).map(s => s.name))} also gravitate to this ${({ letters: 'literature', art: 'art' })[leap.key] || leap.key} pick${who}${aff}${shared.length ? `; shared notes: ${shared.map(t => t.toLowerCase()).join(', ')}` : ''}.`;
}

function whyFor(item, leap, seeds, one) {
  const itags = new Set((item.tags || []).map(t => t.toLowerCase()));
  let best = seeds[hash(item.name) % Math.max(1, seeds.length)], shared = [];
  for (const s of seeds) {
    const sh = (s.tags || []).filter(t => itags.has(t.toLowerCase()) && usable(t));
    if (sh.length > shared.length) { best = s; shared = sh; }
  }
  const f = formsOf(item.tags || [])[0] || one;
  const from = best ? `${best.name}` : 'what you love';
  const bridge = shared.length ? `They share ${listify(shared.slice(0, 2).map(t => t.toLowerCase()))}` : 'Qloo hears the same people loving both';
  const lines = [
    `A leap from ${from} into ${leap.label.toLowerCase()}. ${bridge}. Plotinus would call it one Form, ${f.name.toLowerCase()} (${f.greek}), taking on different matter.`,
    `${bridge}. The matter changes from ${from} to ${item.name}, but the same ${f.name.toLowerCase()} shows through, the way one light passes through different glass.`,
    `${bridge}. ${item.name} is ${from} heard in another key. Soul feels the difference, and Nous sees that the Form, ${f.name.toLowerCase()}, is the same.`,
  ];
  return pick(lines, item.name + leap.key);
}
