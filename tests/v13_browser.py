#!/usr/bin/env python3
"""Regressão v1.3: um ambiente por vez, 3D com fallback 2D, objetos, atividades, simulação e mobile."""
from pathlib import Path
import json
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1536,'height':985},accept_downloads=True,device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    expect(page.locator('.rail-version')).to_contain_text('1.3')
    assert page.locator('[data-view]').count()==2
    assert page.locator('[data-room-tab]').count()>=3
    # Headless Chromium aqui não disponibiliza WebGL; a recuperação 2D deve ser automática.
    page.wait_for_function("()=>document.querySelector('[data-room-display=visual]').classList.contains('active')||document.querySelector('.room3d-canvas')!==null",timeout=10000)
    webgl=page.locator('.room3d-canvas').count()>0
    if webgl:
        assert page.locator('#room-3d-stage').is_visible()
        page.locator('[data-room-display="visual"]').click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    assert page.locator('#floor-editor-map .floor-editor-room').count()==1
    first=page.locator('#room-studio-heading').inner_text()
    page.locator('[data-room-tab]').nth(1).click()
    second=page.locator('#room-studio-heading').inner_text()
    assert first!=second,(first,second)
    assert page.locator('#floor-editor-map .floor-editor-room').count()==1
    assert page.locator('#room-current-activities').is_visible()
    expect(page.locator('#floor-editor-map .floor-room-heading')).to_contain_text(second.replace('Editando: ',''))
    # Planta física é editável no contexto da sala selecionada.
    page.locator('#floor-room-scale').fill('1.1')
    page.locator('#floor-room-scale').dispatch_event('change')
    expect(page.locator('#floor-editor-inspector')).to_contain_text('13.20 m')
    # Navegação de volta não perde a escala editada.
    page.locator('[data-room-tab]').first.click()
    page.locator('[data-room-tab]').nth(1).click()
    expect(page.locator('#floor-room-scale')).to_have_value('1.10')
    # Novo ambiente individual.
    page.locator('#room-create-name').fill('Sala de acolhimento')
    page.locator('#room-create-btn').click()
    expect(page.locator('#room-studio-heading')).to_contain_text('Sala de acolhimento')
    assert page.locator('#floor-editor-map .floor-editor-room').count()==1
    assert page.locator('[data-room-tab]').count()>=5
    # Atividade, contexto do ambiente e painel de edição.
    page.locator('#floor-add-task').click()
    page.locator('#room-new-part-type').select_option('activity')
    page.locator('#room-new-part-title').fill('Realizar acolhimento')
    page.locator('#room-new-part-btn').click()
    expect(page.locator('#room-current-activities')).to_contain_text('Realizar acolhimento')
    # Exportação com ambientes e escala anterior preservados.
    page.locator("#btn-export").click()
    with page.expect_download() as download_info:page.locator('[data-export="json"]').click()
    download=download_info.value
    data=json.loads(Path(download.path()).read_text())
    assert any(r['name']=='Sala de acolhimento' for r in data['environments'])
    assert any(n['title']=='Realizar acolhimento' for n in data['nodes'])
    assert any(abs(v-1.1)<1e-5 for v in data['floorplan']['scales'].values())
    page.screenshot(path=str(ROOT/'docs'/'preview-editor-individual-v13.png'),full_page=False)
    page.locator('#room-back').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    # Comparações operacionais permanecem acessíveis.
    expect(page.locator('.sim-controls')).to_be_visible()
    page.locator('#sim-back').click()
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('[data-room-tab]').count()>=5
    assert page.locator('#floor-editor').is_visible()
    assert not page.locator('body').evaluate('(el)=>el.scrollWidth > window.innerWidth+10')
    page.screenshot(path=str(ROOT/'docs'/'preview-mobile-v13.png'),full_page=False)
    assert not errors,errors
    b.close()
print('v1.3 navegador: ambiente individual, seleção, escala, atividades, exportação, simulação e mobile — OK')
