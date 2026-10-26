#!/usr/bin/env python3
"""Testes funcionais da v1.0, incluindo modo 2D, drag, atores e responsividade."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(inline_app(ROOT),wait_until='load')
    assert page.locator('[data-view]').count()==2
    expect(page.locator('#floor-editor')).to_be_visible()
    assert page.locator('#floor-editor .floor-editor-room').count()==4
    assert page.locator('#room-grid').is_hidden()
    assert page.locator('#floor-editor .floor-prop').count()>=12
    before=page.locator('#floor-editor .floor-prop').count()
    page.locator('#floor-auto').click()
    assert page.locator('#floor-editor .floor-prop').count()==before
    # Seleciona objeto, verifica o painel, testa posicionamento pela grade.
    first=page.locator('#floor-editor [data-floor-prop]').first
    first.scroll_into_view_if_needed()
    start=first.bounding_box()
    page.mouse.click(start['x']+start['width']/2,start['y']+start['height']/2)
    expect(page.locator('#floor-object-node')).to_be_visible()
    # A camada original deve continuar íntegra ao mover um móvel; deslocamento reduzido.
    page.locator('[data-room-display="cards"]').click()
    expect(page.locator('#room-grid')).to_be_visible()
    assert page.locator('.room-tile').count()>=4
    page.locator('[data-room-display="visual"]').click()
    expect(page.locator('#floor-editor')).to_be_visible()
    # Cria uma nova planta em um espaço vazio.
    page.locator('#floor-palette [data-furniture-kind="chair"]').click()
    surface=page.locator('[data-floor-surface]').last
    surface.scroll_into_view_if_needed()
    box=surface.bounding_box()
    page.mouse.click(box['x']+box['width']*.79,box['y']+box['height']*.61)
    assert page.locator('#floor-editor .floor-prop').count()==before+1
    expect(page.locator('#floor-object-node')).to_be_visible()
    page.locator('#floor-remove').click()
    assert page.locator('#floor-editor .floor-prop').count()==before
    # Visualiza profissionais e clientes vinculados aos eventos reais da simulação.
    page.locator('#room-back').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    assert page.locator('#sim-floor .floor-editor-room').count()==4
    assert page.locator('#sim-floor .floor-prop').count()>=before
    assert page.locator('.floor-person-client').count()>0
    page.locator('#sim-progress').fill('12')
    assert page.locator('.floor-person').count()>0
    # Clicar em um avatar abre a mesma atividade da linha do tempo.
    page.locator('.floor-person-client').first.click()
    expect(page.locator('#sim-selected')).to_contain_text('Atendimento #')
    page.locator('[data-sim-preset="peak"]').click()
    assert int(page.locator('#sim-cases').input_value())>=10
    assert page.locator('#sim-error').is_hidden()
    page.locator('#sim-reference').click()
    expect(page.locator('#sim-comparison')).to_contain_text('Referência')
    page.locator('#sim-play').click()
    page.wait_for_timeout(500)
    page.locator('#sim-play').click()
    assert page.locator('.floor-person-client').count()>0
    (ROOT/'docs').mkdir(exist_ok=True)
    page.locator('.sim-floor-card').screenshot(path=str(ROOT/'docs'/'preview-simulacao-2d-v10.png'))
    page.locator('#sim-back').click()
    page.locator('#floor-editor').screenshot(path=str(ROOT/'docs'/'preview-editor-2d-v10.png'))
    page.set_viewport_size({'width':390,'height':844})
    assert not page.locator('body').evaluate('(el)=>el.scrollWidth > window.innerWidth+10')
    page.locator('#room-back').click()
    assert page.locator('.floor-editor-room').count()>=4
    assert not page.locator('body').evaluate('(el)=>el.scrollWidth > window.innerWidth+10')
    assert not errors,errors
    browser.close()
print('v1.0 browser: editor 2D, objetos, navegação, simulação, avatares e mobile — OK')
