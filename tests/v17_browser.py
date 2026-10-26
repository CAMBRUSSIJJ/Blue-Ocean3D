from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:4197/app/'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1536,'height':960},device_scale_factor=1)
    failures=[]
    page.on('pageerror',lambda exc: failures.append(str(exc)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    page.wait_for_timeout(900)
    expect(page.locator('.rail-version')).to_contain_text('1.7')
    expect(page.locator('#rooms-view')).to_be_visible()
    assert page.locator('[data-view]').count()==2
    assert not page.locator('.rooms-catalog').is_visible(), 'Old catalog visible'
    stage=page.locator('#room-3d-stage' if page.locator('#room-3d-stage').is_visible() else '#floor-editor-map')
    bbox=stage.bounding_box()
    rooms=page.locator('#rooms-view').bounding_box()
    print('Initial canvas',bbox,'work area',rooms,'canvas/window width',round(bbox['width']/1536,2))
    assert bbox['width']>=1100, 'Canvas not full width'
    assert bbox['height']>=450, 'Canvas too short'
    assert page.locator('#room-furniture-palette').is_visible()
    page.screenshot(path=str(ROOT/'docs/preview-estudio-tela-inteira-v17.png'))
    # Panels are overlays that do not shrink the canvas.
    page.locator('#room-toggle-library').click()
    assert not page.locator('#room-furniture-palette').is_visible()
    assert abs(stage.bounding_box()['width']-bbox['width'])<4
    page.locator('#room-toggle-library').click()
    assert page.locator('#room-furniture-palette').is_visible()
    page.locator('#room-toggle-object-inspector').click()
    assert page.locator('#floor-editor-inspector').is_visible()
    assert abs(stage.bounding_box()['width']-bbox['width'])<4
    page.locator('#room-toggle-object-inspector').click()
    page.locator('#room-toggle-details').click()
    assert page.locator('#room-detail').is_visible()
    page.locator('#room-toggle-details').click()
    # One room per top tab, modal replaces sidebar catalog.
    first=page.locator('[data-room-tab]').count()
    page.locator('#room-tab-add').click()
    expect(page.locator('#room-create-dialog')).to_be_visible()
    page.locator('#room-create-dialog-name').fill('Sala de testes UX')
    page.locator('#room-create-form button[type=submit]').click()
    assert page.locator('[data-room-tab]').count()==first+1
    expect(page.locator('#room-studio-heading')).to_contain_text('Sala de testes UX')
    assert not page.locator('#room-create-dialog').is_visible()
    page.locator('[data-room-tab]').first.click()
    expect(page.locator('#room-studio-heading')).not_to_contain_text('Sala de testes UX')
    page.locator('[data-room-display=visual]').click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    assert not page.locator('.rooms-catalog').is_visible()
    page.locator('[data-room-display=three]').click()
    page.locator('.room-workflow-drawer summary').first.click()
    expect(page.locator('#room-current-activities')).to_be_visible()
    page.locator('.room-workflow-drawer summary').first.click()
    page.locator('[data-view=simulation]').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    page.locator('[data-view=rooms]').click()
    expect(page.locator('#rooms-view')).to_be_visible()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(350)
    w=page.evaluate('document.documentElement.scrollWidth')
    print('mobile scroll width',w,'viewport 390')
    assert w<=394,('mobile overflow',w)
    assert page.locator('#room-tab-add').is_visible()
    assert not page.locator('.rooms-catalog').is_visible()
    page.screenshot(path=str(ROOT/'docs/preview-estudio-mobile-v17.png'))
    assert not failures,failures
    print('v1.7 browser OK')
    browser.close()
