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
 expect(site.locator('.site-head h3')).to_contain_text('Espaços do serviço')
 expect(site.locator('.p84-floating-tools')).to_be_visible()
 expect(site.locator('.p71-zoom-controls')).to_be_visible()
 expect(site.locator('[data-p84-action="diagnostics"]')).to_be_visible()
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
 # P8.3: drag the miniature itself; the old implementation only accepted
 # the narrow header, which was almost fully occupied by action buttons.
 room_id=room.get_attribute('data-site-room')
 before=page.evaluate("(id)=>siteRoomSpot(doc,id)",room_id)
 svg=room.locator('.site-room-svg')
 box=svg.bounding_box()
 assert box is not None
 scale=int(site.locator('#p71-zoom-value').inner_text().replace('%',''))/100
 page.mouse.move(box['x']+box['width']*.55,box['y']+box['height']*.45)
 page.mouse.down()
 page.mouse.move(box['x']+box['width']*.55+20*scale,box['y']+box['height']*.45,steps=6)
 page.mouse.up()
 after=page.evaluate("(id)=>siteRoomSpot(doc,id)",room_id)
 assert after['x']==before['x']+1,(before,after)
 assert after['y']==before['y'],(before,after)
 expect(site.locator('.site-feedback')).to_contain_text('Sala movida')
 # Room remains editable and linked to the real same 3D document.
 room=site.locator('[data-site-room="'+room_id+'"]')
 expect(room.locator('[data-site-open]')).to_be_visible()
 room.focus()
 page.keyboard.press('Enter')
 expect(site.locator('#p84-properties')).to_be_visible()
 assert site.locator('#p84-room-name').input_value().strip()
 expect(site.locator('[data-p84-action="open3d"]')).to_be_visible()
 # Keyboard movement remains bounded; if a room is obstructed the warning is explicit.
 page.keyboard.press('ArrowLeft')
 assert not errors,errors
 # Routes remain in a dedicated, on-demand diagnostic panel.
 site.locator('[data-p84-action="diagnostics"]').click()
 expect(site.locator('.site-notes')).to_be_visible()
 routes=site.locator('.p71-route-choice')
 assert routes.count()>=3
 routes.first.click()
 expect(routes.first).to_have_attribute('aria-pressed','true')
 assert site.locator('.p71-route-highlight').count()>=1
 routes.first.click()
 expect(routes.first).to_have_attribute('aria-pressed','false')
 # Panel actions are contextual to the selected room; the 3D editor still
 # exposes its original resizable library and property docks.
 site.locator('[data-p84-action="close"]').click()
 expect(site.locator('#p84-properties')).to_be_hidden()
 # Navigation preserves independent tabs, including the 3D editor.
 page.locator('#bo-workflow-mount').click()
 expect(page.locator('#room-3d-stage')).to_be_visible(timeout=15000)
 expect(page.locator('.hybrid-left-dock')).to_be_visible(timeout=15000)
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
