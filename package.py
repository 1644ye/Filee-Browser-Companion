"""Build the small, allowlisted user distribution; no profiles or test outputs."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent
version=json.loads((root/'extension/manifest.json').read_text())['version']
output=root/'dist';output.mkdir(exist_ok=True)
package=output/f'Filee-Browser-Companion-{version}.zip'
files=['extension/manifest.json','extension/background.js','extension/svg-drag.js','README.md','TESTING.md','LICENSE']
with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
    for name in files: archive.write(root/name,name)
with zipfile.ZipFile(package) as archive:
    assert sorted(archive.namelist())==sorted(files)
    assert archive.testzip() is None
digest=hashlib.sha256(package.read_bytes()).hexdigest()
(output/'SHA256SUMS.txt').write_text(f'{digest}  {package.name}\n',encoding='utf-8')
print(package.name,package.stat().st_size,'bytes',digest)
