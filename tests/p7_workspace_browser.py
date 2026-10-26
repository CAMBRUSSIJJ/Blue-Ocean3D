#!/usr/bin/env python3
"""P7 interactive acceptance: six independent tabs, real library filters, separated analysis."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':850},reduced_motion='reduce')
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 nav=page.locator('.p7-tabs [data-bo-stage]')
 expect(nav).to_have_count(6)
 assert [x.strip() for x in nav.all_text_contents()]==[
  'Visão geral do serviço','Ambiente 3D','Planta 2D','Fluxo e conexões','Simular','Analisar'
 ]
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-mount').click()
 expect(page.locator('#room-3d-stage')).to_be_visible(timeout=15000)
 expect(page.locator('#hybrid-tab-people')).to_be_visible()
 assert page.locator('.floor-palette-item').count()==40
 page.locator('#hybrid-tab-people').click()
 expect(page.locator('.floor-palette')).to_be_visible()
 assert page.locator('.floor-palette-item:visible').count()==5
 expect(page.locator('#p7-library-count')).to_contain_text('5 itens')
 page.locator('#hybrid-tab-furniture').click()
 category=page.locator('#floor-library-category')
 category.select_option('Clínica')
 page.locator('#floor-library-search').fill('consultorio')
 assert page.locator('.floor-palette-item:visible').count()>0
 page.locator('#floor-library-search').fill('xxxxxxxx-nao-existe')
 expect(page.locator('.p7-library-empty')).to_be_visible()
 page.locator('#p7-library-clear').click()
 expect(page.locator('#p7-library-count')).to_contain_text('40 itens')
 page.locator('#bo-workflow-floor').click()
 expect(page.locator('#floor-editor-map')).to_be_visible()
 page.locator('#bo-workflow-service').click()
 expect(page.locator('.room-workflow-drawer')).to_be_visible()
 page.locator('#hybrid-simulate').click()
 expect(page.locator('#p7-runtime')).to_be_visible(timeout=15000)
 expect(page.locator('#p7-analysis')).to_be_hidden()
 expect(page.locator('#p7-start')).to_be_visible()
 expect(page.locator('#sim16-scene')).to_be_visible(timeout=15000)
 expect(page.locator('#sim-stats')).to_be_hidden()
 created_at=page.evaluate('simulator.state.result?.createdAt')
 assert created_at, 'Scenario did not calculate'
 page.locator('#bo-workflow-analyze').click()
 expect(page.locator('#p7-analysis')).to_be_visible(timeout=15000)
 expect(page.locator('#p7-runtime')).to_be_hidden()
 expect(page.locator('#sim-stats')).to_be_visible()
 expect(page.locator('#p7-analysis-charts')).to_be_visible()
 assert page.locator('.p7-chart-row').count()>0
 expect(page.locator('#p4-export-report')).to_be_enabled()
 page.locator('#hybrid-simulate').click()
 expect(page.locator('#p7-runtime')).to_be_visible()
 assert page.evaluate('simulator.state.result?.createdAt')==created_at, 'Tab switch must not recalculate'
 page.set_viewport_size({'width':900,'height':740})
 expect(nav.first).to_be_visible()
 page.set_viewport_size({'width':700,'height':760})
 expect(page.locator('#p7-start')).to_be_visible()
 assert not errors,errors
 print('PASS P7 Chromium: six tabs, 40 products, people, accent filters, physical editor, distinct simulation and analysis')
 browser.close()
