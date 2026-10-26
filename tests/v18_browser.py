"""v1.8: interface real de edição precisa, fallback e modo de construção 3D."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1536,'height':960},device_scale_factor=1)
    failures=[];page.on('pageerror',lambda err:failures.append(str(err)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    page.wait_for_timeout(1250)
    expect(page.locator('.rail-version')).to_contain_text('1.8')
    expect(page.locator('#rooms-view')).to_be_visible()
    assert page.locator('[data-view]').count()==2
    assert not page.locator('.rooms-catalog').is_visible()
    assert page.locator('[data-room3d-structure]').count()==3
    webgl=page.locator('.room3d-canvas').count()>0
    print('Editor 3D renderizado:',webgl)
    if webgl:
        page.locator('[data-room3d-structure="wall"]').click()
        assert page.locator('[data-room3d-structure="wall"]').get_attribute('aria-pressed')=='true'
        page.locator('[data-room3d-structure="door"]').click()
        assert page.locator('[data-room3d-structure="door"]').get_attribute('aria-pressed')=='true'
        page.locator('[data-room3d-structure="door"]').click()
        assert page.locator('[data-room3d-structure="door"]').get_attribute('aria-pressed')=='false'
        page.screenshot(path=str(ROOT/'docs/preview-construtor-3d-v18.png'))
    else:
        expect(page.locator('#floor-editor-map')).to_be_visible()
    page.locator('[data-room-display="visual"]').click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    if page.locator('#room-furniture-palette').is_visible():page.locator('#room-toggle-library').click()
    if not page.locator('#floor-editor-inspector').is_visible():page.locator('#room-toggle-object-inspector').click()
    objects=page.locator('#floor-editor-map [data-floor-prop]')
    assert objects.count()>0,'Example missing furniture'
    objects.first.click(force=True)
    expect(page.locator('#studio18-apply')).to_be_visible()
    before=page.locator('#floor-editor-map [data-floor-prop]').count()
    page.locator('#studio18-duplicate').click()
    after=page.locator('#floor-editor-map [data-floor-prop]').count()
    assert after==before+1,(before,after)
    expect(page.locator('#studio18-apply')).to_be_visible()
    page.locator('#studio18-x').fill('99')
    page.locator('#studio18-apply').click()
    expect(page.locator('#floor-editor-notice')).to_contain_text('válidas')
    page.locator('[data-studio18-nudge="1,0"]').click()
    assert page.locator('#floor-editor-map [data-floor-prop]').count()==after
    page.screenshot(path=str(ROOT/'docs/preview-controles-precisos-v18.png'))
    page.locator('[data-view="simulation"]').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    page.locator('[data-view="rooms"]').click()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(250)
    assert page.evaluate('document.documentElement.scrollWidth')<=394,'Mobile overflow'
    page.screenshot(path=str(ROOT/'docs/preview-estudio-mobile-v18.png'))
    assert not failures,failures
    print('Browser v1.8 OK')
    browser.close()
