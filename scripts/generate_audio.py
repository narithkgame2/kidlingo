#!/usr/bin/env python3
"""Generate the Japanese voice clips for every text in src/data.js into audio/clips.json.

Default engine: VOICEVOX (free, offline, natural Japanese with correct pitch accent), run locally from
tools/voicevox_engine (git-ignored; started and stopped by this script). Fallback: Kokoro-82M (--engine kokoro).
Clips are AAC (.m4a) made by macOS's afconvert, stored base64 so the page stays one self-contained file.
Only missing or changed clips are made; unused ones are removed. Switching voice or engine remakes everything.

  .venv/bin/python scripts/generate_audio.py                 # add missing clips (VOICEVOX, the speaker in VOICE)
  .venv/bin/python scripts/generate_audio.py --force         # remake everything
  .venv/bin/python scripts/generate_audio.py --only いぬ ねこ
  .venv/bin/python scripts/generate_audio.py --samples 2 8 14 # one sample file per VOICEVOX style id, to compare

Setup once: python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt, and unzip the VOICEVOX engine
(voicevox_engine-macos-arm64-*.vvpp from github.com/VOICEVOX/voicevox_engine/releases) into tools/voicevox_engine.
"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from texts import texts, roles  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "audio" / "clips.json"
META = ROOT / "audio" / "clips.meta.json"
VV_DIR = ROOT / "tools" / "voicevox_engine"
VV_URL = "http://127.0.0.1:50021"
KOKORO_MODELS = Path(os.environ.get("KOKORO_MODELS", Path.home() / "Desktop/Speak Like A Leader/tools/models"))

# Two voices, like a teacher and a model: the COACH asks and praises, the MODEL says the Japanese the child copies.
# VOICEVOX style ids (compare with --samples); each needs its credit line in parent mode (VOICEVOX's terms).
COACH = {"speaker": 8, "name": "春日部つむぎ", "speed": 0.95}
MODEL = {"speaker": 2, "name": "四国めたん", "speed": 0.88}
VOICE = {"speaker": MODEL["speaker"], "speed": MODEL["speed"]}      # used by --samples
LEAD, TAIL = 0.15, 0.08          # seconds of quiet before / after (phones can clip the first sound)
READ_AS = {"は": "ハ", "へ": "ヘ", "はち": "ハチ"}  # single kana that would be read as particles (wa, e)


def even(a, sr):
    """Same loudness for every clip, peaks below 0.9, with the lead-in and tail."""
    a = a.astype(np.float32)
    voiced = a[np.abs(a) > 0.01]
    if voiced.size:
        a = a * min(0.08 / float(np.sqrt(np.mean(voiced ** 2))), 0.9 / float(np.max(np.abs(a))))
    pad = lambda s: np.zeros(int(sr * s), dtype=np.float32)
    return np.concatenate([pad(LEAD), a, pad(TAIL)])


class VoiceVox:
    def __init__(self, speaker, speed):
        self.speaker, self.speed, self.proc = speaker, speed, None
        self.speeds = {}
        if not self.alive():
            run = VV_DIR / "run"
            if not run.exists():
                sys.exit(f"VOICEVOX engine not found at {run}. See the setup note at the top of this script.")
            self.proc = subprocess.Popen([str(run), "--host", "127.0.0.1", "--port", "50021"], cwd=VV_DIR,
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for _ in range(240):
                if self.alive(): break
                time.sleep(0.5)
            else:
                sys.exit("VOICEVOX engine did not start.")

    def alive(self):
        try:
            return urllib.request.urlopen(VV_URL + "/version", timeout=1).status == 200
        except Exception:
            return False

    def post(self, path, body=None, **params):
        url = f"{VV_URL}{path}?{urllib.parse.urlencode(params)}"
        data = json.dumps(body).encode() if body is not None else b""
        req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
        return urllib.request.urlopen(req, timeout=120).read()

    def wav(self, text, speaker=None):
        sp = speaker if speaker is not None else self.speaker
        q = json.loads(self.post("/audio_query", text=READ_AS.get(text, text), speaker=sp))
        q.update(speedScale=self.speeds.get(sp, self.speed), prePhonemeLength=0.0, postPhonemeLength=0.05, outputSamplingRate=24000)
        with tempfile.NamedTemporaryFile(suffix=".wav") as f:
            f.write(self.post("/synthesis", q, speaker=sp)); f.flush()
            a, sr = sf.read(f.name, dtype="float32")
        return even(a, sr), sr

    def styles(self):
        return {s["id"]: f'{p["name"]} ({s["name"]})' for p in json.loads(urllib.request.urlopen(VV_URL + "/speakers").read()) for s in p["styles"]}

    def close(self):
        if self.proc:
            self.proc.terminate()


class Kokoro:
    def __init__(self, voice="jf_alpha", speed=0.9):
        from kokoro_onnx import Kokoro as K
        from misaki import ja
        self.k = K(str(KOKORO_MODELS / "kokoro-v1.0.onnx"), str(KOKORO_MODELS / "voices-v1.0.bin"))
        self.g2p, self.voice, self.speed = ja.JAG2P(version="pyopenjtalk"), voice, speed

    def wav(self, text, speaker=None):
        ph, _ = self.g2p(READ_AS.get(text, text)); ph = ph[:len(ph) // 2]   # sounds, then a pitch string: keep the sounds
        a, sr = self.k.create(ph, voice=self.voice, speed=self.speed, is_phonemes=True)
        return even(a, sr), sr

    def close(self):
        pass


def m4a(a, sr):
    with tempfile.TemporaryDirectory() as tmp:
        w, m = Path(tmp, "c.wav"), Path(tmp, "c.m4a")
        sf.write(w, a, sr)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", str(w), str(m)], check=True)
        return m.read_bytes()


SAMPLE_LINES = ["いぬ", "いただきます", "こんにちは！ いっしょに にほんごを べんきょう しよう。", "トイレに いきたい", "よく できました！", "げんき？", "とうきょうに つきました！"]


def samples(ids):
    """One file per voice in voice-samples/, the same lines with a pause between, to choose a voice by ear."""
    v = VoiceVox(VOICE["speaker"], VOICE["speed"]); names = v.styles(); out = ROOT / "voice-samples"; out.mkdir(exist_ok=True)
    try:
        for sid in ids:
            parts = []
            for t in SAMPLE_LINES:
                a, sr = v.wav(t, sid); parts += [a, np.zeros(int(sr * 0.6), dtype=np.float32)]
            name = names.get(sid, str(sid)).replace(" ", "_").replace("/", "-")
            sf.write(out / f"voicevox_{sid}_{name}.wav", np.concatenate(parts), sr)
            print("sample", sid, names.get(sid))
    finally:
        v.close()


def main():
    if "--samples" in sys.argv:
        return samples([int(x) for x in sys.argv[sys.argv.index("--samples") + 1:]])
    force = "--force" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1:] if "--only" in sys.argv else None
    use_kokoro = "--engine" in sys.argv and sys.argv[sys.argv.index("--engine") + 1] == "kokoro"
    engine_id = "kokoro|jf_alpha|0.9" if use_kokoro else f'voicevox|coach{COACH["speaker"]}@{COACH["speed"]}|model{MODEL["speaker"]}@{MODEL["speed"]}'
    engine_id += f"|lead{LEAD}|v3"
    meta = json.loads(META.read_text()) if META.exists() else {}
    clips = json.loads(OUT.read_text()) if OUT.exists() and meta.get("engine") == engine_id and not force else {}
    role = dict(roles()); wanted = list(role)
    todo = only if only else [t for t in wanted if t not in clips]
    v = Kokoro() if use_kokoro else VoiceVox(MODEL["speaker"], MODEL["speed"])
    if not use_kokoro: v.speeds = {COACH["speaker"]: COACH["speed"], MODEL["speaker"]: MODEL["speed"]}
    try:
        for n, t in enumerate(todo, 1):
            a, sr = v.wav(t) if use_kokoro else v.wav(t, (COACH if role.get(t) == "coach" else MODEL)["speaker"])
            clips[t] = base64.b64encode(m4a(a, sr)).decode()
            print(f"{n}/{len(todo)} {t}")
    finally:
        v.close()
    removed = [t for t in clips if t not in wanted]
    OUT.write_text(json.dumps({t: clips[t] for t in wanted}, ensure_ascii=False))
    credit = "Kokoro-82M, voice jf_alpha (Apache 2.0)" if use_kokoro else f'VOICEVOX:{COACH["name"]}, VOICEVOX:{MODEL["name"]}'
    META.write_text(json.dumps({"engine": engine_id, "format": "audio/mp4", "credit": credit}, ensure_ascii=False))
    print(f"{len(wanted)} clips ({len(todo)} made, {len(removed)} removed) -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
