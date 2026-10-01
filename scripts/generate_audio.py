#!/usr/bin/env python3
"""Generate the Japanese voice clips for every text in src/data.js into audio/clips.json.

Kokoro-82M (Apache 2.0), voice "jf_alpha": a natural neural voice, fully offline and free. Japanese is read with
misaki + Open JTalk's dictionary. Clips are AAC (.m4a) made by macOS's afconvert, stored base64 so the page stays
one self-contained file. Only missing or changed clips are made; unused ones are removed.

  .venv/bin/python scripts/generate_audio.py            # add missing clips
  .venv/bin/python scripts/generate_audio.py --force    # remake everything
  .venv/bin/python scripts/generate_audio.py --only いぬ ねこ

Setup once: python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
Model files: KOKORO_MODELS (default: the Speak Like a Leader tools/models folder).
"""
import base64, json, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from texts import texts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "audio" / "clips.json"
META = ROOT / "audio" / "clips.meta.json"
MODELS = Path(os.environ.get("KOKORO_MODELS", Path.home() / "Desktop/Speak Like A Leader/tools/models"))

VOICE, SPEED = "jf_alpha", 0.9
LEAD, TAIL = 0.15, 0.08          # seconds of quiet before / after (phones can clip the first sound)
ENGINE = f"kokoro|{VOICE}|{SPEED}|lead{LEAD}|v1"
# Single kana that are read as particles when spoken alone (は→wa, へ→e).
READ_AS = {"は": "ハ", "へ": "ヘ"}


class Voice:
    def __init__(self):
        from kokoro_onnx import Kokoro
        from misaki import ja
        self.k = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
        self.g2p = ja.JAG2P(version="pyopenjtalk")

    def phonemes(self, text):
        ph, _ = self.g2p(READ_AS.get(text, text))
        ph = ph[:len(ph) // 2]            # misaki returns the sounds followed by a pitch pattern of the same length
        if "❓" in ph:
            raise ValueError(f"unknown word in {text!r}: {ph}")
        return ph

    def wav(self, text):
        a, sr = self.k.create(self.phonemes(text), voice=VOICE, speed=SPEED, is_phonemes=True)
        a = a.astype(np.float32)
        voiced = a[np.abs(a) > 0.01]
        if voiced.size:                    # even loudness for every clip, peaks below 0.9
            a = a * min(0.08 / float(np.sqrt(np.mean(voiced ** 2))), 0.9 / float(np.max(np.abs(a))))
        pad = lambda s: np.zeros(int(sr * s), dtype=np.float32)
        return np.concatenate([pad(LEAD), a, pad(TAIL)]), sr


def clip(v, text):
    with tempfile.TemporaryDirectory() as tmp:
        wav, m4a = Path(tmp, "c.wav"), Path(tmp, "c.m4a")
        a, sr = v.wav(text); sf.write(wav, a, sr)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", str(wav), str(m4a)], check=True)
        return base64.b64encode(m4a.read_bytes()).decode()


def main():
    force = "--force" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1:] if "--only" in sys.argv else None
    same_engine = META.exists() and json.loads(META.read_text()).get("engine") == ENGINE
    clips = json.loads(OUT.read_text()) if OUT.exists() and same_engine and not force else {}
    wanted = texts()
    todo = only if only else [t for t in wanted if t not in clips]
    v = Voice()
    for n, t in enumerate(todo, 1):
        clips[t] = clip(v, t)
        print(f"{n}/{len(todo)} {t}")
    removed = [t for t in clips if t not in wanted]
    OUT.write_text(json.dumps({t: clips[t] for t in wanted}, ensure_ascii=False))
    META.write_text(json.dumps({"engine": ENGINE, "format": "audio/mp4"}))
    print(f"{len(wanted)} clips ({len(todo)} made, {len(removed)} removed) -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
