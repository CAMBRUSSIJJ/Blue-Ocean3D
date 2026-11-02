#!/usr/bin/env python3
"""P8.3: Firefox + Chromium — dragging a room must update its canonical floorplan position."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]

with sync_playwright() as pw:
 for name in ('chromium','firefox'):
  engine=getattr(pw,name)
  opts={'headless':True}
  if name=='chromium': opts['args']=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']
  browser=engine.launch(**opts)
  page=browser.new_page(viewport={'width':1280,'height':720},reduced_motion='reduce')
  errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
  site=page.locator('#site-overview')
  expect(site).to_be_visible(timeout=18000)
  assert site.locator('.site-room').count()>=4
  card=site.locator('.site-room').first
  rid=card.get_attribute('data-site-room')
  initial=page.evaluate('(id)=>siteRoomSpot(doc,id)',rid)
  expect(card.locator('[data-site-open]')).to_be_visible()
  zoom=float(site.locator('#p71-zoom-value').inner_text().replace('%',''))/100
  box=card.locator('.site-room-svg').bounding_box()
  assert box is not None
  x=box['x']+box['width']*.5
  y=box['y']+box['height']*.5
  page.mouse.move(x,y)
  page.mouse.down()
  page.mouse.move(x+20*zoom,y,steps=8)
  page.mouse.up()
  position=page.evaluate('(id)=>siteRoomSpot(doc,id)',rid)
  assert position['x']==initial['x']+1,(name,initial,position)
  assert position['y']==initial['y'],(name,initial,position)
  expect(site.locator('.site-feedback')).to_contain_text('Sala movida')
  # Distinct controls must still open the real 3D space.
  site.locator('[data-site-room="'+rid+'"] [data-site-open]').click()
  expect(page.locator('#room-3d-stage')).to_be_visible(timeout=12000)
  page.locator('#hybrid-construct').click()
  expect(site).to_be_visible(timeout=12000)
  assert not errors,(name,errors)
  print('PASS P8.3 '+name+': drag thumbnail, saved position, visible feedback, 3D navigation')
  browser.close()
