# Kidlingo: project guide for Claude

A Japanese learning app for young children (early readers who are not native speakers). One self-contained page,
published free on GitHub Pages, installable on iPhone/iPad (home-screen icon) and usable offline.
Private context (who it's for, family preferences): `CLAUDE.local.md` (git-ignored, never publish it).

## Commands
```bash
python3 scripts/build.py                     # src/ + audio/clips.json -> docs/ (GitHub Pages) and dist/kidlingo.html
.venv/bin/python scripts/generate_audio.py   # make missing voice clips (Kokoro jf_alpha, offline); --force remakes all
```
Always rebuild after editing anything in `src/`, `web/` or `audio/`. Never hand-edit `docs/` or `dist/`.
No Node or ffmpeg needed: texts are listed with macOS's built-in JavaScript (`osascript`, `scripts/texts.py`) and
clips are encoded with macOS `afconvert`. Voice setup once: `python3.12 -m venv .venv && .venv/bin/pip install -r
requirements.txt`; the Kokoro model files come from `KOKORO_MODELS` (default: Speak Like a Leader's `tools/models`).
`tests/smoke.mjs` (Playwright) still works where Node is installed.

## Layout
| Path | What |
|---|---|
| `src/index.html` | Page shell (head with viewport, manifest, icons) with `/*@@STYLES@@*/ /*@@DATA@@*/ /*@@APP@@*/ /*@@AUDIO@@*/` |
| `src/styles.css` | All CSS. Tokens on `:root` (paper/ink/shu red/leaf/sun/sky/plum). Deliberately light-only and playful (it's for kids). |
| `src/data.js` | All content: `THEMES`, `PHRASES` (optional scene `sc`), `EN`, `TALK`, kana tables + `STROKES`, `romaji()`, `SPOKEN_EXTRA`, `JOURNEY`, `rowChars()` |
| `src/app.js` | Storage, audio, rewards, journey, screens, games, recording, parent mode |
| `web/` | `sw.js` (offline), `manifest.webmanifest`, `icons/` (icon-180/192/512: a red はなまる around あ) |
| `audio/clips.json` | `{ "japanese text": base64 AAC (.m4a) }`, inlined into the build; `clips.meta.json` = engine id |
| `scripts/texts.py` | Every speakable text from `data.js` (source of truth for audio) |
| `docs/` | Built site that GitHub Pages serves (index.html, sw.js, manifest, icons, .nojekyll) |

## How the app works
- **Home = the journey**: an e-sugoroku train ride across Japan (`JOURNEY`): ほっかいどう → とうきょう → ふじさん →
  きょうと → おおさか → ひろしま → ふくおか → おきなわ, 37 stops. A stop is a topic lesson (word or phrase) or a kana row to
  trace (`h0`..`h9`, `k0`..`k9`; row 9 = わをん). Stops zig-zag down a railway; the train 🚃 waits at the next stop,
  finished stops show 1-3 はなまる (`S.stars`), later stops are locked (tap = wiggle). The big **つぎ** button opens the
  next stop. Finishing a stop the first time sets `ARRIVE`: back on the map the train rides on, and entering a new
  region says "…に ついた！" and gives a region sticker. Free play (ことば / おはなし / かく / シール) sits above the
  map; finishing a topic or row there counts for the journey too (`stopDone`).
- **Screens** (`go(name, arg)`): `home`, `themes`, `phrases`, `lesson`, `kana`, `trace`, `stickers`, `parent`.
- **Word lesson**: learn cards → 5× listen-and-tap → 4× read-and-tap → memory match → "say it to Mama/Papa".
- **Phrase lesson**: learn cards → 4× なんていう？ → 3× listen → 2× read (answers in one wide column) → shadowing with
  **hear yourself**: 🎤 records up to 6 s (`bindRecorder`, https only), 👂 replays it; a grown-up taps いえた！.
- **Phrase scenes** (`sc` in `PHRASES`, rendered by `scene()`): the speaker gets the speech bubble, an arrow shows
  leaving (➡️) or coming home (⬅️), 🌅/🌇 the time of day. Used where emoji alone were ambiguous (いってきます,
  いってらっしゃい, ただいま, おかえり, ありがとう, どういたしまして, どうぞ, ごめんなさい, いいよ).
- **Stars**: lessons from first tries (`tally`; ≥85% 3, ≥50% 2, else 1); kana rows from failed checks (0 = 3, ≤2 = 2).
  Best kept. Stops finished before stars existed show 3.
- **Tracing**: masu square canvas, faded Klee One glyph, coverage ≥ 0.7 and precision ≥ 0.78 at 72px. Shows stroke
  count, not stroke order. In a journey row (`RS`) the row's kana are shown on top and traced in turn.
- **Rewards**: はなまる count, daily streak (にち), hanko stamp, stickers (topics, regions, kana milestones, はなまる, streaks).
- **Mastery**: a word/phrase is learned after ≥3 correct with the last 2 in a row; answers after the hint don't count.
- **State**: `localStorage` key `kidlingo.v1`: `{hana, days[], words{}, kana{}, themes{}, stickers{}, stars{},
  settings{kana, rate, sfx}}`. Additive keys only; no renames without a migration. Parent mode has **Save / Load
  progress file** (`app:'kidlingo'`; share sheet on iPhone/iPad) to move progress between devices.
- **Offline**: `sw.js` (network-first page with a saved copy, Google Fonts cached on first load, only `kidlingo-`
  caches). Registered only on http(s).

## Design decisions (keep unless Nick changes them)
- **Child view is Japanese + pictures only.** No romaji where the child looks. English meaning only behind **?** on
  learn cards, never in games. Parent mode has English + romaji, progress, talk-together lines, settings, backup.
- Cultural rewards: はなまる, hanko, masu squares, and the e-sugoroku journey (the traditional Japanese picture board
  game of travel; Japanese children still make their own at school).
- Everyday child-life phrases, not travel phrases. Emoji are the illustrations; scenes compose emoji.
- **Audio pacing**: audio that starts by itself waits `LEAD` (450 ms) after a screen appears; parts of one prompt have
  `GAP` (380 ms) between them; every clip starts with 150 ms of silence. The first tap also plays a silent sound on the
  shared `player` so iPhones allow later playback.

## Audio
- Voice: **Kokoro-82M** `jf_alpha` (Apache 2.0), speed 0.9, read by misaki (`pyopenjtalk` mode; misaki returns the
  sounds followed by a pitch string of the same length, so keep the first half). `READ_AS` fixes single-kana particles
  (は, へ). Even loudness per clip. Stored as base64 AAC; the player uses `data:audio/mp4`.
- Every string passed to `say()` must have a clip: add it to `data.js` (instructions in `SPOKEN_EXTRA`), run
  `generate_audio.py`, then `build.py` (it warns about missing clips). Device speech is only a last resort.
- If sound fails, a red muted-speaker button appears in the header with diagnostics (hidden otherwise).

## Adding content
1. Words: `['かな','emoji']` in a `THEMES` topic **and** the English in `EN[topicId]` at the same index. New topics
   also need a `TALK` entry (parent mode crashes without it), a `hue`, and a place in `JOURNEY`.
2. Phrases: `['かな','emoji','English']` (+ optional scene `{s:[...], sp, t, sub}`). Spaces between bunsetsu.
3. Katakana topics: `kata:true`.
4. Regenerate audio, build, check screenshots (phone 430px and iPad 1024px).

## Publishing
GitHub Pages serves `docs/` from `main`. Publish only on Nick's explicit go-ahead. Never commit `CLAUDE.local.md`,
`.venv/` or `voice-samples/` (all git-ignored).

## Backlog
- Long vowel (ー) and small っ listening game; stroke-order guidance (KanjiVG data); Khmer hints (Nick reviews);
  the family's own phrases and voices (see CLAUDE.local.md).
