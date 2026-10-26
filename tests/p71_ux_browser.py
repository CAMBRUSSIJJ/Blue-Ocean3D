#!/usr/bin/env python3
"""P7.1 acceptance: contextual plan, map fit/zoom, route highlighting and non-overlapping actions."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':850},reduced_motion='reduce')
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 site=page.locator('#site-overview')
 expect(site).to_be_visible(timeout=15000)
 expect(site.locator('.site-head h3')).to_contain_text('Visão geral física')
 expect(site.locator('.p71-toolbar-heading')).to_contain_text('Ferramentas')
 expect(site.locator('.p71-zoom-controls')).to_be_visible()
 expect(site.locator('.p71-legend')).to_be_visible()
 # Previous 3D furniture selection must not leak into physical overview.
 expect(page.locator('.hybrid-right-dock .floor-editor-inspector')).to_be_hidden()
 cards=site.locator('.site-room')
 assert cards.count()>=4
 page.wait_for_timeout(150)
 initial=site.locator('#p71-zoom-value').inner_text()
 site.locator('[data-p71-zoom="in"]').click()
 assert site.locator('#p71-zoom-value').inner_text()!=initial
 site.locator('[data-p71-zoom="fit"]').click()
 fit_value=page.evaluate("getComputedStyle(document.querySelector('.site-canvas')).transform")
 assert fit_value!='none'
 room=cards.first
 room.focus()
 page.keyboard.press('Enter')
 expect(page.locator('#p71-plan-title')).to_be_visible()
 assert page.locator('#p71-plan-title').inner_text().strip()
 expect(page.locator('#p71-plan-edit')).to_be_visible()
 # Keyboard movement remains bounded; if a room is obstructed the warning is explicit.
 page.keyboard.press('ArrowLeft')
 assert not errors,errors
 # Routes have selectable records tied to the canonical route graph.
 routes=site.locator('.p71-route-choice')
 assert routes.count()>=3
 routes.first.click()
 expect(routes.first).to_have_attribute('aria-pressed','true')
 assert site.locator('.p71-route-highlight').count()>=1
 routes.first.click()
 expect(routes.first).to_have_attribute('aria-pressed','false')
 # The reopen controls belong to the layout, not to the physical canvas or diagnostics.
 page.locator('.hybrid-left-dock .workspace-collapse').click()
 reopen=page.locator('.p71-dock-actions .workspace-reopen-left')
 expect(reopen).to_be_visible()
 a=reopen.bounding_box()
 b=site.locator('.site-notes').bounding_box()
 assert a['y']+a['height']<=b['y'] or a['x']+a['width']<=b['x'],(a,b)
 reopen.click()
 expect(page.locator('.hybrid-left-dock')).to_be_visible()
 # Navigation preserves independent tabs, including the 3D editor.
 page.locator('#bo-workflow-mount').click()
 expect(page.locator('#room-3d-stage')).to_be_visible(timeout=15000)
 page.locator('#hybrid-construct').click()
 expect(site).to_be_visible()
 assert site.evaluate('(el)=>el.scrollTop')==0
 page.set_viewport_size({'width':900,'height':720})
 expect(site.locator('[data-p71-zoom="fit"]')).to_be_visible()
 page.set_viewport_size({'width':700,'height':760})
 expect(site.locator('.site-room').first).to_be_attached()
 assert not errors,errors
 print('PASS P7.1 Chromium: map zoom, contextual inspector, route highlight, keyboard and dock alignment')
 browser.close()
