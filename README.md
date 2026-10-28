# Aufhebung: the Dialectic Engine

**Enter two opposing ideas. Find the culture both sides share.**

**Live demo:** [aufhebung.vercel.app](https://aufhebung.vercel.app) (try [the bridge demo](https://aufhebung.vercel.app/?demo)).

People who disagree still read, watch and listen to a lot of the same things. Aufhebung finds that shared culture with Qloo's taste graph.

1. **Thesis:** an idea, e.g. "help yourself", plus one to four taste anchors that stand for it (*Thus Spoke Zarathustra*, *The Fountainhead*, *Whiplash*).
2. **Antithesis:** the opposite idea, e.g. "help others", with its own anchors (Simone Weil's *Gravity and Grace*, *It's a Wonderful Life*, *Les Misérables*).
3. **Synthesis (optional):** e.g. "help yourself by helping others". Leave it blank and the agent proposes one.

You get three cards, with the bridge first:

| Card | What's on it |
|---|---|
| **The bridge** | Books, films, music and one philosophy work that **both** audiences rate highly in Qloo. Each pick shows both affinity scores. |
| **Thesis** | What the thesis audience loves and the other side rates lower. |
| **Antithesis** | The same, mirrored. |

Above the cards are an **"understand the other side"** line (where to start the conversation) and a short **"what this says about you"** line. Every pick keeps a plain one-line reason, such as "Both audiences rate it highly: the help yourself side 91/100 and the help others side 89/100."

### The method (philosophy, not religion)

Plotinus stays as the visual style (rose window, arches, the glowing One) and as the Soul / Intellect / One reading method; the product itself is a Hegelian dialectic engine.


- **Hegel supplies the movement:** an idea, its opposite, and a higher unity that keeps both (*Aufhebung*). The synthesis doesn't split the difference.
- **Plotinus supplies the method.** Each side gets a **Soul** line (the textures its anchors share, from Qloo tags) and an **Intellect** line (the pattern, or "Form", underneath). The bridge card is **the One**: the shared thread the bridge reveals.
- **Nietzsche's will to power** is read as self-overcoming, never as domination over anyone.

### Secondary mode: read one taste

The original v1 is still available under the "Read one taste" tab. Name a few loves and it leaps into six domains (philosophy, music, painting, film, places, literature), with a plain line and a Plotinian line per pick and a Soul / Nous / One reading.

Built for the [Qloo LLM Hackathon](https://qloo.devpost.com/). MIT licensed.

## Run it

You need Node 18 or later. There are no dependencies to install.

```bash
cp .env.example .env          # then fill in QLOO_API_KEY (optional; without it you get mock data)
npm run dev                   # http://localhost:3000
npm test                      # offline smoke test (mock data)
npm run qloo:check            # live check against the Qloo hackathon API (needs QLOO_API_KEY)
```

- `http://localhost:3000/?demo` runs the bridge demo (help yourself vs help others) automatically, which is handy for the demo video. Add `&blank` to leave the synthesis empty so the agent proposes one.
- `?demo=taste` runs the single-taste demo.
- Add `&still` to turn off the reveal animations and `&noscroll` to stay at the top, for screenshots.

### Environment variables

Keys are only read from the environment. They are never committed or sent to the browser.

| Var | Required | Purpose |
|---|---|---|
| `QLOO_API_KEY` | for live data | Qloo hackathon key (sent as `X-Api-Key`) |
| `QLOO_BASE_URL` | no | Defaults to `https://hackathon.api.qloo.com` |
| `MOCK_QLOO` | no | Set to `1` to force mock data |
| `EXAMPLE_CACHE` | no | Private saved readings for the suggested examples (gzip+base64 JSON), used only when live Qloo fails, is empty or takes over ~8 s. Kept in Vercel env, never in the repo |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | no | Optional LLM narration (default `gemini-2.5-flash`) |
| `GROQ_API_KEY` / `GROQ_MODEL` | no | Optional LLM narration (default `llama-3.3-70b-versatile`) |

If there's no LLM key, the narration comes from deterministic templates. If there's no Qloo key, or a call fails, the app uses clearly labeled **stand-in** data. The UI shows a "stand-in" badge and a note so it's never mistaken for real recommendations.

## How Qloo is used

All calls are server-side, in `lib/qloo.js`, and use GET with an `X-Api-Key` header. 429, 5xx and network errors are retried with backoff (honoring `Retry-After`).

### The bridge (`lib/dialectic.js`)

1. **Resolve anchors:** `GET /search?query=…&types=…` turns each anchor into a Qloo entity.
2. **Per domain** (philosophy, books, film, music), make three Insights calls:
   - `GET /v2/insights?filter.type=<type>&signal.interests.entities=<thesis ids>`
   - the same with the antithesis ids
   - the same with both sides' ids together
3. **Re-rank the union against each side.** The candidates from all three calls (capped at 44, because Insights returns at most 50) are sent back with `filter.results.entities=<candidate ids>`, once signalled by the thesis and once by the antithesis. Every candidate now has two real affinity scores, `t` and `a`.
4. **Choose:**
   - **Bridge** = highest `min(t, a)`, so a pick only counts if *both* sides like it. The joint signal on its own leans toward whichever side has the stronger anchors, which is why the min of two separate rankings is used.
   - **Thesis / antithesis picks** = loved by one side and ranked lower by the other (relative rank within the domain).
   - **Philosophy** uses a resolved canon of 22 ethics and idealist works (Nietzsche, Rand, Emerson, Marcus Aurelius, Aristotle, Laozi, Kierkegaard, Camus, Buber, Frankl, Weil, Rousseau, Plotinus, Plato, Spinoza, Kant, Hegel, Leibniz…) ranked by Qloo for each side.
5. **Read:** Qloo tags feed each side's Soul line; regex "Forms" over the tags give the Intellect line; the Form both sides share most becomes the One. With an LLM key, Gemini or Groq rewrites the lines from Qloo data only and can't add picks.

A live bridge takes about 6 to 8 seconds.

### Single taste (`lib/agent.js`)

`/search` resolves the loves, then one `/v2/insights` call per domain makes each leap. Philosophy ranks a 16-work idealist and rationalist canon with `filter.results.entities`. Art uses `filter.tags=urn:tag:category:place:art_museum`; literature uses `urn:tag:genre:media:literary_fiction`.

### Qloo limitations we hit

- **Places are left out of the bridge.** `filter.type=urn:entity:destination` returns HTTP 400 when the signal is book-only anchors, and with film anchors the results are strongly Los Angeles-biased.
- **Take is capped at 50**, so the re-ranked candidate pool is capped at 44 (otherwise items come back missing with affinity 0).
- **Book-only anchors give noisy music** (e.g. unrelated regional artists). Adding a film or album anchor to a side steadies it.
- **Some works have no tags** (e.g. *Gravity and Grace*), and movie tags are often plot or title keywords ("Two word title"), which are filtered out of the reading.
- **Philosophy affinities run lower for a side whose anchors are mostly films**, so a philosophy bridge pick may be labeled "closest common ground" instead of "both rate it highly".

## Architecture

```
public/            static frontend (no build step)
  index.html       the page
  style.css        palette and type: ivory/gold/rose on near-black, Cormorant Garamond + Outfit
  bridge.js        the main flow: thesis / antithesis / synthesis form and the three cards
  app.js           single-taste form, shared helpers, staged reveal
  stage.js         canvas: rose window, arches, the glowing One, motes; brightens per level
  drone.js         optional Web Audio drone: ground → Soul (tremolo) → Intellect → One
api/oracle.js      the one serverless function (Vercel):
                   POST {thesis:{idea,anchors}, antithesis:{idea,anchors}, synthesis?}  -> bridge
                   POST {loves:[{name,domain}]}                                          -> single taste
lib/
  dialectic.js     the bridge: resolve → 3 insights per domain → re-rank per side → min score → read
  agent.js         single taste: resolve → leap → dedupe → read → narrate
  qloo.js          Qloo adapter (search, insights, retries) + mock switch
  leaps.js         the domains, the bridge domains and the philosophy canons
  plotinus.js      Soul / Intellect / One reading, the Forms (incl. virtue), plain + eerie lines
  llm.js           optional Gemini/Groq narration with template fallback
  mock.js          stand-in data (labeled mock)
dev-server.js      zero-dependency local server (serves public/ + /api/oracle)
test/              smoke test (offline) and live check
```

### Deploying (Vercel free tier)

1. Import the repo into Vercel. There's no build command, and `public/` is served statically.
2. Set `QLOO_API_KEY` (and an LLM key if you want) in Project → Settings → Environment Variables.
3. `vercel.json` gives the function a 30-second `maxDuration` for the multi-call reading.

## Data note

Per the hackathon FAQ, no Qloo response data is stored in this repo. The saved readings that keep the suggested examples working when Qloo is busy live in a private server-side cache (the `EXAMPLE_CACHE` env var), which the FAQ allows; live results always come first. Add `?fallback=1` to the page URL to see the saved reading of an example on demand. The mock data in `lib/mock.js` is hand-written stand-in content.

## License

MIT © 2026 Michael Matthews
