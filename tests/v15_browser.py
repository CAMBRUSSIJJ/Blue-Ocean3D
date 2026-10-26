#!/usr/bin/env python3
"""Interface v1.5: biblioteca, ambiente individual, inserção 2D, simulação e responsividade."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':950},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    expect(page.locator('.rail-version')).to_contain_text('1.5')
    assert page.locator('[data-view]').count()==2
    assert page.locator('.floor-palette-item').count()==15
    expect(page.locator('#floor-library-search')).to_be_visible()
    page.locator('#floor-library-search').fill('maca')
    assert page.locator('.floor-palette-item:visible').count()==1
    page.locator('#floor-library-search').fill('')
    page.locator('#floor-library-category').select_option('Espera')
    assert page.locator('.floor-palette-item:visible').count()==4
    page.locator('#floor-library-category').select_option('')
    page.wait_for_function("()=>document.querySelector('[data-room-display=visual]').classList.contains('active')||document.querySelector('.room3d-canvas')!==null",timeout=15000)
    webgl=page.locator('.room3d-canvas').count()>0
    if webgl:
        expect(page.locator('.room3d-canvas')).to_be_visible()
        page.locator('[data-room3d-control="top"]').click()
        page.locator('[data-room3d-control="isometric"]').click()
        page.locator('[data-room3d-control="cutaway"]').click()
        page.locator('[data-room-display="visual"]').click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    page.locator('[data-room-tab]').last.click()
    expect(page.locator('#floor-editor-map')).to_be_visible()
    assert page.locator('.floor-surface').count()==1
    page.locator('[data-furniture-kind="bench"]').click()
    target=page.locator('.floor-surface')
    target.click(position={'x':285,'y':145})
    expect(page.locator('.floor-prop-bench')).to_have_count(1)
    page.locator('[data-furniture-kind="printer"]').click()
    target.click(position={'x':225,'y':115})
    expect(page.locator('.floor-prop-printer')).to_have_count(1)
    page.locator('[data-furniture-kind=stool]').drag_to(target,target_position={'x':480,'y':300})
    expect(page.locator('.floor-prop-stool')).to_have_count(1)
    page.evaluate("window.scrollTo(0,document.querySelector('#floor-editor').getBoundingClientRect().top+window.scrollY-85)")
    page.screenshot(path=str(ROOT/'docs'/'preview-biblioteca-v15.png'),full_page=False)
    page.locator('#btn-export').click()
    with page.expect_download() as dl:page.locator('[data-export="json"]').click()
    data=json.loads(Path(dl.value.path()).read_text())
    assert {x['kind'] for x in data['floorplan']['objects']} >= {'bench','printer','stool'}
    page.locator('#room-back').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    expect(page.locator('.sim-controls')).to_be_visible()
    page.screenshot(path=str(ROOT/'docs'/'preview-simulacao-v15.png'),full_page=False)
    page.locator('#sim-back').click()
    page.set_viewport_size({'width':390,'height':844})
    expect(page.locator('#floor-library-search')).to_be_visible()
    assert not page.locator('body').evaluate('(el)=>el.scrollWidth>window.innerWidth+10')
    page.screenshot(path=str(ROOT/'docs'/'preview-mobile-v15.png'),full_page=False)
    assert not errors,errors
    print('Browser v1.5 OK; 3D WebGL disponível?',webgl)
    browser.close()
