#!/usr/bin/env python3
"""v0.8: two-tab independent editing + scenario/simulation browser regression."""
import json
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(inline_app(ROOT),wait_until='load')
    assert page.locator('[data-view]').count()==2, 'Navigation must have exactly two tabs'
    assert page.locator('#rooms-view').is_visible()
    page.locator('[data-room-display=cards]').click() # regression do editor operacional clássico
    expect(page.locator('#editor-view')).to_be_hidden()
    assert page.locator('.room-tile').count()==5
    assert page.locator('.room-part').count()==12
    # Edit an existing canonical activity and change its duration via rooms only.
    page.locator('.room-part').filter(has_text='Realizar atendimento').click()
    expect(page.locator('#room-task-dialog')).to_be_visible()
    page.locator('#room-task-form [name=title]').fill('Consulta e orientação')
    page.locator('#room-task-form [name=duration]').fill('18')
    page.locator('#room-task-form button[type=submit]').click()
    expect(page.locator('#room-task-heading')).to_have_text('Consulta e orientação')
    page.locator('#room-task-close').click()
    assert page.locator('.room-part').filter(has_text='Consulta e orientação').count()==1
    # Add an operational area and an activity without using the hidden canvas.
    page.locator('#room-create-name').fill('Qualidade')
    page.locator('#room-create-btn').click()
    page.locator('#room-toggle-details').click()  # v1.1+: propriedades gerais recolhidas por padrão
    page.locator('#room-new-part-type').select_option('activity')
    page.locator('#room-new-part-title').fill('Verificar qualidade')
    page.locator('#room-new-part-duration').fill('7')
    page.locator('#room-new-part-btn').click()
    assert page.locator('.room-part').filter(has_text='Verificar qualidade').count()==1
    # Link it to the end of an existing flow; the simulation uses these links.
    page.locator('.room-part').filter(has_text='Receber avaliação').click()
    dest_value=page.locator('#room-link-destination option').filter(has_text='Verificar qualidade').get_attribute('value')
    page.locator('#room-link-destination').select_option(dest_value)
    page.locator('#room-link-add').click()
    expect(page.locator('#room-task-status')).to_contain_text('Conexão criada')
    page.locator('#room-task-close').click()
    # Simulate and navigate back, not to a removed view.
    page.locator('[data-view=simulation]').click()
    assert page.locator('#simulation-view').is_visible()
    assert page.locator('#sim-stats').inner_text().strip()
    assert page.locator('#sim-error').is_hidden()
    page.locator('#sim-cases').fill('3')
    page.locator('#sim-run').click()
    assert '3' in page.locator('#sim-cases-tag').inner_text()
    page.locator('#sim-play').click()
    expect(page.locator('#sim-play')).to_contain_text('Pausar')
    page.locator('#sim-back').click()
    assert page.locator('#rooms-view').is_visible()
    page.locator('[data-room-display=cards]').click() # regression do editor operacional clássico
    # Validate editable export and no unlinked nodes from the new area.
    page.locator('#btn-export').click()
    with page.expect_download() as dl:page.locator('[data-export=json]').click()
    download=dl.value
    output=ROOT/'artifacts'/'v08-export-test.json'
    output.parent.mkdir(exist_ok=True)
    download.save_as(str(output))
    d=json.loads(output.read_text())
    assert d['name'].startswith('Clínica')
    assert len(d['environments'])==5
    assert any(n['title']=='Verificar qualidade' and n['duration']==7 for n in d['nodes'])
    assert any(n['title']=='Consulta e orientação' and n['duration']==18 for n in d['nodes'])
    assert any(e['to']==dest_value for e in d['edges'])
    assert not errors,errors
    # Responsive: both tabs still accessible and configuration usable.
    page.set_viewport_size({'width':390,'height':844})
    page.locator('.room-part').filter(has_text='Consulta e orientação').click()
    assert page.locator('#room-task-dialog').is_visible()
    assert page.locator('#room-task-form [name=duration]').input_value()=='18'
    assert not errors,errors
    browser.close()
print('v0.8 browser: navigation, edit, create, connect, simulate, playback, export and mobile passed')
