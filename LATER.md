# Later (ideas, deliberately not built)

The core stays small: two opposing ideas with taste anchors in, three cards out (thesis, antithesis, the bridge). The single-taste reading stays as a secondary tab.

## Dialectic: deliberately out of scope

- **Free-form debate chat:** arguing with the agent, or letting the two sides talk.
- **Multi-round chains:** the synthesis becomes a new thesis, and so on.
- **Long essays:** the reading stays at one or two lines per level.
- **Anchor-less ideas:** map a bare idea ("freedom") to anchors automatically, e.g. through Qloo tag search or an LLM suggestion the user confirms.
- **Places in the bridge:** destinations return HTTP 400 for book-only signals and skew to Los Angeles for film signals; add them back with `signal.location` or a location filter.
- **Bridge strength meter:** show how much overlap exists overall, not just the top picks.
- **Audience lens:** Qloo demographics for each side (`signal.demographics`).

## General

- **Share card:** render the One plus 6 picks as an image or OG card for a reading.
- **"Turn the dial":** re-run a single leap with the next-best picks without recomputing the whole reading.
- **Location-aware places:** use `signal.location` or `filter.location.query` so the Places leap suggests somewhere you could actually go this month.
- **Painters as entities:** if Qloo adds person or visual-artist coverage, make "Painting" a direct leap instead of going through museums.
- **More philosophers:** add Proclus, Iamblichus, Ficino, Cusanus, Schelling and Bradley to the canon, and split it into "idealist" and "rationalist" sub-leaps.
- **Audience lens:** use Qloo demographics (`signal.demographics`) to show who else shares this thread.
- **Compare two people:** reuse the bridge with two people's loves instead of two ideas.
- **Saved readings:** local-only history in `localStorage`, with no server storage (because of the data terms).
- **Streaming reveal:** stream each level over SSE as it resolves, instead of waiting about 7 seconds.
- **Richer audio:** tune the drone's intervals to the dominant Form, and generate a short Web Audio motif per reading.
- **Accessibility pass:** a reduced-motion mode for the canvas, and screen-reader summaries of each level.
- **Caching:** an edge cache for `/search` lookups of the canon and common seeds.
