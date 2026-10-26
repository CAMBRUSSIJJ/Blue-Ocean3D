from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1536,'height':960},accept_downloads=True)
    failures=[];page.on('pageerror',lambda err:failures.append(str(err)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    page.wait_for_timeout(1800)
    expect(page.locator('.rail-version')).to_contain_text('2.0')
    expect(page.locator('#rooms-view')).to_be_visible()
    print('WebGL:',page.locator('.room3d-canvas').count()>0)
    expect(page.locator('[data-room-display="overview"]')).to_be_visible()
    page.locator('[data-room-display="overview"]').click()
    expect(page.locator('#site-overview')).to_be_visible()
    assert page.locator('.site-room').count() >= 3
    assert not page.locator('#floor-editor').is_visible()
    page.screenshot(path=str(ROOT/'docs/preview-planta-geral-v20.png'),full_page=False)
    print('Resumo:',page.locator('.site-summary').inner_text())
    page.locator('.site-room-handle button').first.click()
    expect(page.locator('#site-overview')).to_be_hidden()
    expect(page.locator('#floor-editor')).to_be_visible()
    assert page.locator('[data-room-display="three"]').get_attribute('aria-pressed')=='true' or page.locator('[data-room-display="visual"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-room-display="visual"]').click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    obj=page.locator('#floor-editor-map [data-floor-prop]').first
    obj.click(force=True)
    expect(page.locator('#floor-editor-map [data-floor-resize]')).to_be_visible()
    grip=page.locator('#floor-editor-map [data-floor-resize]').first
    grip.scroll_into_view_if_needed()
    bounds=grip.bounding_box();assert bounds,bounds
    # Redimensionamento por arraste deve modificar a largura canônica em células.
    before_style=page.locator('#floor-editor-map [data-floor-prop]').first.get_attribute('style')
    x=bounds['x']+bounds['width']/2;y=bounds['y']+bounds['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+75,y,steps=8);page.mouse.up()
    after_style=page.locator('#floor-editor-map [data-floor-prop]').first.get_attribute('style')
    assert after_style!=before_style,('Alça não alterou o tamanho',before_style,after_style)
    expect(page.locator('#floor-editor-notice')).to_contain_text('Dimensões alteradas')
    expect(page.locator('#floor-editor-map [data-floor-prop]')).not_to_have_count(0)
    page.screenshot(path=str(ROOT/'docs/preview-redimensionar-v20.png'),full_page=False)
    page.locator('[data-room-display="overview"]').click()
    expect(page.locator('#site-overview')).to_be_visible()
    # Salas podem ser reposicionadas pelo título sem perder o projeto.
    moving=page.locator('[data-site-room]').nth(1)
    previous=moving.get_attribute('style')
    bar=moving.locator('[data-site-drag]')
    br=bar.bounding_box()
    page.mouse.move(br['x']+70,br['y']+20);page.mouse.down();page.mouse.move(br['x']+70,br['y']+240,steps=10);page.mouse.up()
    assert page.locator('[data-site-room]').nth(1).get_attribute('style') != previous
    page.locator('[data-view="simulation"]').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    page.locator('[data-view="rooms"]').click()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(350)
    print('Largura documento móvel:',page.evaluate('document.documentElement.scrollWidth'))
    page.screenshot(path=str(ROOT/'docs/preview-mobile-v20.png'))
    assert not failures,failures
    print('NAVEGADOR v2.0 APROVADO')
    browser.close()
