#!/usr/bin/env python3
"""Self-contained browser checks of v0.3 Explore UX (no outbound network)."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from inline_app import inline_app
import json
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app'
OUT=ROOT/'artifacts'/'explore-v03';OUT.mkdir(parents=True,exist_ok=True)
html=inline_app(BASE if "BASE" in globals() else ROOT)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1600,'height':980},device_scale_factor=1,accept_downloads=True)
    page.evaluate("""() => {const memory={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]}})}""")
    errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html,wait_until='load')
    assert page.locator('.canvas-node').count()==8
    original=page.evaluate('JSON.stringify(doc)')
    page.locator('#go-explore').click()
    expect(page.locator('#explore-view')).to_be_visible()
    expect(page.locator('#editor-view')).to_be_hidden()
    assert page.locator('.ex-svg-node').count()==8
    assert page.locator('.ex-svg-group').count()==4
    assert page.locator('.ex-stat').count()==5
    assert page.locator('.ex-svg-edge').count()==4
    assert page.locator('#ex-mini svg').count()==1
    page.screenshot(path=str(OUT/'desktop.png'),full_page=True,animations='disabled')
    print('desktop chart:',page.locator('#ex-count').inner_text())
    page.locator('[data-ex-view="teams"]').click()
    assert page.locator('.ex-svg-node').count()==8
    assert all(c == 'handoff' for c in page.locator('.ex-svg-edge').evaluate_all("els=>els.map(el=>doc.edges.find(e=>e.id===el.dataset.exploreEdge).type)"))
    page.locator('[data-ex-view="dependencies"]').click()
    assert all(c == 'dependency' for c in page.locator('.ex-svg-edge').evaluate_all("els=>els.map(el=>doc.edges.find(e=>e.id===el.dataset.exploreEdge).type)"))
    page.locator('[data-ex-view="resources"]').click()
    assert all(c == 'resource' for c in page.locator('.ex-svg-edge').evaluate_all("els=>els.map(el=>doc.edges.find(e=>e.id===el.dataset.exploreEdge).type)"))
    page.locator('[data-ex-view="stages"]').click()
    page.locator('#ex-search').fill('alguma peça inexistente')
    assert page.locator('.ex-svg-node').count()==0
    page.locator('#ex-clear').click()
    assert page.locator('.ex-svg-node').count()==8
    page.locator('#ex-relation').select_option('all')
    page.locator('#ex-stage').select_option('1')
    assert page.locator('.ex-svg-node').count() > 0
    page.locator('#ex-stage').select_option('all')
    page.locator('.ex-svg-node').first.click()
    assert page.locator('#ex-edit-current').is_visible()
    focused=page.locator('.ex-svg-node.is-selected').count()
    assert focused == 1
    page.locator('#ex-related-only').check()
    assert page.locator('.ex-svg-node').count()<=8
    page.locator('#ex-related-only').uncheck()
    with page.expect_download() as d:
        page.locator('#ex-csv').click()
    assert d.value.suggested_filename.endswith('-exploracao.csv')
    d.value.save_as(str(OUT/'exploracao.csv'))
    assert page.evaluate('JSON.stringify(doc)') == original, 'Explore mutated the canonical document'
    page.screenshot(path=str(OUT/'focused.png'),full_page=True,animations='disabled')
    page.locator('#ex-edit-current').click()
    expect(page.locator('#editor-view')).to_be_visible()
    assert page.locator('[data-prop="title"]').count()==1
    page.locator('[data-prop="title"]').fill('Editado após explorar')
    page.locator('[data-prop="title"]').press('Tab')
    page.locator('#go-explore').click()
    assert 'Editado após explorar' in page.locator('#ex-diagram').inner_text()
    # Topbar actions are shared between modes: changes must refresh Explore.
    page.once('dialog',lambda dlg:dlg.accept())
    page.locator('#new-project').click()
    expect(page.locator('#explore-view')).to_be_visible()
    assert page.locator('.ex-svg-node').count()==0
    assert '0 de 0 peças' in page.locator('#ex-count').inner_text()
    assert not errors,errors
    print('desktop UX passed; error count',len(errors))
    mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    mobile.evaluate("""() => {const memory={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]}})}""")
    mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
    mobile.set_content(html,wait_until='load')
    mobile.locator('[data-view="explore"]').click()
    expect(mobile.locator('#explore-view')).to_be_visible()
    assert mobile.locator('.ex-svg-node').count()==8
    assert mobile.locator('#ex-tabs').is_visible()
    assert mobile.locator('#ex-scroll').is_visible()
    mobile.screenshot(path=str(OUT/'mobile.png'),full_page=True,animations='disabled')
    assert not mobile_errors,mobile_errors
    print('mobile UX passed; error count',len(mobile_errors))
    b.close()
