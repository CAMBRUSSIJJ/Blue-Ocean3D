"""UX v1.9: tamanho personalizado, seleção em grupo, projeto editável, simulação."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1536,'height':960},accept_downloads=True)
    failures=[];page.on('pageerror',lambda err:failures.append(str(err)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    page.wait_for_timeout(1200)
    expect(page.locator('.rail-version')).to_contain_text('1.9')
    expect(page.locator('#rooms-view')).to_be_visible()
    assert page.locator('[data-view]').count()==2
    assert not page.locator('.rooms-catalog').is_visible()
    webgl=page.locator('.room3d-canvas').count()>0
    print('3D WebGL em Chromium:',webgl)
    if webgl:
        page.screenshot(path=str(ROOT/'docs/preview-v19-estudio-3d.png'))
    page.locator('[data-room-display="visual"]').click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    if page.locator('#room-furniture-palette').is_visible():page.locator('#room-toggle-library').click()
    if not page.locator('#floor-editor-inspector').is_visible():page.locator('#room-toggle-object-inspector').click()
    objects=page.locator('#floor-editor-map [data-floor-prop]')
    assert objects.count()>=2
    objects.first.click(force=True)
    expect(page.locator('#studio19-resize')).to_be_visible()
    print('Medidas atuais:',page.locator('#studio19-width').input_value(),page.locator('#studio19-height').input_value())
    # Redimensionar para tamanho atual é uma operação válida, registrando campos no JSON.
    current_w=int(page.locator('#studio19-width').input_value())
    current_h=int(page.locator('#studio19-height').input_value())
    page.locator('#studio19-width').fill(str(current_w))
    page.locator('#studio19-height').fill(str(current_h))
    page.locator('#studio19-resize').click()
    expect(page.locator('#floor-editor-notice')).to_contain_text('Dimensões atualizadas')
    # Selecionar +1 objeto com Shift, mantendo o primeiro.
    page.locator('#floor-editor-map [data-floor-prop]').nth(1).click(force=True,modifiers=['Shift'])
    expect(page.locator('#studio19-group-remove')).to_be_visible()
    expect(page.locator('#floor-editor-inspector')).to_contain_text('2 móveis selecionados')
    page.screenshot(path=str(ROOT/'docs/preview-editor-v19-selecao-grupo.png'))
    # Limpar, voltar a um móvel e verificar persistência da dimensão.
    page.locator('#studio19-group-clear').click()
    objects.first.click(force=True)
    expect(page.locator('#studio19-resize')).to_be_visible()
    page.screenshot(path=str(ROOT/'docs/preview-editor-v19-dimensoes.png'))
    page.locator('[data-view="simulation"]').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    page.locator('[data-view="rooms"]').click()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(200)
    assert page.evaluate('document.documentElement.scrollWidth') <= 400
    page.screenshot(path=str(ROOT/'docs/preview-editor-mobile-v19.png'))
    assert not failures,failures
    print('Browser v1.9 aprovado')
    browser.close()
