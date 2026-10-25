// The deliberate cross-domain "leaps". Each is one Qloo Insights call.
// Michael's taste is wide on purpose: philosophy -> music -> painting -> film -> place -> letters.
export const LEAPS = [
  { key: 'philosophy', label: 'Philosophy · the Golden Chain', type: 'book', tags: 'urn:tag:genre:media:philosophy', canon: true },
  { key: 'music', label: 'Music', type: 'artist' },
  { key: 'art', label: 'Painting & visual art', type: 'place', tags: 'urn:tag:category:place:art_museum' },
  { key: 'film', label: 'Film', type: 'movie' },
  { key: 'place', label: 'Places', type: 'destination' },
  { key: 'letters', label: 'Literature', type: 'book', tags: 'urn:tag:genre:media:literary_fiction' },
];

// The "Golden Chain" (aurea catena) of idealist and rationalist philosophy.
// Resolved through Qloo /search at runtime (cached in memory), then ranked by Qloo Insights
// against the user's loves with filter.results.entities. `must` guards against a wrong search hit.
export const CANON = [
  { q: 'The Enneads', must: /ennead/i, who: 'Plotinus' },
  { q: 'Timaeus', must: /timaeus/i, who: 'Plato' },
  { q: "Plato's Republic", must: /republic/i, who: 'Plato' },
  { q: 'The Consolation of Philosophy', must: /consolation of philosophy/i, who: 'Boethius' },
  { q: 'Summa Theologica', must: /summa/i, who: 'Aquinas' },
  { q: 'Meister Eckhart', must: /eckhart/i, who: 'Eckhart' },
  { q: 'The Cloud of Unknowing', must: /cloud of unknowing/i, who: 'anonymous mystic' },
  { q: 'Jacob Boehme', must: /boehme|böhme/i, who: 'Boehme' },
  { q: 'Meditations on First Philosophy', must: /meditations on first/i, who: 'Descartes' },
  { q: 'Spinoza Ethics', must: /spinoza/i, who: 'Spinoza' },
  { q: 'Monadology', must: /monadology/i, who: 'Leibniz' },
  { q: 'The Rationalists Descartes Spinoza Leibniz', must: /rationalists/i, who: 'Descartes, Spinoza, Leibniz' },
  { q: 'Principles of Human Knowledge', must: /principles of human knowledge|berkeley/i, who: 'Berkeley' },
  { q: 'Critique of Pure Reason', must: /critique of pure reason/i, who: 'Kant' },
  { q: 'Phenomenology of Spirit', must: /phenomenology of spirit/i, who: 'Hegel' },
  { q: 'Science of Logic Hegel', must: /science of logic/i, who: 'Hegel' },
];

// What the user may label a love as; 'auto' lets Qloo's search pick the type.
export const INPUT_DOMAINS = { auto: 'auto', music: 'artist', book: 'book', philosophy: 'book', film: 'movie', tv: 'tv_show', place: 'place', art: 'place', destination: 'destination', podcast: 'podcast' };

// Dialectic mode: the domains the bridge is built in (destinations are left out: on the hackathon
// key they return HTTP 400 or a location-biased list when signalled by books alone).
export const BRIDGE_DOMAINS = [
  { key: 'philosophy', label: 'Philosophy', type: 'book', canon: true },
  { key: 'letters', label: 'Books', type: 'book' },
  { key: 'film', label: 'Film', type: 'movie' },
  { key: 'music', label: 'Music', type: 'artist' },
];

// Philosophy pool for the bridge: the Golden Chain plus ethics on both sides of "self vs others".
export const ETHICS_CANON = [
  { q: 'Beyond Good and Evil', must: /beyond good and evil/i, who: 'Nietzsche' },
  { q: 'The Virtue of Selfishness', must: /virtue of selfishness/i, who: 'Rand' },
  { q: 'Self-Reliance Emerson', must: /self-reliance/i, who: 'Emerson' },
  { q: 'Meditations Marcus Aurelius', must: /meditations/i, who: 'Marcus Aurelius' },
  { q: 'Nicomachean Ethics', must: /nicomachean/i, who: 'Aristotle' },
  { q: 'Tao Te Ching', must: /tao te ching/i, who: 'Laozi' },
  { q: 'Fear and Trembling', must: /fear and trembling/i, who: 'Kierkegaard' },
  { q: 'The Myth of Sisyphus', must: /myth of sisyphus/i, who: 'Camus' },
  { q: 'I and Thou', must: /i and thou/i, who: 'Buber' },
  { q: "Man's Search for Meaning", must: /search for meaning/i, who: 'Frankl' },
  { q: 'Gravity and Grace', must: /gravity and grace/i, who: 'Weil' },
  { q: 'The Need for Roots', must: /need for roots/i, who: 'Weil' },
  { q: 'Thus Spoke Zarathustra', must: /zarathustra/i, who: 'Nietzsche' },
  { q: 'The Social Contract', must: /social contract/i, who: 'Rousseau' },
];
