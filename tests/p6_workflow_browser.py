#!/usr/bin/env python3
"""P6 smoke: plan first, then create an environment, mount, define flow and configure a scenario."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1366,'height':768},reduced_motion='reduce')
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 expect(page.locator('#hybrid-construct')).to_have_attribute('aria-current','page')
 expect(page.locator('[data-site-create-room]').first).to_be_visible()
 assert page.locator('#room-3d-stage').is_hidden()
 old=page.evaluate('doc.environments.length')
 page.locator('[data-site-create-room]').first.click()
 expect(page.locator('#room-create-dialog')).to_be_visible()
 page.locator('#room-create-dialog-name').fill('Sala P6 de Teste')
 page.locator('#room-create-form button[type="submit"]').click()
 expect(page.locator('#room-create-dialog')).to_be_hidden()
 assert page.evaluate('doc.environments.length')==old+1
 expect(page.locator('#site-overview')).to_contain_text('Sala P6 de Teste')
 page.locator('#bo-workflow-mount').click()
 expect(page.locator('#room-3d-stage')).to_be_visible(timeout=12000)
 expect(page.locator('#bo-workflow-mount')).to_have_attribute('aria-current','page')
 controls=page.locator('#room-3d-stage')
 camera=page.locator('#bo-camera-options')
 expect(camera).to_be_visible()
 assert controls.locator('[data-room3d-control="left"]').is_hidden()
 camera.click()
 expect(controls.locator('[data-room3d-control="left"]')).to_be_visible()
 camera.click()
 expect(controls.locator('[data-room3d-control="left"]')).to_be_hidden()
 page.locator('#bo-workflow-service').click()
 expect(page.locator('.room-workflow-drawer')).to_be_visible()
 expect(page.locator('.room-connections')).to_be_visible()
 expect(page.locator('#room-current-activities')).to_be_visible()
 expect(page.locator('#bo-workflow-service')).to_have_attribute('aria-current','page')
 page.locator('#hybrid-simulate').click()
 expect(page.locator('#simulation-view')).to_be_visible()
 expect(page.locator('#sim-run')).to_be_visible()
 page.locator('#bo-workflow-analyze').click()
 expect(page.locator('#bo-workflow-analyze')).to_have_attribute('aria-current','page')
 page.locator('#hybrid-construct').click()
 expect(page.locator('#site-overview')).to_be_visible()
 assert page.evaluate('doc.environments.length')==old+1
 assert not errors,errors
 print('PASS P6 Chromium: physical plan, new room, 3D, camera controls, restored operations, scenario and analysis')
 browser.close()
