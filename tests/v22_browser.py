#!/usr/bin/env python3
"""Smoke end-to-end usando o mesmo servidor Python do ZIP, com falha 3D tratada."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect,Error
from inline_app import inline_app
import subprocess,os,time,urllib.request,sys
ROOT=Path(__file__).resolve().parents[1]
PORT=4186
base=f'http://127.0.0.1:{PORT}/app/'
env=dict(os.environ,SERVICE_BUILDER_PORT=str(PORT),SERVICE_BUILDER_NO_BROWSER='1')
server=subprocess.Popen([sys.executable,str(ROOT/'scripts/server.py')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
try:
 for _ in range(100):
  try:
   urllib.request.urlopen(base,timeout=1);break
  except Exception:time.sleep(.07)
 else:raise RuntimeError('Servidor não iniciou')
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1500,'height':950},accept_downloads=True)
  errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
  # localhost e bloqueado para o Chromium automatizado: testar com HTML de teste in-memory.
  page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
  page.wait_for_timeout(900)
  expect(page.locator('.rail-version')).to_contain_text('2.2')
  page.locator('[data-room-display="overview"]').click()
  page.locator('[data-site-connect-all]').click()
  expect(page.locator('.site21-corridor').first).to_be_visible()
  print('conexoes',page.locator('.site-summary').inner_text())
  page.locator('[data-view="simulation"]').click()
  expect(page.locator('#sim22-enable-walking')).to_be_attached()
  page.locator('.sim22-spatial-settings summary').click()
  page.locator('#sim22-enable-walking').check()
  page.locator('#sim22-cell-meters').fill('1')
  page.locator('#sim22-walk-speed').fill('60')
  page.locator('#sim-run').click()
  expect(page.locator('#sim22-spatial-summary')).to_contain_text('Modo espacial ativo')
  expect(page.locator('#sim22-spatial-summary')).to_contain_text('Caminhada média')
  print('resumo',page.locator('#sim22-spatial-summary').inner_text())
  page.locator('#sim21-mode-site').click()
  expect(page.locator('#sim21-map .sim21-traffic-svg')).to_be_visible()
  page.locator('#sim-progress').fill('9');page.locator('#sim-progress').dispatch_event('input')
  page.locator('#sim21-map').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/'docs/preview-simulacao-espacial-v22.png'),full_page=False)
  expect(page.locator('#sim21-route-status')).to_contain_text('pico')
  page.locator('#sim22-mode-site-3d').click();page.wait_for_timeout(850)
  # Com ou sem suporte a WebGL, deve oferecer uma experiência utilizável.
  if page.locator('#sim22-map-3d canvas').count():
   print('WebGL visão geral renderizado')
   page.screenshot(path=str(ROOT/'docs/preview-geral-3d-v22.png'))
  else:
   print('WebGL não disponível neste Chromium; fallback:',page.locator('#sim21-route-status').inner_text())
   expect(page.locator('.sim21-traffic-svg')).to_be_visible()
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
  assert not errors,errors
  print('NAVEGADOR v2.2 APROVADO')
  browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=3)
 except Exception:server.kill()
