#!/usr/bin/env python3
"""Bundle CSS with explicit cascade layers; component styles never use !important."""
import json
import re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
app=root/'app'
manifest=json.loads((app/'css-manifest.json').read_text())
layers=['sb-'+Path(name).stem for name in manifest]
out=['/* Service Builder | generated file; edit CSS sources listed in css-manifest.json. */',
     '@layer '+', '.join(layers)+';']
for name in manifest:
    source=(app/name).resolve()
    if source.parent != app.resolve() or not source.is_file() or source.name == 'styles-bundle.css':
        raise SystemExit(f'Invalid CSS source: {name}')
    css=source.read_text()
    if re.search(r'!\s*important\b',css,re.I):
        raise SystemExit(f'Use cascade layers instead of !important: {name}')
    out.append(f'\n/* SOURCE: {name} */\n@layer sb-{source.stem} {{\n{css}\n}}')
# The single semantic exception protects the HTML hidden contract, including
# dialogs and controls with inline display styles. It is not a design override.
out.append('\n/* HTML visibility invariant */\n[hidden] { display: none !important; }')
(app/'styles-bundle.css').write_text('\n'.join(out)+'\n')
print(f'Bundled {len(manifest)} CSS source files into app/styles-bundle.css')
