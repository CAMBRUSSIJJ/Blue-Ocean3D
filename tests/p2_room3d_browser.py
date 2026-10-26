#!/usr/bin/env python3
"""P2 smoke test in Chromium with a WebGL-capable software renderer."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1366,'height':768})
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-mount').click()
 stage=page.locator('#room-3d-stage')
 expect(stage).to_be_visible(timeout=12000)
 controls=stage.locator('[data-room3d-control="help"]')
 controls.click()
 expect(stage.locator('#room3d-quick-help')).to_be_visible()
 expect(controls).to_have_attribute('aria-expanded','true')
 stage.locator('[data-room3d-control="close-help"]').click()
 expect(stage.locator('#room3d-quick-help')).to_be_hidden()
 expect(controls).to_have_attribute('aria-expanded','false')
 # Locate an existing object via the canonical 2D editor before checking 3D selection.
 page.locator('[data-room-display="visual"]').click()
 furniture=page.locator('.floor-prop[data-floor-prop]').first
 expect(furniture).to_be_visible(timeout=8000)
 furniture.click()
 page.locator('[data-room-display="three"]').click()
 canvas=stage.locator('canvas.room3d-canvas')
 expect(canvas).to_be_visible(timeout=15000)
 focus=stage.locator('[data-room3d-control="focus-selected"]')
 focus.click()
 info=stage.locator('#room3d-object-info')
 expect(info).to_be_visible(timeout=6000)
 assert 'm · coluna' in info.inner_text()
 canvas.focus()
 page.keyboard.press('G')
 # Shortcut help should also be operable via the keyboard with focus in the scene.
 page.keyboard.press('H')
 expect(stage.locator('#room3d-quick-help')).to_be_visible()
 page.keyboard.press('Escape')
 expect(stage.locator('#room3d-quick-help')).to_be_hidden()
 assert not errors,errors
 print('PASS P2 Chromium: 3D selection, camera focus, contextual info and keyboard help')
 browser.close()
