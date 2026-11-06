#!/usr/bin/env python3
"""Package the current application, vendored assets and Linux instructions."""
import argparse
import hashlib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT=Path(__file__).resolve().parents[1]
PREFIX='Blue-Ocean3D-Linux/'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'downloads/Blue-Ocean3D-Linux-UX.zip')
args=parser.parse_args()
output=args.output.resolve()
checksum=output.with_suffix(output.suffix+'.sha256')
paths=set()
for name in ['README.md','LEIA-PRIMEIRO-LINUX.txt','package.json','ABRIR-LINUX.sh',
             'INICIAR-WINDOWS.bat','WINDOWS-LEIA-PRIMEIRO.txt','VERSAO.txt','vercel.json']:
    path=ROOT/name
    if path.is_file():paths.add(path)
for folder in ['app','vendor','scripts','docs','tests']:
    for path in (ROOT/folder).rglob('*'):
        if not path.is_file() or path.is_symlink() or path.resolve() in {output,checksum}:continue
        if any(part in {'.git','node_modules','__pycache__','.cache'} for part in path.relative_to(ROOT).parts):continue
        if path.suffix in {'.pyc','.log'}:continue
        paths.add(path)
output.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(output,'w',compression=ZIP_DEFLATED,compresslevel=6) as archive:
    for path in sorted(paths):
        name=path.relative_to(ROOT).as_posix()
        info=ZipInfo(PREFIX+name)
        info.create_system=3
        info.external_attr=(0o100755 if path.suffix=='.sh' else 0o100644)<<16
        info.compress_type=ZIP_DEFLATED
        archive.writestr(info,path.read_bytes())
with ZipFile(output) as archive:
    if archive.testzip() is not None:raise SystemExit('ZIP integrity check failed')
    for path in paths:
        if archive.read(PREFIX+path.relative_to(ROOT).as_posix())!=path.read_bytes():
            raise SystemExit(f'Packaged source differs: {path.name}')
digest=hashlib.sha256(output.read_bytes()).hexdigest()
checksum.write_text(digest+'  '+output.name+'\n')
print(f'Linux package verified: {len(paths)} files, {output.stat().st_size} bytes')
print(output)
