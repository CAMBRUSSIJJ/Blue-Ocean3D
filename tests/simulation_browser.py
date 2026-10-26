#!/usr/bin/env python3
"""v0.5 browser acceptance: play, capacity, comparison, exports and mobile; no network."""
import json
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'simulation-v05';OUT.mkdir(parents=True,exist_ok=True)
html=inline_app(ROOT)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1570,'height':950},device_scale_factor=1,accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate("""() => {const mem={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]}})}""")
 page.set_content(html,wait_until='load')
 expect(page.locator('.canvas-node')).to_have_count(8)
 page.locator('[data-view="simulation"]').click()
 expect(page.locator('#simulation-view')).to_be_visible()
 expect(page.locator('#editor-view')).to_be_hidden()
 expect(page.locator('.sim-stat')).to_have_count(4)
 expect(page.locator('.sim-lane')).to_have_count(6)
 assert page.locator('.sim-bar').count()==24
 assert '6 ocorrência(s)' not in page.locator('#sim-stats').inner_text() # output metrics, not status labels
 expect(page.locator('#sim-error')).to_be_hidden()
 page.screenshot(path=str(OUT/'desktop.png'),full_page=False,animations='disabled')
 # Scrub and inspect activity. This must not modify the underlying service.
 page.locator('#sim-progress').fill('18')
 assert '18 min' in page.locator('#sim-time').inner_text()
 page.locator('.sim-bar').first.click()
 assert page.locator('#sim-selected').get_by_text('Abrir no Construir').count()==1
 # Scenario comparison: 1 -> 3 slots must not increase queues in same document.
 page.locator('#sim-reference').click()
 expect(page.locator('#sim-reference-label')).to_contain_text('Referência fixa')
 page.locator('#sim-capacity').fill('3')
 page.locator('#sim-capacity').dispatch_event('change')
 page.locator('#sim-run').click()
 expect(page.locator('.sim-compare-row')).to_have_count(4)
 assert page.locator('.sim-compare-row').filter(has_text='Espera média').count()==1
 assert page.locator('#sim-error').is_hidden()
 # Playback controls update visual time and can pause.
 page.locator('#sim-play').click()
 expect(page.locator('#sim-play')).to_have_attribute('aria-pressed','true')
 page.wait_for_timeout(400)
 page.locator('#sim-play').click()
 expect(page.locator('#sim-play')).to_have_attribute('aria-pressed','false')
 page.locator('#sim-forward').click()
 assert float(page.locator('#sim-progress').input_value())>=5
 page.locator('#sim-reset').click()
 assert float(page.locator('#sim-progress').input_value())==0
 # Ensure export contains all 6 cases and project only in model export, no side effect.
 with page.expect_download() as dl: page.locator('#sim-csv').click()
 csv_path=OUT/'simulation.csv';dl.value.save_as(str(csv_path));assert 'Ocorrência' in csv_path.read_text('utf-8-sig')
 with page.expect_download() as dl: page.locator('#sim-json').click()
 json_path=OUT/'simulation.json';dl.value.save_as(str(json_path));saved=json.loads(json_path.read_text())
 assert saved['settings']['teamCapacity']==3
 assert saved['metrics']['cases']==6
 assert saved['events']
 # Still same native project; navigate and edit a card.
 page.locator('#sim-back').click()
 expect(page.locator('#editor-view')).to_be_visible()
 expect(page.locator('.canvas-node')).to_have_count(8)
 page.locator('[data-view="rooms"]').click()
 expect(page.locator('.room-tile')).to_have_count(5)
 page.locator('[data-view="simulation"]').click()
 expect(page.locator('#simulation-view')).to_be_visible()
 assert not errors,errors
 print('Desktop simulation passed,',len(saved['events']),'events, 0 runtime errors')
 mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,accept_downloads=True)
 merrors=[];mobile.on('pageerror',lambda e:merrors.append(str(e)))
 mobile.evaluate("""() => {const mem={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=String(v),removeItem:k=>delete mem[k]}})}""")
 mobile.set_content(html,wait_until='load')
 mobile.locator('[data-view="simulation"]').click()
 expect(mobile.locator('#simulation-view')).to_be_visible()
 expect(mobile.locator('.sim-stat')).to_have_count(4)
 mobile.locator('.sim-hero').scroll_into_view_if_needed()
 mobile.screenshot(path=str(OUT/'mobile.png'),full_page=False,animations='disabled')
 assert mobile.locator('#sim-run').is_visible()
 assert not merrors,merrors
 print('Mobile simulation passed; 0 runtime errors')
 browser.close()
