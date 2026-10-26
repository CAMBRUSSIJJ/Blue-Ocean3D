#!/usr/bin/env python3
"""Self-contained Chromium smoke tests; no network or changes to user's browser storage."""
import shutil
import os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
import json
BASE=Path(__file__).resolve().parents[1]
root=BASE/'app'
OUT=BASE/'artifacts'/'browser-smoke';OUT.mkdir(parents=True,exist_ok=True)
html=inline_app(BASE if "BASE" in globals() else ROOT)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1536,'height':960},device_scale_factor=1,accept_downloads=True)
 page.evaluate("""() => {const memory={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]}})}""")
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 assert page.locator('.canvas-node').count()==8
 assert page.locator('.library-card').count()==7
 assert page.locator('.kit-card').count()==3
 assert 'Salvo' in page.locator('#save-status').inner_text()
 page.screenshot(path=str(OUT/'preview.png'),full_page=True)
 page.once('dialog',lambda d:d.accept())
 page.locator('#new-project').click()
 assert page.locator('.canvas-node').count()==0
 page.locator('[data-category="operation"]').click()
 assert page.locator('.library-card').count()==2
 page.locator('[data-add-type="activity"]').click()
 assert page.locator('#placing-chip').is_visible()
 svg=page.locator('#map-svg');box=svg.bounding_box()
 x=box['x']+box['width']*.38;y=box['y']+box['height']*.43
 page.mouse.move(x,y)
 assert page.locator('.place-preview').count()==0 # group generated without class, verify text
 assert 'Clique para posicionar' in page.locator('#map-svg').text_content()
 page.mouse.click(x,y)
 assert page.locator('.canvas-node').count()==1
 assert not page.locator('#placing-chip').is_visible()
 page.locator('[data-prop="title"]').fill('Receber e acolher')
 page.locator('[data-prop="title"]').press('Tab')
 assert 'Receber e acolher' in page.locator('.canvas-node').first.text_content()
 page.locator('[data-prop="owner"]').fill('Recepcionista')
 page.locator('[data-prop="owner"]').press('Tab')
 page.locator('[data-category="resources"]').click()
 page.locator('[data-add-type="system"]').click()
 page.mouse.move(x+170,y+110)
 page.mouse.click(x+170,y+110)
 assert page.locator('.canvas-node').count()==2
 assert page.locator('#connect-suggestion').is_visible()
 page.locator('#connect-suggestion').click()
 assert page.locator('[data-edge-id]').count()>=1
 page.locator('[data-kit="booking"]').click()
 assert page.locator('.canvas-node').count()==5
 page.locator('#undo').click()
 assert page.locator('.canvas-node').count()==2
 page.locator('#redo').click()
 assert page.locator('.canvas-node').count()==5
 page.locator('#run-inspection').click()
 assert page.get_by_role('dialog',name='Como está seu serviço?').is_visible()
 page.get_by_role('dialog',name='Como está seu serviço?').get_by_role('button',name='Concluir').click()
 page.locator('#btn-export').click()
 with page.expect_download() as d: page.locator('[data-export="json"]').click()
 download=d.value
 assert download.suggested_filename.endswith('.json')
 download.save_as(str(OUT/'test-project.json'))
 payload=json.loads(Path(str(OUT/'test-project.json')).read_text())
 assert len(payload['nodes'])==5
 page.screenshot(path=str(OUT/'tested.png'),full_page=True)
 print('Desktop smoke: 21 assertions/checks; nodes',len(payload['nodes']),'edges',len(payload['edges']),'errors',errors)
 assert not errors,errors
 mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 mobile.evaluate("""() => {const memory={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]}})}""")
 mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
 mobile.set_content(html,wait_until='load')
 assert mobile.locator('#mobile-library').is_visible()
 mobile.locator('#mobile-library').click()
 assert mobile.locator('.library').is_visible()
 mobile.locator('[data-category="operation"]').click()
 mobile.locator('[data-add-type="activity"]').click()
 assert not mobile.locator('.library').is_visible()
 assert mobile.locator('#placing-chip').is_visible()
 mobile.screenshot(path=str(OUT/'mobile.png'),full_page=True)
 print('Mobile smoke: passed; errors',mobile_errors)
 assert not mobile_errors,mobile_errors
 b.close()
