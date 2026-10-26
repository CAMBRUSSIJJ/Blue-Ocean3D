#!/usr/bin/env python3
"""Regressões da v1.1: a planta prevalece, versão visível, preflight explícito e diagnóstico."""
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
    expect(page.locator('.rail-version')).to_contain_text('1.2')
    expect(page.locator('.build-stamp')).to_contain_text('v1.2')
    expect(page.locator('#floor-editor')).to_be_visible()
    expect(page.locator('#room-detail')).to_be_hidden()
    page.locator('#room-toggle-details').click()
    expect(page.locator('#room-detail')).to_be_visible()
    page.locator('#room-toggle-details').click()
    expect(page.locator('#room-detail')).to_be_hidden()
    assert page.locator('[data-view]').count()==2
    assert page.locator('#floor-editor .floor-editor-room').count()>=4
    page.screenshot(path=str(ROOT/'docs'/'preview-ambientes-v11.png'), full_page=False)
    page.locator('#room-back').click()
    expect(page.locator('#sim-floor')).to_be_visible()
    expect(page.locator('#sim-diagnosis')).to_be_visible()
    expect(page.locator('#sim-preflight')).to_contain_text('Fluxo de atividades conectado')
    expect(page.locator('#sim-now')).to_contain_text('Atividades em execução')
    page.screenshot(path=str(ROOT/'docs'/'preview-simulacao-v11.png'),full_page=False)
    # Serviço vazio, dois kits adicionados separadamente => sem relação entre os kits
    page.on('dialog',lambda d:d.accept())
    page.locator('#new-project').click()
    expect(page.locator('#floor-editor-map')).to_contain_text('Seu espaço começa aqui')
    page.locator('[data-add-room-kit="reception"]').click()
    page.locator('[data-add-room-kit="consultation"]').click()
    # Mesmo existindo conexões internas nos kits, as atividades estarão em dois grupos;
    # testamos a confirmação de tarefas realmente isoladas adicionando atividade sem conexão.
    page.locator('[data-room-display="cards"]').click()
    page.locator('[data-room-add]').first.click()
    page.locator('#room-new-part-type').select_option('activity')
    page.locator('#room-new-part-title').fill('Triagem paralela sem vínculo')
    page.locator('#room-new-part-btn').click()
    page.locator('#room-back').click()
    expect(page.locator('#sim-preflight')).to_contain_text('grupos de atividades sem ligação')
    assert page.locator('#sim-run').is_disabled()
    page.locator('#sim-allow-parallel').check()
    assert page.locator('#sim-run').is_enabled()
    page.locator('#sim-run').click()
    expect(page.locator('#sim-floor')).to_be_visible()
    assert page.locator('#sim-error').is_hidden()
    assert not errors, errors
    browser.close()
print('v1.1 browser: versão, planta, painel, diagnóstico, revisão de paralelismo — OK')
