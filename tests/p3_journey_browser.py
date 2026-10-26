#!/usr/bin/env python3
"""Full P3 smoke: canonical flow -> expandable journey -> linked simulated events and rooms."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1366,'height':768})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-service').click()
 journey=page.locator('#hybrid-journey-list')
 expect(journey).to_be_visible(timeout=12000)
 tasks=page.evaluate("doc.nodes.length")
 assert journey.locator('[data-hybrid-step]').count()==tasks,(tasks,journey.locator('[data-hybrid-step]').count())
 button=page.locator('#hybrid-journey-expand')
 if button.get_attribute('aria-expanded')!='true': button.click()
 expect(button).to_have_attribute('aria-expanded','true')
 page.locator('[data-hybrid-room]').first.click()
 expect(page.locator('#room-studio-heading')).to_contain_text('Editando:',timeout=8000)
 page.locator('#hybrid-simulate').click()
 if page.locator('#sim-allow-parallel').count():
  page.locator('#sim-allow-parallel').check()
  page.locator('#sim-run').click()
 expect(page.locator('#sim-journey')).to_be_visible(timeout=12000)
 sim_rows=page.locator('#sim-journey-steps [data-sim-journey-step]')
 assert sim_rows.count()==tasks,(sim_rows.count(),tasks)
 first=sim_rows.first
 selected=first.get_attribute('data-sim-journey-step')
 first.click()
 expect(page.locator('#sim-journey-steps .is-selected')).to_have_count(1)
 assert page.evaluate('simulator.state.selected.nodeId')==selected
 assert page.evaluate('simulator.state.selected.caseIndex')==1
 if page.locator('#sim-journey-case option').count()>1:
  page.locator('#sim-journey-case').select_option('2')
  sim_rows.first.click()
  assert page.evaluate('simulator.state.selected.caseIndex')==2
 assert not errors,errors
 print('PASS P3 Chromium: complete ordered journey, room navigation, simulator selection and case switching')
 browser.close()
