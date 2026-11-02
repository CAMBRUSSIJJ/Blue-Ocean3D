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
 # The map must occupy the entire available workspace, without a legacy white
 # strip, cropped cards or duplicate Journey footer (reported on Firefox).
 assert page.locator('#p8-flow-surface').evaluate("el => el.parentElement.classList.contains('rooms-main')")
 expect(page.locator('.room-workflow-drawer')).to_be_hidden()
 expect(page.locator('#hybrid-journey')).to_be_hidden()
 expect(page.locator('.p71-dock-actions')).to_be_hidden()
 for width,height in [(1536,959),(1280,720)]:
  page.set_viewport_size({'width':width,'height':height})
  page.wait_for_timeout(150)  # allow dynamic viewport units and flex tracks to settle
  dims=page.evaluate("""() => {
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   const flow=rect('#p8-flow-surface'),board=rect('.p8-flow-board'),
    viewport=rect('#rooms-view'),head=rect('.p8-flow-head');
   return {flow:{top:flow.top,bottom:flow.bottom,width:flow.width,height:flow.height},
    boardHeight:board.height,headHeight:head.height,viewportBottom:viewport.bottom}
  }""")
  assert dims['flow']['height']>=300,dims
  assert dims['boardHeight']>=160,dims
  assert dims['flow']['bottom']<=height+3,dims
  assert dims['flow']['bottom']<=dims['viewportBottom']+3,dims
  assert dims['flow']['width']>width*.85,dims
  print('P8 geometry',width,height,dims)
 page.set_viewport_size({'width':1440,'height':850})
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
