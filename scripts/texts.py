"""Every Japanese string the app can speak, read from src/data.js (the source of truth for audio).

Runs data.js in macOS's built-in JavaScript engine (osascript), so no Node is needed.
"""
import json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FOOTER = """
;(function(){ const set = new Set();
  ALL.forEach(t => t.words.forEach(w => set.add(w.k)));
  KANA.forEach(k => set.add(k)); KATA.forEach(k => set.add(k));
  Object.values(TALK).forEach(a => a.forEach(([jp]) => set.add(jp)));
  SPOKEN_EXTRA.forEach(t => set.add(t));
  return JSON.stringify([...set]); })()"""


def texts():
    code = (ROOT / "src" / "data.js").read_text(encoding="utf-8") + FOOTER
    with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as f:
        f.write(code)
    out = subprocess.run(["osascript", "-l", "JavaScript", f.name], capture_output=True, text=True, check=True).stdout
    Path(f.name).unlink(missing_ok=True)
    return json.loads(out)


if __name__ == "__main__":
    print(json.dumps(texts(), ensure_ascii=False))
