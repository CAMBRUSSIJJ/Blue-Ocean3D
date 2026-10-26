#!/usr/bin/env python3
"""E2E específico da proposta de um serviço completo, sem exigir modelo externo."""
import json
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
plan={'type':'build_service','rooms':[
  {'name':'Triagem personalizada','team':'Acolhimento','activities':[{'title':'Avaliar entrada','duration':6}],
  'furniture':[{'kind':'counter','x':2,'y':2,'activity':'Avaliar entrada'}],'doors':[{'wall':'bottom','offset':1}]},
  {'name':'Sala de atendimento adicional','team':'Atendimento','activities':[{'title':'Atender cliente','duration':20}],
  'furniture':[{'kind':'desk','x':3,'y':2,'activity':'Atender cliente'}],'doors':[{'wall':'bottom','offset':1}]}
], 'connections':[{'fromRoom':'Triagem personalizada','fromActivity':'Avaliar entrada','toRoom':'Sala de atendimento adicional','toActivity':'Atender cliente'}], 'autoCorridors':True, 'linkInRoom':True}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 page.evaluate('''(plan)=>{const f=window.fetch.bind(window);window.fetch=(url,opts)=>{
   if(String(url)==='/api/ai/models') return Promise.resolve(new Response(JSON.stringify({connected:true,models:[{name:'qwen3:4b'}]}),{status:200}));
   if(String(url)==='/api/ai/chat') return Promise.resolve(new Response(JSON.stringify({answer:'Plano de duas salas preparado. Revise antes de aplicar.',proposals:[plan]}),{status:200}));
   return f(url,opts);
 }}''',plan)
 page.locator('#ai-launch').click()
 expect(page.locator('#ai-panel')).to_be_visible()
 page.locator('#ai-input').fill('Construa duas salas conectadas')
 page.locator('#ai-submit').click()
 expect(page.locator('#ai-preview')).to_be_visible(timeout=12000)
 expect(page.locator('#ai-preview details')).to_have_count(1)
 baseline=page.evaluate('doc.environments.length')
 page.locator('#ai-preview summary').click()
 assert page.locator('#ai-preview details[open] li').count()==2
 assert page.evaluate('doc.environments.length')==baseline
 page.locator('#ai-apply').click()
 expect(page.locator('#ai-preview')).to_be_hidden()
 assert page.evaluate('doc.environments.length')==baseline+2
 assert page.evaluate('doc.edges.some(e=>doc.nodes.find(n=>n.id===e.from)?.environmentId!==doc.nodes.find(n=>n.id===e.to)?.environmentId)')
 assert page.evaluate('doc.floorplan.corridors.length>0')
 page.locator('#ai-undo').click()
 assert page.evaluate('doc.environments.length')==baseline
 assert not errors,errors
 print('PASS E2E v2.6: proposta completa, prévia, aprovação, corredor, desfazer')
 b.close()
