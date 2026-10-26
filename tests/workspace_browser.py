#!/usr/bin/env python3
"""Smoke E2E for the real editor DOM: panes, mouse/keyboard, and object inspector."""
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
 page.wait_for_timeout(600)
 if page.locator('#site-overview').is_hidden():
  raise RuntimeError('Startup error: '+repr(errors)+'; root='+str(page.evaluate("document.querySelector('#rooms-view')?.outerHTML.slice(0,200)")))
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-mount').click()
 left=page.locator('.workspace-splitter-left')
 expect(left).to_be_visible(timeout=15000)
 old=page.evaluate('document.querySelector(".rooms-shell").style.getPropertyValue("--workspace-left-size")')
 left.focus()
 page.keyboard.press('ArrowRight')
 new=page.evaluate('document.querySelector(".rooms-shell").style.getPropertyValue("--workspace-left-size")')
 assert int(new.replace('px',''))>int(old.replace('px','')),(old,new)
 page.get_by_role('button',name='Recolher biblioteca').click()
 expect(page.locator('.hybrid-left-dock')).to_be_hidden()
 page.get_by_role('button',name='Abrir biblioteca').click()
 expect(page.locator('.hybrid-left-dock')).to_be_visible()
 page.locator('#bo-workflow-floor').click()
 page.locator('.floor-prop[data-floor-prop]').first.click()
 expect(page.locator('.workspace-inspector-section')).to_have_count(3)
 expect(page.locator('fieldset.studio18-position')).to_have_attribute('aria-label','Posição precisa do móvel')
 assert not errors,errors
 print('PASS UX P0/P1: responsive docks, keyboard resizing, and inspector grouping')
 browser.close()
