#!/usr/bin/env python3
"""v1.4: navegação, galeria visual, altura, exportação, fallback WebGL e simulação."""
from pathlib import Path
import json
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
with open(ROOT/'docs'/'v14-browser-check.txt','w') as note:
 note.write('Browser test uses in-memory JavaScript bundle: localhost is blocked in sandbox.\n')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
        page=browser.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
        expect(page.locator('.rail-version')).to_contain_text('1.4')
        assert page.locator('[data-view]').count()==2
        assert page.locator('.furn-preview').count()==8
        assert page.locator('#room3d-wall-height').count()==1
        assert page.locator('[data-room3d-control="top"]').count()==1
        assert page.locator('[data-room3d-control="cutaway"]').count()==1
        # WebGL pode estar indisponível em containers: testar ambos os fluxos.
        page.wait_for_function("()=>document.querySelector('[data-room-display=visual]').classList.contains('active')||document.querySelector('.room3d-canvas')!==null",timeout=12000)
        webgl=page.locator('.room3d-canvas').count()>0
        if webgl:
            page.locator('#room3d-wall-height').fill('3.2')
            page.locator('#room3d-wall-height').dispatch_event('change')
            page.locator('[data-room3d-control="top"]').click()
            page.locator('[data-room3d-control="isometric"]').click()
            page.locator('[data-room3d-control="cutaway"]').click()
            expect(page.locator('[data-room3d-control="cutaway"]')).to_have_attribute('aria-pressed','false')
            page.locator('[data-room-display="visual"]').click()
        expect(page.locator('#floor-editor-map')).to_be_visible()
        if not webgl:
            page.locator('#floor-room-wall-height').fill('3.2')
            page.locator('#floor-room-wall-height').dispatch_event('change')
        expect(page.locator('#floor-room-wall-height')).to_have_value('3.20')
        page.locator('[data-room-tab]').nth(1).click()
        expect(page.locator('#floor-room-wall-height')).to_have_value('2.70')
        page.locator('[data-room-tab]').first.click()
        expect(page.locator('#floor-room-wall-height')).to_have_value('3.20')
        page.screenshot(path=str(ROOT/'docs'/'preview-construtor-v14.png'),full_page=False)
        page.locator('#btn-export').click()
        with page.expect_download() as download_info:
            page.locator('[data-export="json"]').click()
        data=json.loads(Path(download_info.value.path()).read_text())
        assert 3.2 in data['floorplan']['wallHeights'].values(),data['floorplan']
        page.locator('#room-back').click()
        expect(page.locator('#simulation-view')).to_be_visible()
        expect(page.locator('.sim-controls')).to_be_visible()
        page.screenshot(path=str(ROOT/'docs'/'preview-simulacao-v14.png'),full_page=False)
        page.locator('#sim-back').click()
        page.set_viewport_size({'width':390,'height':844})
        assert page.locator('.furn-preview').count()==8
        assert not page.locator('body').evaluate('(el)=>el.scrollWidth>window.innerWidth+10')
        page.screenshot(path=str(ROOT/'docs'/'preview-mobile-v14.png'),full_page=False)
        assert not errors,errors
        print('V1.4 navegador OK; WebGL disponível?', webgl)
        browser.close()
finally:
    pass
