#!/usr/bin/env python3
"""P8.4: the supplied SpaceBuilder-inspired layout is wired to real service data."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]

with sync_playwright() as pw:
 for browser_name in ('chromium','firefox'):
  engine=getattr(pw,browser_name)
  options={'headless':True}
  if browser_name=='chromium':
   options['args']=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']
  browser=engine.launch(**options)
  page=browser.new_page(viewport={'width':1280,'height':720},reduced_motion='reduce')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
  site=page.locator('#site-overview')
  expect(site).to_be_visible(timeout=18000)
  expect(site.locator('.p84-floating-tools')).to_be_visible()
  expect(site.locator('.p84-floating-zoom')).to_be_visible()
  expect(site.locator('#p84-properties')).to_be_hidden()
  assert site.locator('[data-site-mode]').count()==4
  assert site.locator('.site-room').count()>=4
  plan=page.evaluate("""() => ({
   shell:document.querySelector('.rooms-shell').getBoundingClientRect().width,
   main:document.querySelector('.rooms-main').getBoundingClientRect().width,
   canvas:document.querySelector('#site-overview').getBoundingClientRect().height,
   left:getComputedStyle(document.querySelector('.hybrid-left-dock')).display,
   right:getComputedStyle(document.querySelector('.hybrid-right-dock')).display
  })""")
  assert plan['main']/plan['shell']>.95,plan
  assert plan['canvas']>350,plan
  assert plan['left']=='none' and plan['right']=='none',plan

  room=site.locator('.site-room').first
  room_id=room.get_attribute('data-site-room')
  original=page.evaluate('(id)=>siteRoomSpot(doc,id)',room_id)
  # Click a room's actual floorplan to open contextual properties.
  room.locator('.site-room-svg').click(position={'x':30,'y':45})
  expect(site.locator('#p84-properties')).to_be_visible()
  oldname=site.locator('#p84-room-name').input_value()
  assert oldname
  field=site.locator('#p84-room-name')
  field.fill('Recepção piloto P84')
  site.locator('.p84-save-room').click()
  expect(site.locator('#p84-room-name')).to_have_value('Recepção piloto P84')
  assert page.evaluate("(id)=>doc.environments.find(r=>r.id===id).name",room_id)=='Recepção piloto P84'

  site.locator('[data-p84-color="#587EB7"]').click()
  assert page.evaluate("(id)=>doc.environments.find(r=>r.id===id).color",room_id)=='#587EB7'
  expect(site.locator('[data-p84-action="flow"]')).to_be_visible()

  # Close properties and drag the miniature, keeping its canonical room identity.
  site.locator('[data-p84-action="close"]').click()
  expect(site.locator('#p84-properties')).to_be_hidden()
  site.locator('[data-site-mode="view"]').click()
  scale=float(site.locator('#p71-zoom-value').inner_text().replace('%',''))/100
  box=site.locator('[data-site-room="'+room_id+'"] .site-room-svg').bounding_box()
  x=box['x']+box['width']*.5
  y=box['y']+box['height']*.5
  page.mouse.move(x,y)
  page.mouse.down()
  page.mouse.move(x+20*scale,y,steps=8)
  page.mouse.up()
  new=page.evaluate('(id)=>siteRoomSpot(doc,id)',room_id)
  assert new['x']==original['x']+1,(browser_name,original,new)
  assert new['y']==original['y'],(browser_name,original,new)
  assert page.evaluate("(id)=>doc.environments.find(r=>r.id===id).name",room_id)=='Recepção piloto P84'

  site.locator('[data-p84-action="diagnostics"]').click()
  expect(site.locator('.site-notes')).to_be_visible()
  site.locator('[data-p84-action="diagnostics"]').click()
  expect(site.locator('.site-notes')).to_be_hidden()

  site.locator('[data-p84-action="new"]').click()
  expect(page.locator('#room-create-dialog')).to_be_visible()
  page.locator('#room-create-cancel').click()
  expect(page.locator('#room-create-dialog')).to_be_hidden()
  # Real 3D code remains accessible, not a mock link.
  site.locator('[data-site-room="'+room_id+'"] [data-site-open]').click()
  expect(page.locator('#room-3d-stage')).to_be_visible(timeout=15000)
  expect(page.locator('.hybrid-left-dock')).to_be_visible()
  page.locator('#hybrid-construct').click()
  expect(site).to_be_visible(timeout=15000)
  for width,height in [(1536,959),(1280,720),(700,760)]:
   page.set_viewport_size({'width':width,'height':height})
   page.wait_for_timeout(100)
   expect(site.locator('.p84-floating-tools')).to_be_visible()
   expect(site.locator('.p84-floating-zoom')).to_be_visible()
  assert not errors,(browser_name,errors)
  print('PASS P84',browser_name,'real room edits, drag, diagnostics, new room, 3D, responsive shell')
  browser.close()
