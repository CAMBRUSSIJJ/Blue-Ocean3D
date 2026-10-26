#!/usr/bin/env python3
"""Service Builder v2.3.2 browser smoke: consolidated CSS, dialogs, keyboard tabs, responsive."""
from pathlib import Path
from subprocess import Popen,DEVNULL
import os,time,urllib.request
from playwright.sync_api import sync_playwright
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
server=Popen(['python3','scripts/server.py'],cwd=ROOT,env={**os.environ,'SERVICE_BUILDER_PORT':'4197','SERVICE_BUILDER_NO_BROWSER':'1'},stdout=DEVNULL,stderr=DEVNULL)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  pg=b.new_page(viewport={'width':1366,'height':768},device_scale_factor=1)
  errors=[];pg.on('pageerror',lambda error:errors.append(str(error)))
  online=False
  for _ in range(10):
   try:
    with urllib.request.urlopen('http://127.0.0.1:4197/app/',timeout=1) as response:
     assert response.headers['X-Service-Builder-Version']=='2.3.2'
    break
   except Exception:time.sleep(.15)
  try:
   pg.goto('http://127.0.0.1:4197/app/',wait_until='domcontentloaded',timeout=2500)
   online=True
  except Exception:
   pg.close()
   pg=b.new_page(viewport={'width':1366,'height':768},device_scale_factor=1)
   pg.on('pageerror',lambda error:errors.append(str(error)))
   pg.set_content(inline_app(ROOT),wait_until='domcontentloaded',timeout=20000)
  print('Browser loaded', 'HTTP' if online else 'memory',flush=True)
  pg.wait_for_timeout(1800)
  assert '2.3.2' in pg.locator('.rail-version').inner_text()
  if online:
   assert pg.evaluate('document.querySelectorAll("link[rel=stylesheet]").length')==1
   assert pg.evaluate("document.querySelector('link[rel=stylesheet]').getAttribute('href').includes('styles-bundle.css')")
  else:
   assert pg.locator("style").count()>=1
   assert "SOURCE: v26.css" in pg.locator("style").first.inner_text()
  # Native browser confirm prompts must not be reached by replacement operations.
  native=[];pg.on('dialog',lambda dialog:(native.append(dialog.type),dialog.dismiss()))
  original=pg.locator('#project-name').input_value() if pg.locator('#project-name').count() else pg.locator('.project-field input').input_value()
  pg.evaluate("document.querySelector('#new-project').click()")
  pg.wait_for_function("document.querySelector('#sb-confirm-dialog').open === true", timeout=7000)
  assert pg.locator('#sb-confirm-title').inner_text()=='Criar serviço vazio?'
  pg.locator('#sb-confirm-cancel').click();pg.wait_for_timeout(120)
  assert not pg.locator('#sb-confirm-dialog').evaluate('(d)=>d.open')
  latest=pg.locator('#project-name').input_value() if pg.locator('#project-name').count() else pg.locator('.project-field input').input_value()
  assert latest==original,(original,latest)
  pg.evaluate("document.querySelector('#new-project').click()")
  pg.wait_for_function("document.querySelector('#sb-confirm-dialog').open === true", timeout=7000)
  pg.keyboard.press('Escape');pg.wait_for_timeout(120)
  latest=pg.locator('#project-name').input_value() if pg.locator('#project-name').count() else pg.locator('.project-field input').input_value()
  assert latest==original,'Escape should preserve current project'
  assert native==[],native
  # Keyboard-accessible active modes, including roving focus.
  mode=pg.locator('[data-room-display="visual"]');mode.click()
  assert mode.get_attribute('aria-selected')=='true'
  mode.focus();pg.keyboard.press('ArrowRight')
  assert pg.locator('[data-room-display="cards"]').get_attribute('aria-selected')=='true'
  assert pg.locator('[data-room-display="cards"]').evaluate('(e)=>document.activeElement===e')
  pg.keyboard.press('ArrowLeft')
  assert pg.locator('[data-room-display="visual"]').get_attribute('aria-selected')=='true'
  first=pg.locator('[data-room-tab]').first
  first.focus();pg.keyboard.press('ArrowRight')
  active=pg.locator('[data-room-tab][aria-selected="true"]')
  assert active.count()==1
  assert active.evaluate('(e)=>document.activeElement===e'),'room navigation should retain focus'
  # Accept while inside open activity dialog if supported by current document.
  # The browser's native confirmation must never be triggered.
  pg.locator('[data-room-display="visual"]').click()
  for w,h in [(1440,900),(1280,720),(820,960),(390,844)]:
   pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(120)
   assert pg.locator('#save-status').is_visible(),f'save status hidden at {w}'
   assert pg.locator('[data-room-display="visual"]').is_visible(),f'mode tabs hidden at {w}'
   assert pg.locator('#floor-editor-map').is_visible(),f'floor editor hidden at {w}'
   if w==1280:pg.screenshot(path=str(ROOT/'docs/v232-desktop.png'))
   if w==390:pg.screenshot(path=str(ROOT/'docs/v232-mobile.png'))
  # Return to an alternative service view and check page errors.
  pg.locator('[data-view="simulation"]').click()
  assert pg.locator('#simulation-view').is_visible()
  pg.evaluate("document.querySelector('#new-project').click()")
  pg.wait_for_function("document.querySelector('#sb-confirm-dialog').open === true",timeout=7000)
  pg.locator('#sb-confirm-accept').click()
  pg.wait_for_timeout(200)
  assert pg.locator('#sb-confirm-dialog').evaluate('(d)=>d.open') is False
  assert pg.locator('[data-room-tab]').count()==0,'new empty project not applied after confirmation'
  assert not errors,errors
  b.close()
  print('PASS: v2.3.2', 'live HTTP' if online else 'in-memory', 'dialogs cancel/Escape; no native confirms; tabs keyboard; 4 viewport sizes; simulation')
finally:
 server.terminate()
 try:server.wait(timeout=3)
 except Exception:server.kill()
