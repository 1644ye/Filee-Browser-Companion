"""Real Chrome DOM regressions (not a native OS drag end-to-end test)."""
from pathlib import Path
import argparse, functools, http.server, threading, subprocess, re, json, html, tempfile
parser=argparse.ArgumentParser()
parser.add_argument('--chrome',default=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
results={}
try:
    with tempfile.TemporaryDirectory(prefix='.test-profile-',dir=root,ignore_cleanup_errors=True) as profile:
        for page in sorted((root/'tests').glob('*.html')):
            if page.name.startswith('.') or page.name == 'manual.html': continue
            command=[args.chrome,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--user-data-dir='+profile,'--virtual-time-budget=3000','--dump-dom',f'http://127.0.0.1:{server.server_port}/tests/{page.name}']
            process=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
            match=re.search(r'<pre id="results">(.*?)</pre>',process.stdout.decode('utf-8',errors='replace'),re.S)
            if not match or not match[1].strip():
                (root/'tests'/'.failed-dom.html').write_bytes(process.stdout)
            cases=json.loads(html.unescape(match[1])) if match and match[1].strip() else [{'pass':False,'error':'No test results'}]
            results[page.name]={'passed':sum(c.get('pass') is True for c in cases),'failed':[c for c in cases if c.get('pass') is not True]}
finally: server.shutdown()
print(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(any(r['failed'] for r in results.values()))
