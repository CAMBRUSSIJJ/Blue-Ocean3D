#!/usr/bin/env python3
"""Chromium regression: functional rooms, shared canonical nodes, reusable kits and mobile."""
import json
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'rooms-v04';OUT.mkdir(parents=True,exist_ok=True)
html=inline_app(ROOT)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1600,'height':950},device_scale_factor=1,accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate("""() => {const mem={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]}})}""")
  page.set_content(html,wait_until="load")
  expect(page.locator('.canvas-node')).to_have_count(8)
  page.locator('[data-view="rooms"]').click()
  expect(page.locator('#rooms-view')).to_be_visible()
  expect(page.locator('#editor-view')).to_be_hidden()
  expect(page.locator('.room-tile')).to_have_count(5)
  expect(page.locator('.room-part')).to_have_count(8)
  assert '4' in page.locator('#room-stats').inner_text()
  page.locator('.room-tile').first.locator('[data-room-select]').click()
  page.screenshot(path=str(OUT/'desktop.png'),full_page=False,animations='disabled')
  # Create room empty and add directly a real component.
  page.locator('#room-create-name').fill('Controle de qualidade')
  page.locator('#room-create-btn').click()
  expect(page.locator('.room-tile')).to_have_count(6)
  assert 'Controle de qualidade' in page.locator('#room-detail').inner_text()
  page.locator('#room-new-part-type').select_option('activity')
  page.locator('#room-new-part-stage').select_option('2')
  page.locator('#room-new-part-btn').click()
  assert page.locator('.room-part').count()==9
  # Add existing part to another room (native HTML5 drag & drop).
  part=page.locator('.room-part').first
  dest=page.locator('.room-tile').filter(has_text='Controle de qualidade').locator('.room-floor')
  page.evaluate('''() => {const dt=new DataTransfer(), item=document.querySelector('.room-part'), target=[...document.querySelectorAll('.room-tile')].find(el=>el.textContent.includes('Controle de qualidade')).querySelector('.room-floor'); item.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt})); target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt})); target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt})); }''')
  assert page.locator('.room-tile').filter(has_text='Controle de qualidade').locator('.room-part').count()>=2
  # Accessible alternative to native drag and drop: change room by selector.
  page.locator('.room-tile').filter(has_text='Controle de qualidade').locator('[data-room-move]').first.click()
  expect(page.locator('#room-move-dialog')).to_be_visible()
  page.locator('#room-move-to').select_option('')
  page.locator('#room-move-confirm').click()
  assert page.locator('.room-tile').filter(has_text='Controle de qualidade').locator('.room-part').count()>=1
  # Move that unassigned piece back via the same accessible interface.
  page.locator('.room-unassigned [data-room-move]').first.click()
  dest_id=page.locator('.room-tile').filter(has_text='Controle de qualidade').get_attribute('data-room-id')
  page.locator('#room-move-to').select_option(dest_id)
  page.locator('#room-move-confirm').click()
  # Save reusable room template and instantiate with fresh stable ids.
  page.locator('.room-tile').filter(has_text='Controle de qualidade').locator('[data-room-select]').click()
  page.locator('#room-save-template').click()
  page.locator('[data-room-template-tab="saved"]').click()
  expect(page.locator('.saved-template')).to_have_count(1)
  page.locator('.saved-template [data-add-room-kit]').click()
  assert page.locator('.room-tile').count()==7
  assert page.locator('.room-part').count()>=11
  # Demonstrate room ref in JSON export: same canonical nodes.
  page.locator('#room-back').click()
  expect(page.locator('#editor-view')).to_be_visible()
  page.locator('#btn-export').click()
  with page.expect_download() as dl:page.locator('[data-export="json"]').click()
  path=OUT/'rooms-project.json';dl.value.save_as(str(path))
  d=json.loads(path.read_text())
  assert len(d['environments'])==6
  assert len({x['id'] for x in d['nodes']})==len(d['nodes'])
  assert all(not x.get('environmentId') or any(r['id']==x['environmentId'] for r in d['environments']) for x in d['nodes'])
  # Switch perspective and come back: canonical graph remains intact.
  page.locator('[data-view="explore"]').click()
  assert page.locator('.ex-svg-node').count()==len(d['nodes'])
  page.locator('[data-view="rooms"]').click()
  assert page.locator('.room-part').count()==len(d['nodes'])
  assert not errors,errors
  print('Desktop rooms validated:',len(d['environments']),'rooms,',len(d['nodes']),'nodes;',len(errors),'runtime errors')
  mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  merrors=[];mobile.on('pageerror',lambda e:merrors.append(str(e)))
  mobile.evaluate("""() => {const mem={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]}})}""")
  mobile.set_content(html,wait_until="load")
  mobile.locator('[data-view="rooms"]').click()
  expect(mobile.locator('#rooms-view')).to_be_visible()
  expect(mobile.locator('.room-tile')).to_have_count(5)
  assert mobile.locator('#room-create-btn').is_visible()
  mobile.locator('#room-grid').scroll_into_view_if_needed()
  assert mobile.locator('.room-part').count()==8
  mobile.screenshot(path=str(OUT/'mobile.png'),full_page=False,animations='disabled')
  assert not merrors,merrors
  print('Mobile rooms validated; runtime errors:',len(merrors))
  browser.close()
finally:
 pass
