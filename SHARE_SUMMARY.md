# Aufhebung: the Dialectic Engine. Where we are (for outside opinions)

*Formerly "the Plotinian Taste Agent". Plotinus stays as the visual style (rose window, arches, the glowing One) and as the Soul / Intellect / One reading method; the product itself is a Hegelian dialectic engine.*

I'm Michael. I'm still running this project, and my AI build partner is still the lead. I'm sharing it to get a few extra opinions. Please critique it and suggest improvements rather than redesigning it from scratch.

## 1. Core concept (new headline: the dialectic bridge)
- **"Enter two opposing ideas. Find the culture both sides share."** A web app and agent for the Qloo hackathon.
- **Input:**
  - Thesis, e.g. "help yourself", with taste anchors such as *Thus Spoke Zarathustra*, *The Fountainhead* and *Whiplash*.
  - Antithesis, e.g. "help others", with anchors such as Simone Weil's *Gravity and Grace*, *It's a Wonderful Life* and *Les Misérables*.
  - An optional synthesis, e.g. "help yourself by helping others". If it's blank, the agent proposes one.
- **Output, bridge first:**
  - **The bridge:** books, films, music and philosophy both audiences rate highly in Qloo, with both scores shown. Live demo: *The Grand Budapest Hotel* (91/89), *One Flew Over the Cuckoo's Nest* (89/89), John Lennon (87/91), *Life of Pi* (86/88).
  - An "understand the other side" line, then a short "what this says about you" line.
  - Thesis and antithesis cards: what each side loves that the other rates lower, each with a Soul line (textures) and an Intellect line (pattern).
- **Real problem:** people who disagree still share culture. This finds it, as a place to start talking.
- **Framing:** philosophy, not religion. Hegel gives the movement (idea, opposite, higher unity). Plotinus gives the method (Soul, Intellect, the One as the shared thread). Nietzsche's will to power means self-overcoming, never domination. No preachy language; every pick keeps a plain one-line reason.
- **Look:** unchanged. Eerie and haunted, with a rose window, arches, a glowing One and an optional soft drone. The bridge card glows as the payoff.

## 2. How it uses Qloo
- For each domain, three Insights calls: signalled by the thesis, by the antithesis, and by both.
- The union of results is re-ranked against each side with `filter.results.entities`, and the bridge score is min(thesis, antithesis). The joint signal alone leaned toward the stronger side, so this matters.
- **Limits hit:**
  - Places are left out of the bridge: destinations return 400 for book-only anchors and skew to Los Angeles for film anchors.
  - Results are capped at 50 per call.
  - Book-only anchors make the music noisy.

## 3. Secondary mode and the later list
- **Secondary mode:** the original single-taste reading (a few loves, six cross-domain leaps, Soul / Nous / One) is still there as a "Read one taste" tab.
- **On the later list, not in the build:**
  - a free-form debate chat
  - multi-round dialectic chains
  - long AI essays
  - anchor-less ideas
  - places in the bridge
  - share cards and more philosophers

## 4. Qloo hackathon rules (closely paraphrased)
- A working app that integrates the Qloo API and works as an agentic tool, is built on an agent framework, or adds Qloo to an existing agent.
- A link to a functional demo, available free and without restriction until judging ends.
- A public GitHub, GitLab or Bitbucket repo with all source code and instructions, plus an open-source license that is visible in the repo's About section.
- A text description of the features. A video isn't on the requirements list, but judges may judge from the description, images and video alone.
- Deadline: Oct 30, 2026, 11:45pm ET. No changes after that.
- Multiple entries are allowed only if each one is "unique and substantially different."
- Judging is a pass/fail fit check first, then four equal criteria: technical use of Qloo, design and complete experience, a real problem for a real audience, and creative, non-obvious use of Qloo.

## 5. What exists now
- A working bridge on real Qloo data (about 6 to 8 seconds per run), on my build machine only, not online yet.
- An offline mock mode and tests.
- An MIT license, a README and a Devpost draft that pitches the bridge.
- The narration uses templates; a free Gemini or Groq key would switch on live narration.

## 6. Next steps
1. Put it online on Vercel's free tier.
2. Put the code on GitHub, public, with the license.
3. Record a short demo video.
4. Submit on Devpost before Oct 30.

## What I'd love from you
- Does the headline land for a judge who doesn't know Hegel or Plotinus?
- Is "help yourself vs help others" the strongest demo pair, or is there a sharper one?
- What's the one change that would most improve our odds?
