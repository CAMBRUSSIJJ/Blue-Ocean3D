#!/usr/bin/env python3
"""Blue Ocean daylight shell: visual contracts and progressive-disclosure interactions."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1366,'height':768},reduced_motion='reduce')
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 expect(page.locator('#rooms-view')).to_be_visible(timeout=15000)
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-mount').click()
 expect(page.locator('#hybrid-tab-furniture')).to_be_visible()
 shell=page.locator('#rooms-view .rooms-shell')
 assert page.evaluate("document.body.classList.contains('bo-ocean')")
 assert page.evaluate("getComputedStyle(document.querySelector('.topbar')).backgroundColor")=='rgb(255, 255, 255)'
 assert page.evaluate("getComputedStyle(document.querySelector('.hybrid-left-dock')).backgroundColor")=='rgb(255, 255, 255)'
 assert 'workspace-right-collapsed' in shell.get_attribute('class').split()
 left=page.locator('.hybrid-left-dock')
 expect(left).to_be_visible()
 # The construction canvas occupies the majority of the work area initially.
 sizes=page.evaluate("""() => {
  const shell=document.querySelector('.rooms-shell').getBoundingClientRect(),
    main=document.querySelector('.rooms-main').getBoundingClientRect();
  return {ratio:main.width/shell.width,journey:document.querySelector('.hybrid-journey').getBoundingClientRect().height};
 }""")
 assert sizes['ratio']>.70,sizes
 assert sizes['journey']<=120,sizes
 # Compact contextual library and right-hand properties.
 page.locator('#hybrid-tab-furniture').click()
 assert 'hybrid-furniture-active' in shell.get_attribute('class').split()
 expect(page.locator('.hybrid-left-dock .floor-palette')).to_be_visible()
 page.locator('#hybrid-tab-rooms').click()
 expect(page.locator('#room-tab-nav')).to_be_visible()
 page.locator('.workspace-reopen-right').click()
 expect(page.locator('.hybrid-right-dock')).to_be_visible()
 page.locator('.hybrid-right-dock .workspace-collapse').click()
 assert 'workspace-right-collapsed' in shell.get_attribute('class').split()
 # Secondary actions remain accessible, but no longer add toolbar noise.
 menu=page.locator('.bo-toolbar-more')
 expect(menu.locator('summary')).to_be_visible()
 assert menu.locator('#floor-auto').count()==1
 assert not menu.locator('#floor-auto').is_visible()
 menu.locator('summary').click()
 expect(menu.locator('#floor-auto')).to_be_visible()
 menu.locator('summary').click()
 # Journey remains one graph, available in expanded mode.
 journey=page.locator('#hybrid-journey')
 page.locator('#bo-workflow-service').click()
 page.locator('#hybrid-journey-expand').click()
 assert 'is-expanded' in journey.get_attribute('class').split()
 expect(page.locator('#hybrid-journey-list [data-hybrid-step]').first).to_be_visible()
 page.locator('#hybrid-journey-expand').click()
 page.locator('#bo-workflow-mount').click()
 # Previous scene modes and service data remain untouched.
 original=page.evaluate('doc.nodes.length')
 page.locator('#bo-workflow-floor').click()
 page.locator('#bo-workflow-mount').click()
 assert page.evaluate('doc.nodes.length')==original
 # At high desktop resolution, controls are still reachable.
 page.set_viewport_size({'width':1920,'height':1080})
 expect(page.locator('#room-3d-stage')).to_be_visible()
 expect(page.locator('#bo-catalog-tool')).to_be_visible()
 # On smaller screens use the dedicated mobile panel navigation.
 page.set_viewport_size({'width':700,'height':800})
 expect(page.locator('#hybrid-mobile-furniture')).to_be_visible()
 page.locator('#hybrid-mobile-furniture').click()
 expect(page.locator('.hybrid-left-dock')).to_be_visible()
 assert not errors,errors
 print('PASS Blue Ocean Light: white shell, blue canvas controls, contextual docks, full journey and mobile')
 browser.close()
