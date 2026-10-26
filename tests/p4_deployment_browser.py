#!/usr/bin/env python3
"""Check the exact static Vercel build rather than in-memory HTML."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass

if not (DIST/'app'/'index.html').exists() or not (DIST/'index.html').exists():
 raise RuntimeError('Run node scripts/build-vercel.mjs first')
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(DIST)))
Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(server.server_port)
try:
 for suffix in ('/','/app/','/app/styles-bundle.css','/app/app.mjs','/vendor/three/three.module.min.js'):
  with urlopen(url+suffix,timeout=10) as response:
   assert response.status==200,(suffix,response.status)
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1366,'height':768})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  for path in ('/','/app/'):
   page.goto(url+path,wait_until='domcontentloaded')
   expect(page.locator('#hybrid-journey-list')).to_be_visible(timeout=15000)
   expect(page.locator('#hybrid-layout-compare')).to_be_visible()
   assert page.evaluate("getComputedStyle(document.querySelector('.rooms-shell')).display")!='none'
   assert page.locator('link[href="./styles-bundle.css"]').count()==1
  assert not errors,errors
  browser.close()
 print('PASS Production build routes / and /app/ with JS, CSS, Three.js and responsive editor')
finally:
 server.shutdown()
 server.server_close()
