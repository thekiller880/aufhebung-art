# Aufhebung: the Dialectic Engine (Devpost draft)

**Tagline:** Enter two opposing ideas. Find the culture both sides share.

## The problem
People who disagree about how to live usually stop talking at the level of ideas. But they still go to the same films, read the same novels and play the same records. That shared culture is common ground nobody points at. Teachers running a debate, moderators, couples, and anyone stuck in an argument with a friend can use it as a place to start.

## What it does
1. You enter a **thesis** ("help yourself") and an **antithesis** ("help others"). Each gets one to four **taste anchors** that Qloo can read: *Thus Spoke Zarathustra*, *The Fountainhead* and *Whiplash* on one side; Simone Weil's *Gravity and Grace*, *It's a Wonderful Life* and *Les Misérables* on the other.
2. You can add a **synthesis** ("help yourself by helping others"), or leave it blank and the agent proposes one.
3. The agent asks **Qloo's Taste AI** what each side's audience loves across books, film, music and philosophy, then scores every candidate against both sides.
4. **The bridge** comes first: works both audiences rate highly, each with both scores. In the live demo that's *The Grand Budapest Hotel* (91/89), *One Flew Over the Cuckoo's Nest* (89/89), John Lennon (87/91), *Life of Pi* (86/88).
5. A one-line **"understand the other side"** tells you where to start the conversation, followed by a brief **"what this says about you"** line.
6. Then come the **thesis** and **antithesis** cards: what each side loves that the other rates lower. Each has a **Soul** line (the textures that side feels, from Qloo tags) and an **Intellect** line (the pattern underneath).

Every pick keeps a plain one-line reason with real affinity scores. The philosophy is a lens, not a religion: Hegel gives the movement (idea, opposite, a higher unity that keeps both), Plotinus gives the method (Soul, Intellect, and the One as the shared thread), and Nietzsche's will to power is read as self-overcoming, never domination.

A secondary mode, **Read one taste**, is the original single-taste reading: cross-domain leaps from a few loves, read on three levels.

## How we built it
- **Name and look:** *Aufhebung* is Hegel's word for a synthesis that keeps both sides and lifts them higher. Plotinus stays as the visual style (rose window, arches, the glowing One) and as the Soul / Intellect / One reading method; the product itself is a Hegelian dialectic engine.
- **Qloo, used non-obviously:** for each domain we make three Insights calls (signalled by the thesis, by the antithesis, and by both), take the union, then call Insights again with `filter.results.entities` to **re-rank every candidate against each side separately**. The bridge score is `min(thesis affinity, antithesis affinity)`. We found that the joint signal alone just echoes whichever side has the stronger anchors; the min of two rankings finds genuine overlap.
- **Philosophy:** a 22-work ethics and idealist canon (Nietzsche, Rand, Emerson, Marcus Aurelius, Aristotle, Laozi, Kierkegaard, Camus, Buber, Frankl, Weil, Plato, Plotinus, Spinoza, Kant, Hegel…) is resolved through `/search` and ranked by Qloo for each side.
- **LLM (optional):** Gemini or Groq rewrites the lines from Qloo's data only. It can't invent picks. Without a key, a deterministic template engine writes them.
- **Stack:** a static HTML/CSS/JS frontend (canvas and Web Audio, no framework) and one Node serverless function on Vercel's free tier. No dependencies.

## Challenges
- The joint taste signal is biased toward the louder side, so we built the per-side re-rank and min score.
- Insights caps results at 50, so the candidate pool had to be capped to keep every score real.
- Destinations return 400 for book-only signals and skew to Los Angeles for film signals, so places stay out of the bridge for now.
- Some anchors have no tags, and movie tags are often title keywords. We filter those so the Soul line reads as feeling, not metadata.
- Keeping philosophy readable and not preachy: each pick gets a plain sentence first.

## What's next
See LATER.md: places in the bridge once location works, anchor-less ideas, share cards, a debate chat and multi-round chains.

## Built with
Qloo Taste AI API · Node.js · Vercel · Web Audio API · Canvas 2D · Gemini / Groq (optional)
