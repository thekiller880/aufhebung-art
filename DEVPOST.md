# Aufhebung: the Dialectic Engine

**Live:** https://aufhebung.vercel.app (instant demo: https://aufhebung.vercel.app/?demo) · **Code:** https://github.com/thekiller880/aufhebung-art (MIT)

**Tagline:** Enter two opposing ideas. An agent finds the culture both sides already share.

## What the agent does on its own
You type two opposing ideas, e.g. "Rancid" vs "Conway Twitty", or "war" vs "peace". That's it. The agent then runs a multi-step loop against the Qloo Taste AI API, with no further input:

1. **Reads each idea.** It calls Qloo `/search` (artists, films, books, TV) and `/v2/tags` in parallel and decides what the text is: a named thing becomes that entity; a plain word Qloo knows as a genre/theme ("war") becomes the best-loved works with that tag (`/v2/insights` + `filter.tags`). Nonsense gets an honest "couldn't find that", never invented data.
2. **Fixes its own mistakes.** An anchor typed under the wrong kind ("Rancid" as a book matches *Rancid Aluminum*) is re-searched as any kind. If Qloo rejects a side's anchors as a signal for some type (HTTP 400 "invalid"), the agent borrows that side's own top picks from a type that works and retries. 429/5xx calls back off and retry; a domain that still fails is left out with the reason shown.
3. **Maps both audiences.** Per domain (books, film, music, philosophy): `/v2/insights` signalled by the thesis, by the antithesis, and by both together, about 20 Insights calls per bridge.
4. **Scores fairly.** It pools the candidates and calls `/v2/insights` again with `filter.results.entities` to re-rank every candidate **against each side separately**. Bridge score = `min(thesis affinity, antithesis affinity)` minus a small penalty for near-universal mega-hits. The joint signal alone just echoes the louder side; the min of two rankings finds real overlap.
5. **Decides and explains.** It picks the bridge, then for each side the works that side loves and the other rates lower, proposes a synthesis if you left it blank, and writes a one-line reason with both real scores for every pick.
6. **Shows its work.** "How the agent got here" lists every step and Qloo call it made.

## Who it's for
Shared culture as a place to start a hard conversation:
- **Mediators** looking for neutral ground.
- **Community organizers** bringing together neighbors who vote, worship or live differently.
- **Teachers** running a debate who want students to see what the other side actually loves.
- **Divided families and friends**: the uncle and the niece who can't talk politics but might love the same band.

(Brands could also use it to see what two audiences share, but that's a side use.)

## Judging criteria
- **Technological implementation:** Uses Qloo's API in a non-obvious way (per-side re-ranking with `filter.results.entities` + min-score). It resolves free text into entities or tags, recovers from errors on its own, and has no npm dependencies: one Node serverless function and a static frontend on Vercel's free tier. An optional Gemini/Groq pass only rewrites prose from Qloo's data and can't add picks; without it, a deterministic template writes everything.
- **Design:** One input screen (two ideas, "Try an example" fills one pair in one tap). Results lead with a single sentence: "Understand the other side: both audiences love X, Y and Z. Start the conversation there." Every pick shows two affinity bars, one per side. The look (rose-window geometry, a radiant "Nous" intro) works on desktop and phone.
- **Potential impact:** Polarized people stop talking about ideas but still share films, books and records. Aufhebung points to that common ground with real data, giving a mediator, a teacher or a family member a concrete, non-political first topic.
- **Quality of the idea:** Hegel's *Aufhebung* is a synthesis that keeps both sides and lifts them. The app makes that literal: thesis, antithesis, and a bridge made of culture both sides already love. Plotinus supplies the reading of each side: Soul (what it feels, from Qloo tags), Intellect (the pattern underneath), the One (the shared thread). The philosophy stays as a lens, never a sermon.

## Challenges
- The joint taste signal leans toward the louder side, so we added the per-side re-rank and min score.
- Insights returns at most 50 results, so the candidate pool is capped to keep every score real.
- Some anchors aren't accepted as a signal for some output types, which led to the borrow-and-retry step.
- Mega-hits score high with every audience; a small popularity penalty keeps the bridge specific to the pair.

## What's next
Places in the bridge once location signals work, shareable bridge cards, and multi-round chains (the synthesis becomes the next thesis).

## Built with
Qloo Taste AI API (`/search`, `/v2/tags`, `/v2/insights`) · Node.js · Vercel · Canvas 2D · Web Audio API · optional Gemini / Groq
