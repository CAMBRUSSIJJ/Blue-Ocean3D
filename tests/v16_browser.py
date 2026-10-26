#!/usr/bin/env python3
"""Integração real por HTTP para a v1.6; usa o navegador disponível e preserva fallback."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright,expect
from inline_app import inline_app
ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('SERVICE_BUILDER_TEST_URL','http://127.0.0.1:4196/app/')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':960})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(inline_app(ROOT),wait_until='domcontentloaded')
    expect(page.locator('.rail-version')).to_contain_text('1.6')
    assert page.locator('[data-view]').count()==2
    page.locator('[data-view="simulation"]').click()
    expect(page.locator('#simulation-view')).to_be_visible()
    if page.locator('#sim-allow-parallel').count():page.locator('#sim-allow-parallel').check()
    page.locator('#sim-run').click()
    expect(page.locator('#sim-stats .sim-stat')).to_have_count(4)
    page.wait_for_timeout(1100)
    is3d=page.locator('.sim3d-canvas').count()>0 and page.locator('#sim16-scene').is_visible()
    print('WebGL loaded:',is3d,'mode:',page.locator('#sim16-mode-3d').get_attribute('aria-pressed'))
    if is3d:
        assert page.locator('#sim16-rooms button').count()>=1
        first_room=page.locator('[data-sim16-room]').first
        first_room.click()
        page.locator('[data-sim16-camera=top]').click()
        page.locator('[data-sim16-camera=iso]').click()
        page.locator('[data-sim16-camera=plus]').click()
        page.locator('[data-sim16-camera=walls]').click()
        page.locator('[data-sim16-camera=walls]').click()
        page.locator('#sim-progress').fill('5')
        page.locator('#sim-play').click()
        page.wait_for_timeout(500)
        page.locator('#sim-play').click()
        assert page.locator('#sim16-actors button').count()>=1
        page.locator('#sim16-actors button').first.click()
        expect(page.locator('#sim-selected')).to_contain_text('Equipe:')
        page.locator('details.sim16-analytics').evaluate('(el)=>el.open=false')
        page.locator('.sim-floor-card').screenshot(path=str(ROOT/'docs'/'preview-simulacao-3d-v16.png'))
    else:
        expect(page.locator('#sim-floor')).to_be_visible()
        assert page.locator('#sim16-alert').is_visible()
        page.locator('.sim-floor-card').screenshot(path=str(ROOT/'docs'/'preview-fallback-2d-v16.png'))
    page.locator('#sim16-mode-2d').click()
    expect(page.locator('#sim-floor')).to_be_visible()
    assert page.locator('#sim-floor .floor-editor-room').count()>=1
    page.locator('#sim-progress').fill('10')
    page.locator('details.sim16-analytics').evaluate('(el)=>el.open=true')
    expect(page.locator('#sim-timeline')).to_be_visible()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(250)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+5'),('horizontal overflow',page.evaluate('document.documentElement.scrollWidth'))
    page.screenshot(path=str(ROOT/'docs'/'preview-simulacao-mobile-v16.png'),full_page=False)
    assert not errors,errors
    print('Browser v1.6 OK; WebGL:',is3d)
    browser.close()
