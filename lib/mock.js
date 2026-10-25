// STAND-IN DATA. Not from Qloo. Used only when QLOO_API_KEY is missing (or MOCK_QLOO=1)
// so the whole flow can be demoed end to end. Every object carries mock: true.
const M = (name, domain, year, tags, description) => ({ id: `mock:${domain}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, domain, year, tags, description, mock: true });

const CATALOG = [
  M('Radiohead', 'artist', 1985, ['melancholy', 'experimental', 'electronic', 'alienation', 'atmospheric'], 'Oxford band of dread and beauty.'),
  M('Burial', 'artist', 2005, ['nocturnal', 'urban', 'ghostly', 'electronic', 'melancholy'], 'Hauntological UK garage.'),
  M('Dead Can Dance', 'artist', 1981, ['ethereal', 'mystical', 'ancient', 'gothic', 'sacred'], 'Neoclassical dark-wave liturgy.'),
  M('Arvo Pärt', 'artist', 1935, ['sacred', 'minimal', 'stillness', 'choral', 'mystical'], 'Tintinnabuli: bells and silence.'),
  M('Boards of Canada', 'artist', 1986, ['nostalgic', 'hazy', 'eerie', 'electronic', 'nature'], 'Decayed childhood broadcasts.'),
  M('Dune', 'book', 1965, ['cosmic', 'prophecy', 'desert', 'mystical', 'power'], 'Frank Herbert.'),
  M('Ficciones', 'book', 1944, ['labyrinth', 'infinite', 'metaphysical', 'mystery', 'philosophical'], 'Jorge Luis Borges.'),
  M('The Enneads', 'book', 270, ['metaphysical', 'mystical', 'philosophical', 'ascent', 'sacred'], 'Plotinus.'),
  M('House of Leaves', 'book', 2000, ['labyrinth', 'horror', 'uncanny', 'experimental', 'dark'], 'Mark Z. Danielewski.'),
  M('Twin Peaks', 'tv_show', 1990, ['surreal', 'uncanny', 'dreamlike', 'dark', 'mystery'], 'David Lynch and Mark Frost.'),
  M('Blade Runner', 'movie', 1982, ['nocturnal', 'melancholy', 'urban', 'cosmic', 'alienation'], 'Ridley Scott.'),
  M('Stalker', 'movie', 1979, ['stillness', 'metaphysical', 'ruin', 'sacred', 'pilgrimage'], 'Andrei Tarkovsky.'),
  // Dialectic demo anchors (stand-in).
  M('Thus Spoke Zarathustra', 'book', 1883, ['philosophical', 'self-overcoming', 'ascent', 'solitude', 'poetic'], 'Nietzsche.'),
  M('The Fountainhead', 'book', 1943, ['individualism', 'ambition', 'architecture', 'philosophical'], 'Ayn Rand.'),
  M('Whiplash', 'movie', 2014, ['ambition', 'self-overcoming', 'intense', 'music'], 'Damien Chazelle.'),
  M('Gravity and Grace', 'book', 1947, ['compassion', 'attention', 'philosophical', 'mystical'], 'Simone Weil.'),
  M("It's a Wonderful Life", 'movie', 1946, ['compassion', 'community', 'nostalgic', 'redemption'], 'Frank Capra.'),
  M('Les Misérables', 'movie', 2012, ['compassion', 'redemption', 'tragedy', 'romantic'], 'Tom Hooper.'),
  M('2001: A Space Odyssey', 'movie', 1968, ['cosmic', 'transcendence', 'ascent', 'minimal', 'mystery'], 'Stanley Kubrick.'),
];

const RECS = {
  philosophy: [
    M('The Enneads', 'book', 270, ['metaphysical', 'mystical', 'ascent', 'sacred', 'philosophical'], 'Plotinus. The One, Intellect, Soul.'),
    M('Monadology', 'book', 1714, ['metaphysical', 'infinite', 'philosophical', 'cosmic'], 'Leibniz. Windowless mirrors of the universe.'),
    M('Ethics', 'book', 1677, ['philosophical', 'stillness', 'cosmic', 'metaphysical'], 'Spinoza. God or Nature, more geometrico.'),
    M('Phenomenology of Spirit', 'book', 1807, ['labyrinth', 'philosophical', 'ascent', 'metaphysical'], 'Hegel. Spirit coming to know itself.'),
    M('Beyond Good and Evil', 'book', 1886, ['philosophical', 'self-overcoming', 'solitude'], 'Nietzsche.'),
    M('Meditations', 'book', 180, ['philosophical', 'self-overcoming', 'compassion', 'stillness'], 'Marcus Aurelius.'),
    M('I and Thou', 'book', 1923, ['philosophical', 'compassion', 'attention', 'community'], 'Martin Buber.'),
    M('Summa Theologiae', 'book', 1274, ['sacred', 'philosophical', 'ancient', 'ascent'], 'Thomas Aquinas.'),
  ],
  music: [
    M('Bruce Springsteen', 'artist', 1949, ['community', 'ambition', 'redemption', 'nostalgic'], 'Working-class epics.'),
    M('Nina Simone', 'artist', 1933, ['intense', 'compassion', 'self-overcoming', 'soul music'], 'High priestess of soul.'),
    M('Grouper', 'artist', 2005, ['ethereal', 'hazy', 'stillness', 'melancholy'], 'Drowned, reverb-soaked hymns.'),
    M('Coil', 'artist', 1982, ['occult', 'experimental', 'dark', 'electronic'], 'Esoteric industrial alchemy.'),
    M('Hildegard von Bingen', 'artist', 1098, ['sacred', 'choral', 'mystical', 'ancient'], 'Visionary medieval chant.'),
    M('William Basinski', 'artist', 1958, ['ruin', 'minimal', 'melancholy', 'nostalgic'], 'The Disintegration Loops.'),
    M('Lustmord', 'artist', 1980, ['cosmic', 'dark', 'atmospheric', 'nocturnal'], 'Dark ambient from the abyss.'),
  ],
  letters: [
    M('The Cloud of Unknowing', 'book', 1375, ['mystical', 'sacred', 'stillness', 'ascent'], 'Anonymous English mystic.'),
    M('Les Misérables (novel)', 'book', 1862, ['compassion', 'redemption', 'tragedy', 'ambition'], 'Victor Hugo.'),
    M('The Count of Monte Cristo', 'book', 1844, ['ambition', 'redemption', 'solitude', 'romantic'], 'Alexandre Dumas.'),
    M('Solaris', 'book', 1961, ['cosmic', 'uncanny', 'philosophical', 'alienation'], 'Stanisław Lem.'),
    M('The Rings of Saturn', 'book', 1995, ['melancholy', 'ruin', 'nostalgic', 'pilgrimage'], 'W. G. Sebald.'),
    M('Invisible Cities', 'book', 1972, ['labyrinth', 'dreamlike', 'urban', 'philosophical'], 'Italo Calvino.'),
    M('The Hour of the Star', 'book', 1977, ['alienation', 'metaphysical', 'melancholy'], 'Clarice Lispector.'),
  ],
  film: [
    M('Rocky', 'movie', 1976, ['ambition', 'self-overcoming', 'community', 'redemption'], 'John G. Avildsen.'),
    M('Magnolia', 'movie', 1999, ['compassion', 'redemption', 'intense', 'melancholy'], 'Paul Thomas Anderson.'),
    M('Mulholland Drive', 'movie', 2001, ['surreal', 'uncanny', 'dreamlike', 'mystery'], 'David Lynch.'),
    M('The Mirror', 'movie', 1975, ['nostalgic', 'dreamlike', 'stillness', 'sacred'], 'Andrei Tarkovsky.'),
    M('Under the Skin', 'movie', 2013, ['alienation', 'uncanny', 'nocturnal', 'minimal'], 'Jonathan Glazer.'),
    M('Annihilation', 'movie', 2018, ['cosmic', 'nature', 'uncanny', 'transcendence'], 'Alex Garland.'),
    M('Wings of Desire', 'movie', 1987, ['ethereal', 'urban', 'melancholy', 'ascent'], 'Wim Wenders. Angels over Berlin.'),
  ],
  art: [
    M('Rothko Chapel', 'place', 1971, ['sacred', 'stillness', 'minimal', 'pilgrimage'], 'Houston. Fourteen dark canvases.'),
    M('St. Louis Cemetery No. 1', 'place', 1789, ['ruin', 'gothic', 'dark', 'ancient'], 'New Orleans city of the dead.'),
    M('The Cloisters', 'place', 1938, ['sacred', 'ancient', 'stillness', 'mystical'], 'Medieval monastery, Manhattan.'),
    M('Dia Beacon', 'place', 2003, ['minimal', 'stillness', 'ruin'], 'Former box factory turned temple of art.'),
  ],
  place: [
    M('Delphi', 'destination', -800, ['ancient', 'prophecy', 'sacred', 'pilgrimage'], 'Seat of the oracle.'),
    M('Rome', 'destination', -753, ['ancient', 'ruin', 'philosophical', 'sacred'], 'Where Plotinus taught.'),
    M('Alexandria', 'destination', -331, ['ancient', 'philosophical', 'labyrinth', 'ruin'], 'Where Plotinus studied under Ammonius.'),
    M('Iceland Highlands', 'destination', 874, ['cosmic', 'nature', 'stillness', 'desert'], 'Lunar emptiness.'),
  ],
};

function hashTags(name) {
  const pool = ['melancholy', 'mystical', 'uncanny', 'nocturnal', 'cosmic', 'nostalgic', 'labyrinth', 'sacred', 'stillness', 'dark', 'dreamlike', 'philosophical'];
  let h = 0; for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [0, 1, 2, 3].map(i => pool[(h >>> (i * 5)) % pool.length]).filter((v, i, a) => a.indexOf(v) === i);
}

export function mockSearch(name, domain) {
  const q = name.trim().toLowerCase();
  if (domain === 'auto') domain = 'entity';
  const hit = CATALOG.find(e => e.name.toLowerCase() === q) || CATALOG.find(e => e.name.toLowerCase().includes(q) || q.includes(e.name.toLowerCase()));
  if (hit) return { ...hit };
  return M(name.trim(), domain, undefined, hashTags(name), 'Stand-in entity (not in the mock catalog).');
}

export function mockInsights(domain, seedIds, { take = 4 } = {}) {
  const seedTags = new Map();
  for (const id of seedIds) {
    const e = CATALOG.find(x => x.id === id) || { tags: hashTags(id.split(':').pop()) };
    for (const t of e.tags) seedTags.set(t, (seedTags.get(t) || 0) + 1);
  }
  return (RECS[domain] || [])
    .filter(e => !seedIds.includes(e.id))
    .map(e => ({ ...e, _score: e.tags.reduce((s, t) => s + (seedTags.get(t) || 0), 0) }))
    .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
    .slice(0, take)
    .map(({ _score, ...e }) => e);
}

/** Stand-in affinity for every RECS item of a domain against some seeds: 0.6 + 0.08 per shared tag (capped). */
export function mockRank(domain, seedIds) {
  const seedTags = new Set();
  for (const id of seedIds) { const e = CATALOG.find(x => x.id === id) || { tags: hashTags(id.split(':').pop()) }; e.tags.forEach(t => seedTags.add(t)); }
  return (RECS[domain] || []).filter(e => !seedIds.includes(e.id))
    .map(e => ({ ...e, affinity: Math.min(0.97, 0.6 + 0.08 * e.tags.filter(t => seedTags.has(t)).length) }))
    .sort((a, b) => b.affinity - a.affinity || a.name.localeCompare(b.name));
}
