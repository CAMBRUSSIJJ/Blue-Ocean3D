#!/usr/bin/env python3
"""P8 acceptance: four workspaces, project gallery, canonical workflow, 3D/2D toggles."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':850},reduced_motion='reduce')
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 nav=page.locator('.p7-tabs [data-bo-stage]')
 expect(nav).to_have_count(4)
 assert nav.all_text_contents()==['Espaços','Funcionamento','Simulação','Resultados']
 expect(page.locator('.p8-space-tabs')).to_be_visible()
 page.locator('#bo-workflow-mount').click()
 expect(page.locator('#room-3d-stage')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-floor').click()
 expect(page.locator('#floor-editor-map')).to_be_visible(timeout=15000)
 page.locator('#hybrid-construct').click()
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-service').click()
 expect(page.locator('#p8-flow-surface')).to_be_visible()
 assert page.locator('.p8-flow-card').count()>0
 page.locator('.p8-flow-card').first.click()
 expect(page.locator('#room-task-dialog')).to_be_visible()
 page.locator('#room-task-close').click()
 page.locator('#p8-projects-button').click()
 expect(page.locator('#p8-projects-home')).to_be_visible()
 expect(page.locator('.p8-project-card')).to_have_count(1)
 page.locator('#p8-project-create').click()
 expect(page.locator('#p8-project-dialog')).to_be_visible()
 page.locator('#p8-project-form input[name="name"]').fill('Projeto P8 Teste')
 page.locator('#p8-project-form button[type="submit"]').click()
 expect(page.locator('#p8-project-dialog')).to_be_hidden()
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 page.locator('#p8-projects-button').click()
 expect(page.locator('.p8-project-card')).to_have_count(2)
 expect(page.locator('#p8-projects-home')).to_contain_text('Projeto P8 Teste')
 first=page.locator('.p8-project-card').filter(has_text='Clínica')
 first.locator('[data-p8-open]').click()
 expect(page.locator('#site-overview')).to_be_visible(timeout=15000)
 assert page.evaluate('doc.environments.length')>=4
 page.locator('#hybrid-simulate').click()
 expect(page.locator('#p7-runtime')).to_be_visible(timeout=15000)
 page.locator('#bo-workflow-analyze').click()
 expect(page.locator('#p7-analysis')).to_be_visible(timeout=15000)
 assert not errors,errors
 print('PASS P8: projects, tabs, operational flow, live simulation and analysis')
 browser.close()
