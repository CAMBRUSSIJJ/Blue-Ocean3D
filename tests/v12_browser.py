#!/usr/bin/env python3
"""Integração v1.2: paredes, portas, dimensões, rotas, persistência e simulação."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1550,'height':960},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(inline_app(ROOT),wait_until='load')
 expect(page.locator('.rail-version')).to_contain_text('1.2')
 expect(page.locator('.build-stamp')).to_contain_text('v1.2')
 assert page.locator('[data-view]').count()==2
 expect(page.locator('#floor-editor')).to_be_visible()
 expect(page.locator('#floor-structure-tools')).to_be_visible()
 assert page.locator('.floor-editor-room').count()==4
 # Mapa de rotas do demo após ativar a prévia.
 page.locator('#floor-show-routes').click()
 expect(page.locator('#floor-show-routes')).to_have_attribute('aria-pressed','true')
 assert page.locator('#floor-editor .floor-route-overlay').count()==4
 assert page.locator('#floor-editor .floor-edge-wall').count()>50
 page.locator('[data-floor-surface]').first.click(position={'x':240,'y':245})
 expect(page.locator('#floor-room-scale')).to_be_visible()
 page.locator('#floor-room-scale').fill('1.25')
 page.locator('#floor-room-scale').dispatch_event('change')
 expect(page.locator('#floor-editor-inspector')).to_contain_text('15.00 m')
 first=page.locator('[data-floor-surface]').first
 first.scroll_into_view_if_needed()
 box=first.bounding_box()
 # Escolhe linha horizontal do grid, longe dos objetos; acrescenta parede.
 page.locator('[data-floor-structure="wall"]').click()
 expect(page.locator('[data-floor-structure="wall"]')).to_have_attribute('aria-pressed','true')
 # Borda externa entrada inferior x=1, y=8; transforma porta em parede.
 page.mouse.click(box['x']+box['width']*(1.5/12),box['y']+box['height']*.997)
 expect(page.locator('#floor-editor-notice')).to_contain_text('Parede construída')
 # Abre novamente com ferramenta Porta.
 page.locator('[data-floor-structure="door"]').click()
 first=page.locator('[data-floor-surface]').first;first.scroll_into_view_if_needed();box=first.bounding_box()
 page.mouse.click(box['x']+box['width']*(1.5/12),box['y']+box['height']*.997)
 expect(page.locator('#floor-editor-notice')).to_contain_text('Porta posicionada')
 page.locator('#floor-clear-selection').click()
 page.screenshot(path=str(ROOT/'docs'/'preview-construtor-v12.png'),full_page=False)
 # Resultado existente permanece reproduzível com geometria.
 page.locator('#room-back').click()
 expect(page.locator('#sim-floor')).to_be_visible()
 assert page.locator('#sim-floor .floor-edge-wall').count()>50
 assert page.locator('.floor-person-client').count()>0
 page.locator('#sim-progress').fill('12')
 assert page.locator('#sim-error').is_hidden()
 page.locator('.sim-floor-card').screenshot(path=str(ROOT/'docs'/'preview-simulacao-v12.png'))
 # Interface estreita e navegação.
 page.set_viewport_size({'width':390,'height':844})
 assert not page.locator('body').evaluate('(el)=>el.scrollWidth > window.innerWidth+10')
 page.locator('#sim-back').click()
 assert not page.locator('body').evaluate('(el)=>el.scrollWidth > window.innerWidth+10')
 assert not errors,errors
 b.close()
print('v1.2 browser: paredes, portas, escala, trajetos, simulação e mobile — OK')
