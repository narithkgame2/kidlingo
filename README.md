# Kidlingo

A Japanese learning app for young children: a train ride across Japan (e-sugoroku), picture words, everyday phrases
with "hear yourself" recording, hiragana and katakana tracing, and はなまる rewards, plus a parent mode for progress,
meanings and a progress file.

- **Use it:** open the GitHub Pages link on iPhone or iPad, then Share → Add to Home Screen. Works offline after the
  first visit.
- **Change content:** edit `src/data.js`, then `.venv/bin/python scripts/generate_audio.py` and `python3 scripts/build.py`.
- **Continue with Claude Code:** open this folder and start `claude`. `CLAUDE.md` has the full project context.

Voice: Kokoro-82M (Apache 2.0), voice jf_alpha. See `audio/VOICE_LICENSE.md`.
