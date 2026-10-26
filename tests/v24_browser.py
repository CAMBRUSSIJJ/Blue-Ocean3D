#!/usr/bin/env python3
"""Check hybrid layout, active controls and responsive surfaces in real Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 page.wait_for_timeout(800)
 expect(page.locator('.rail-version')).to_contain_text('2.5')
 assert 'sb-hybrid-active' in (page.locator('body').get_attribute('class') or '')
 expect(page.locator('#hybrid-journey')).to_be_visible()
 assert page.locator('[data-hybrid-step]').count()>0
 assert page.locator('#room-tab-nav [data-room-tab]').count()>0
 assert page.locator('.hybrid-left-dock').is_visible()
 assert page.locator('.hybrid-right-dock').is_visible()
 # Active layout geometry and central viewing area
 left=page.locator('.hybrid-left-dock').bounding_box();middle=page.locator('.rooms-main').bounding_box();right=page.locator('.hybrid-right-dock').bounding_box();bottom=page.locator('#hybrid-journey').bounding_box()
 assert left['x']<middle['x']<right['x'] and bottom['y']>middle['y'],(left,middle,right,bottom)
 assert middle['width']>500 and middle['height']>350,(middle)
 page.screenshot(path=str(ROOT/'docs/preview-hibrido-v24.png'))
 # Furniture is part of left dock (not floating on top of the canvas)
 page.locator('#hybrid-tab-furniture').click()
 assert page.locator('.hybrid-left-dock #floor-palette button').count()>=10
 expect(page.locator('#room-furniture-palette')).to_be_visible()
 page.locator('#hybrid-tab-rooms').click()
 expect(page.locator('#room-tab-nav')).to_be_visible()
 # Right side switches between object and room options
 page.locator('#hybrid-tab-environment').click()
 expect(page.locator('#room-detail')).to_be_visible()
 page.locator('#hybrid-tab-object').click()
 expect(page.locator('#floor-editor-inspector')).to_be_visible()
 # The activity strip edits real model tasks, not a disconnected mockup
 page.locator('[data-hybrid-step]').first.click()
 expect(page.locator('#room-task-dialog')).to_be_visible()
 page.locator('#room-task-close').click()
 # Room selections remain real, physical overview still accessible
 room_tabs=page.locator('[data-room-tab]');room_tabs.nth(1).click()
 assert room_tabs.nth(1).get_attribute('aria-selected')=='true'
 page.locator('[data-room-display="overview"]').click()
 expect(page.locator('#site-overview')).to_be_visible()
 page.locator('[data-room-tab]').first.click()
 expect(page.locator('#floor-editor')).to_be_visible()
 # Main mode routing into simulation and back
 page.locator('#hybrid-simulate').click()
 expect(page.locator('#simulation-view')).to_be_visible()
 page.locator('.rail-btn[data-view="rooms"]').click()
 expect(page.locator('#hybrid-journey')).to_be_visible()
 # Responsive layout with panels not covering the scene on desktop/laptop
 for w,h in [(1280,720),(820,1000),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(120)
  assert page.locator('#hybrid-journey').is_visible(),w
  center=page.locator('.rooms-main').bounding_box()
  assert center and center['width']>min(300,w*.45), (w,center)
  if w==390:page.screenshot(path=str(ROOT/'docs/preview-hibrido-mobile-v24.png'))
 assert not errors, errors
 print('PASS hybrid layout, actions, journey, modes and responsive sizes')
 browser.close()
