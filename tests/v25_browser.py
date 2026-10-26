#!/usr/bin/env python3
"""UX regression: actual CSS chain including v24/v25, visual layouts, corridor recovery."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 pg=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];pg.on('pageerror',lambda exc:errors.append(str(exc)))
 pg.set_content(inline_app(ROOT),wait_until='domcontentloaded');pg.wait_for_timeout(1000)
 expect(pg.locator('.rail-version')).to_contain_text('2.3.2')
 assert pg.evaluate("Array.from(document.styleSheets).some(x=> [...(x.cssRules||[])].some(r=>r.cssText.includes('sim-spatial-help')))"),'v25 CSS not loaded'
 # Save indicator is visible and not hidden by 1370px media rules
 for w,h in [(1440,900),(1280,720),(820,960),(390,844)]:
  pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(100)
  assert pg.locator('#save-status').is_visible(),f'save indicator hidden {w}'
  assert pg.evaluate("getComputedStyle(document.querySelector('#save-status')).display !== 'none'")
  # Two main tabs and usable studio viewport
  dims=(pg.locator('#room-3d-stage').bounding_box() or pg.locator('#floor-editor-map').bounding_box())
  assert dims and dims['width']>=260 and dims['height']>=180,(w,dims)
  if w==1280:pg.screenshot(path=str(ROOT/'docs/v231-estudio-laptop.png'))
  if w==390:pg.screenshot(path=str(ROOT/'docs/v231-estudio-mobile.png'))
 pg.set_viewport_size({'width':1440,'height':900})
 # mutually exclusive panels
 
 if pg.locator('.rooms-shell.show-furniture').count()==0: pg.locator('#room-toggle-library').click()
 assert pg.locator('.rooms-shell.show-furniture').count()==1
 pg.locator('#room-toggle-object-inspector').click();assert pg.locator('.rooms-shell.show-furniture').count()==0
 pg.locator('#room-toggle-details').click();assert pg.locator('.rooms-shell.show-object-inspector').count()==0
 tab=pg.locator('[data-room-tab]').last;tab.click();assert pg.locator('.rooms-shell.show-details').count()==0
 # Walking guidance and route correction CTA
 pg.locator('[data-view="simulation"]').click()
 expect(pg.locator('#sim22-cell-meters')).to_have_value('0.75')
 pg.locator('.sim22-spatial-settings summary').click()
 pg.locator('#sim22-enable-walking').check()
 pg.wait_for_timeout(100)
 assert pg.locator('#sim-spatial-help').is_visible(), 'missing walking guidance'
 pg.screenshot(path=str(ROOT/'docs/v231-simulacao-alerta.png'))
 pg.locator('#sim-open-corridors').click()
 assert pg.locator('#site-overview').is_visible(), 'did not open corridor editor'
 assert pg.locator('[data-site-connect-all]').is_visible()
 pg.locator('[data-view="simulation"]').click();pg.locator('.sim22-spatial-settings summary').click()
 pg.locator('#sim-ignore-walking').click();assert not pg.locator('#sim22-enable-walking').is_checked()
 assert pg.locator('#sim-stats').is_visible()
 assert not errors,errors
 print('PASS: UX CSS, responsive layouts, panels, scale, recovery',4,'viewport sizes')
 b.close()
