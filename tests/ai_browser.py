#!/usr/bin/env python3
"""E2E com mock HTTP do protocolo Ollama e aplicação real no navegador Chromium."""
import json
import importlib.util
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('sb_server',ROOT/'scripts/server.py')
srv=importlib.util.module_from_spec(spec);spec.loader.exec_module(srv)
requests=[]
class FakeOllama(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  raw=json.dumps({'models':[{'name':'qwen3:4b','size':2500000000}]}).encode()
  self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_POST(self):
  data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  requests.append(data)
  response={'message':{'role':'assistant','content':json.dumps({'answer':'Posso criar a Sala de espera com uma cadeira. Confira a proposta antes de aplicar.','proposals':[{'type':'create_room','name':'Sala de espera','team':'Atendimento'},{'type':'add_furniture','room':'Sala de espera','kind':'chair','x':2,'y':2}]})}}
  raw=json.dumps(response).encode()
  self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

fake=ThreadingHTTPServer(('127.0.0.1',0),FakeOllama)
srv.OLLAMA_BASE=f'http://127.0.0.1:{fake.server_port}'
server=ThreadingHTTPServer(('127.0.0.1',0),srv.Handler)
srv.PORT=server.server_port
threading.Thread(target=fake.serve_forever,daemon=True).start()
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://localhost:{server.server_port}/app/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'])
  page=browser.new_page(viewport={'width':1440,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # The container blocks Chromium HTTP traffic, so browser UI uses the same hermetic bundler
  # as the project's existing browser suite and mocks fetch. Backend HTTP is tested below.
  mocked_fetch="""
    (()=>{window.aiMockCalls=[];
    const nativeFetch=window.fetch;
    window.fetch=(url,init)=>{
      if(String(url)==='/api/ai/models') return Promise.resolve(new Response(JSON.stringify({connected:true,models:[{name:'qwen3:4b',size:2500000000}]}),{status:200,headers:{'content-type':'application/json'}}));
      if(String(url)==='/api/ai/chat'){
        const body=JSON.parse(init.body);window.aiMockCalls.push(body);
        return Promise.resolve(new Response(JSON.stringify({answer:'Posso criar a Sala de espera com uma cadeira. Confira a proposta.',proposals:[{type:'create_room',name:'Sala de espera',team:'Atendimento'},{type:'add_furniture',room:'Sala de espera',kind:'chair',x:2,y:2}]}),{status:200,headers:{'content-type':'application/json'}}));
      }
      return nativeFetch(url,init);
    };})();
  """
  page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
  page.evaluate(mocked_fetch)
  page.wait_for_timeout(600)

  expect(page.locator('.rail-version')).to_contain_text('2.6')
  assert page.locator('.rail-btn').count()==2
  page.locator('#ai-launch').click()
  expect(page.locator('#ai-panel')).to_be_visible()
  expect(page.locator('#ai-models')).to_have_value('qwen3:4b')
  expect(page.locator('#ai-connection')).to_contain_text('Conectado')
  before=page.evaluate('doc.environments.length')
  page.locator('#ai-input').fill('Crie uma sala de espera com uma cadeira.')
  page.locator('#ai-submit').click()
  expect(page.locator('#ai-preview')).to_be_visible(timeout=30000)
  assert page.locator('#ai-preview-list li').count()==2
  assert page.evaluate('doc.environments.length')==before
  page.locator('#ai-discard').click()
  assert page.evaluate('doc.environments.length')==before
  page.locator('#ai-input').fill('Crie uma sala de espera com uma cadeira.')
  page.locator('#ai-submit').click()
  expect(page.locator('#ai-preview')).to_be_visible(timeout=30000)
  page.locator('#ai-apply').click()
  expect(page.locator('#ai-undo')).to_be_visible()
  after=page.evaluate('doc.environments.length')
  assert after==before+1, (before,after)
  assert page.evaluate('doc.floorplan.objects.some(o=>o.kind==="chair")')
  page.locator('#ai-undo').click()
  assert page.evaluate('doc.environments.length')==before
  assert page.evaluate('window.aiMockCalls.length')==2
  assert page.evaluate('window.aiMockCalls[0].context.environments.length')>0
  # Exercise actual Python HTTP proxy separately with the fake Ollama upstream.
  modelsReply=json.load(urlopen(f'http://127.0.0.1:{server.server_port}/api/ai/models'))
  assert modelsReply['models'][0]['name']=='qwen3:4b'
  payload={'model':'qwen3:4b','message':'Crie uma sala de espera','context':{'name':'teste'},'history':[]}
  req=Request(f'http://127.0.0.1:{server.server_port}/api/ai/chat',data=json.dumps(payload).encode(),method='POST',headers={'Content-Type':'application/json','Origin':f'http://localhost:{server.server_port}'})
  reply=json.load(urlopen(req,timeout=10));assert reply['proposals'][0]['type']=='create_room'
  assert len(requests)==1 and requests[0]['format']=='json'
  # Cross-site requests may not use the Ollama proxy.
  hostile=Request(f'http://127.0.0.1:{server.server_port}/api/ai/chat',data=json.dumps(payload).encode(),method='POST',headers={'Content-Type':'application/json','Origin':'http://evil.example'})
  try: urlopen(hostile,timeout=5);raise AssertionError('Cross-origin request unexpectedly accepted')
  except HTTPError as exc: assert exc.code==403
  oversized=Request(f'http://127.0.0.1:{server.server_port}/api/ai/chat',data=b'a'*70000,method='POST',headers={'Content-Type':'application/json'})
  try: urlopen(oversized,timeout=5);raise AssertionError('Oversized request unexpectedly accepted')
  except HTTPError as exc: assert exc.code==413
  assert len(requests[0]['messages'])>=3
  page.set_viewport_size({'width':390,'height':844})
  page.locator('#ai-close').click();page.locator('#ai-launch').click()
  expect(page.locator('#ai-panel')).to_be_visible()
  rect=page.locator('#ai-panel').bounding_box();assert rect and rect['width']<=392,rect
  page.locator('#ai-clear').click()
  assert page.locator('#ai-messages .ai-message').count()==1
  assert not errors,errors
  page.screenshot(path=str(ROOT/'docs/preview-ollama-v25-mobile.png'))
  print('PASS e2e Ollama HTTP: modelos, chat, proposta, descarte, aplicação, desfazer, celular')
  browser.close()
finally:
 server.shutdown();fake.shutdown()
