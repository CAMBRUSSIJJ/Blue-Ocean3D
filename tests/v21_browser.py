from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1536,'height':960},accept_downloads=True)
  faults=[];page.on('pageerror',lambda exc:faults.append(str(exc)))
  page.set_content(inline_app(ROOT),wait_until='domcontentloaded');page.wait_for_timeout(1200)
  expect(page.locator('.rail-version')).to_contain_text('2.1')
  expect(page.locator('#rooms-view')).to_be_visible()
  expect(page.locator('[data-room-display="overview"]')).to_be_visible()
  page.locator('[data-room-display="overview"]').click()
  expect(page.locator('#site-overview')).to_be_visible()
  expect(page.locator('[data-site-connect]')).to_be_visible()
  before=page.locator('.site-summary').inner_text();print('Antes:',before)
  page.locator('[data-site-connect]').click()
  page.wait_for_timeout(400)
  after=page.locator('.site-summary').inner_text();print('Depois:',after)
  assert '0 células de corredor' not in after,after
  expect(page.locator('.site21-corridor').first).to_be_visible()
  assert page.locator('.site21-corridor').count()>0
  page.locator('[data-site-connect-all]').click()
  page.wait_for_timeout(300)
  print('Todas as ligações:',page.locator('.site-summary').inner_text())
  assert '3/3 percursos possíveis' in page.locator('.site-summary').inner_text()
  page.screenshot(path=str(ROOT/'docs/preview-corredores-v21.png'))
  # Arrastar para desenhar corredor no vazio, sem tocar nas salas.
  before_count=page.locator('.site21-corridor').count()
  page.locator('[data-site-mode="paint"]').click()
  grid=page.locator('[data-site-grid]');grid.scroll_into_view_if_needed()
  rect=grid.bounding_box();assert rect
  gx=rect['x']+18*20+8;gy=rect['y']+10*20+42+8
  page.mouse.move(gx,gy);page.mouse.down();page.mouse.move(gx+40,gy,steps=5);page.mouse.up()
  assert page.locator('.site21-corridor').count()>=before_count+2,(before_count,page.locator('.site21-corridor').count())
  # Modo de apagar um corredor direto na planta.
  page.locator('[data-site-mode="erase"]').click()
  expect(page.locator('[data-site-mode="erase"]')).to_have_attribute('aria-pressed','true')
  # alternância sem perder corredores: volta para mover salas.
  page.locator('[data-site-mode="view"]').click()
  expect(page.locator('[data-site-mode="view"]')).to_have_attribute('aria-pressed','true')
  page.locator('[data-view="simulation"]').click()
  expect(page.locator('#simulation-view')).to_be_visible()
  page.locator('#sim21-mode-site').click()
  expect(page.locator('#sim21-site')).to_be_visible()
  assert page.locator('.sim21-traffic-svg').count()==1
  route=page.locator('#sim21-route-status').inner_text();print('Status:',route)
  assert 'rotas entre salas transitáveis' in route
  page.locator('#sim-progress').fill('9');page.locator('#sim-progress').dispatch_event('input')
  expect(page.locator('.sim21-traffic-svg')).to_be_visible()
  page.locator('#sim21-map').scroll_into_view_if_needed()
  page.wait_for_timeout(120)
  page.screenshot(path=str(ROOT/'docs/preview-simulacao-circulacao-v21.png'))
  assert '0 pessoa(s) em deslocamento visual' not in page.locator('#sim21-route-status').inner_text(),page.locator('#sim21-route-status').inner_text()
  # Persistência de projetos via exportação e modo móvel.
  page.locator('[data-view="rooms"]').click()
  page.locator('[data-room-display="overview"]').click()
  assert page.locator('.site21-corridor').count()>0
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
  page.screenshot(path=str(ROOT/'docs/preview-mobile-v21.png'))
  assert not faults,faults
  print('NAVEGADOR v2.1 APROVADO')
  browser.close()
