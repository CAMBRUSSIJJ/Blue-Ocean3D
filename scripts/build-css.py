#!/usr/bin/env python3
"""Bundle production CSS in source order without changing specificity or cascade."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
app=root/'app'
manifest=json.loads((app/'css-manifest.json').read_text())
out=['/* Service Builder v2.3.2 | generated file; edit individual CSS source files. */']
for name in manifest:
    source=(app/name).resolve()
    if source.parent != app.resolve() or not source.is_file() or source.name == 'styles-bundle.css':
        raise SystemExit(f'Invalid CSS source: {name}')
    out.append(f'\n/* SOURCE: {name} */\n{source.read_text()}')
(app/'styles-bundle.css').write_text('\n'.join(out)+'\n')
print(f'Bundled {len(manifest)} CSS source files into app/styles-bundle.css')
