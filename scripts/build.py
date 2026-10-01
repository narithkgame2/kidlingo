#!/usr/bin/env python3
"""Assemble src/ + audio/clips.json into the app.

  python3 scripts/build.py

Writes docs/ (what GitHub Pages serves: index.html, sw.js, manifest, icons) and dist/kidlingo.html (the same page as one
file, e.g. to open locally). Warns about any text without a voice clip.
"""
import hashlib, json, shutil, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from texts import texts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
src, web, docs = ROOT / "src", ROOT / "web", ROOT / "docs"
shell = (src / "index.html").read_text(encoding="utf-8")
clips = json.loads((ROOT / "audio" / "clips.json").read_text(encoding="utf-8"))

missing = [t for t in texts() if t not in clips]
if missing:
    print(f"WARNING: {len(missing)} texts have no voice clip (device speech fallback). Run scripts/generate_audio.py:")
    print("  " + ", ".join(missing[:20]) + (" …" if len(missing) > 20 else ""))

page = (shell
        .replace("/*@@STYLES@@*/", (src / "styles.css").read_text(encoding="utf-8"))
        .replace("/*@@DATA@@*/", (src / "data.js").read_text(encoding="utf-8"))
        .replace("/*@@APP@@*/", (src / "app.js").read_text(encoding="utf-8"))
        .replace("/*@@AUDIO@@*/", json.dumps(clips, ensure_ascii=False).replace("</", "<\\/")))
build = hashlib.sha1(page.encode()).hexdigest()[:10]

(ROOT / "dist").mkdir(exist_ok=True)
(ROOT / "dist" / "kidlingo.html").write_text(page, encoding="utf-8")
docs.mkdir(exist_ok=True)
(docs / "index.html").write_text(page, encoding="utf-8")
(docs / "sw.js").write_text((web / "sw.js").read_text(encoding="utf-8").replace("__BUILD__", build), encoding="utf-8")
shutil.copy(web / "manifest.webmanifest", docs / "manifest.webmanifest")
shutil.copytree(web / "icons", docs / "icons", dirs_exist_ok=True)
(docs / ".nojekyll").write_text("")
print(f"built docs/ and dist/kidlingo.html ({len(page) // 1024} KB, {len(clips)} clips, build {build})")
