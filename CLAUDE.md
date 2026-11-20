# Sharpen: notes for Claude

A brain-training web app for one user's iPhone (portrait, Home Screen app). It's a daily 5-minute workout
for vocabulary, quick math, memory and writing, in the spirit of paid brain-training apps. **Original games,
name, look and content.** Don't copy any existing app's games, wording or art.
Static site, no build step, no server, no dependencies. Hosted on GitHub Pages from `main`:
https://jafarthearab.github.io/Sharpen/ (pushing to `main` publishes in about a minute; the phone may cache for ~10 min).
The user also has a separate project, OnKey (singing practice); the two are not linked.

The user is not a developer: use plain language and give exact taps, no jargon. Build in stages and check in
after each one. Ask before adding any library. All content (words, definitions, sentences) is written for this
app; never scrape or copy from dictionaries or other apps.

## Status
- **Stage 1: built 2026-11-19, waiting for the user to try it on the iPhone.** Home (today's workout of 3 games
  with streak, skills with levels 1-10, extra practice), and four games:
  Word Power (meanings + fill-the-blank, missed words come back via spaced review), Mental Math (60 s,
  4 choices, everyday math: tips, sales, splits, percentages), List Recall (study a list, tap the words),
  Clear Writing (pick the correct sentence, short rule shown).
- Ideas for later stages (ask the user first): more games per area (names & faces, number memory, reading
  speed/comprehension, synonyms, spelling), more words, a progress chart, reminders.

## Code map
- `js/main.js`: screens (home, intro, play, result, workout done). `js/plan.js`: daily plan, levels, streak (pure).
- `js/store.js`: localStorage key `sharpen.v1` (`games[id] = {level, history, last}`, `words` = spaced-review boxes,
  `seen` = writing items, `days[date] = {plan, done}`).
- `js/games/meta.js` (names/blurbs), `js/games/{vocab,math,memory,writing}.js` each export `run(root, ctx)` that
  resolves to `{pct, summary, extra?, review[], reviewNote?}`. `ctx = {level, data, day, signal, status(text)}`.
  `js/games/ui.js`: shared answer buttons + "Next".
- `js/content/`: `words.js` + `words-more.js` (tiers 1-3), `sentences.js` + `sentences-more.js` (tiers 1-3; add new
  items at the end only, ids are by position), `listwords.js`, `pronounce.js`
  (every word needs a "say it" respelling; `SPEAK_AS` fixes words the phone voice says wrong). `js/speak.js`: 🔊 button
  using the built-in Web Speech voice. Avoid near-synonyms in the same tier (they become wrong
  answers for each other).
- Levels: 100% jumps up two, 85%+ goes up one, under 55% goes down one.
- Answers and main buttons sit at the bottom of the screen (thumb reach, user's request); main buttons use `.dock`.

## Tests (run from the repo root)
- `node tests/logic.test.mjs`: content sanity, plan, streak, levels, word review, math at all levels.
- `python3 -m http.server 8766` then `node tests/e2e.cjs`: plays a whole workout in a phone-sized browser,
  plus math in landscape. Screenshots in `tests/out/` (gitignored). Look at them before reporting a stage.

## Conventions
- Commit as the user (author `Justin <justfar@live.com>`), committer Claude <noreply@anthropic.com> (a hook requires it:
  `GIT_COMMITTER_NAME=Claude GIT_COMMITTER_EMAIL=noreply@anthropic.com git commit ...`), with the Co-Authored-By/Claude-Session trailers.
- Keep `[hidden]{display:none!important}`. Light and dark mode both supported via CSS variables.
