#!/usr/bin/env python3
from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
issues=[]
html=(root/"browser-private.html").read_text(encoding="utf-8")
bundle=(root/"browser-private.bundle.mjs").read_text(encoding="utf-8")
for token in ("unsafe-inline","unsafe-eval","http://","https://"):
    if token in html: issues.append(f"HTML contiene {token}")
if re.search(r"<script(?![^>]*src=)[^>]*>\s*\S",html,re.I): issues.append("script inline")
if re.search(r"\son[a-z]+=",html,re.I): issues.append("handler inline")
for token in ("localStorage.setItem","sessionStorage.setItem","insertAdjacentHTML",".innerHTML"):
    if token in bundle: issues.append(f"bundle contiene {token}")
for rel in ("browser-private.html","browser-private.css","browser-private.bundle.mjs","vendor/fflate/fflate-0.8.3.esm.js","vendor/fflate/LICENSE.txt"):
    if not (root/rel).is_file(): issues.append(f"falta {rel}")
print(json.dumps({"ok":not issues,"issues":issues,"bundleBytes":len(bundle.encode())},ensure_ascii=False,indent=2))
sys.exit(0 if not issues else 1)
