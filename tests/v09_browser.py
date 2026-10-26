#!/usr/bin/env python3
"""v0.9: scenario controls, live room map, capacity what-if and responsive view."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.set_content(inline_app(ROOT),wait_until='load')
    assert page.locator('[data-view]').count()==2
    page.locator('[data-view=simulation]').click()
    expect(page.locator('#sim-floor')).to_be_visible()
    assert page.locator('.sim-floor-room').count()==4
    assert 'em atendimento' in page.locator('#sim-floor-total').inner_text()
    assert page.locator('.sim-floor-avatars button').count()>0
    first=page.locator('#sim-floor-total').inner_text()
    page.locator('#sim-progress').fill('25')
    second=page.locator('#sim-floor-total').inner_text()
    assert first!=second or page.locator('#sim-floor .sim-floor-room.is-queued').count()>0
    page.locator('.sim-floor-avatars button').first.click()
    expect(page.locator('#sim-selected')).to_contain_text('Atendimento #')
    page.locator('[data-sim-preset=peak]').click()
    assert int(page.locator('#sim-cases').input_value())>=10
    assert int(page.locator('#sim-interval').input_value())==4
    assert page.locator('#sim-error').is_hidden()
    assert page.locator('#sim-apply-reinforcement').count()==1, 'Expected demonstrable capacity improvement in peak'
    team=page.locator('#sim-apply-reinforcement').get_attribute('data-team')
    cap=int(page.locator('#sim-apply-reinforcement').get_attribute('data-cap'))
    page.locator('#sim-reference').click()
    page.locator('#sim-apply-reinforcement').click()
    val=page.locator('[data-sim-team-cap]').evaluate_all('(els,name) => els.filter(x=>x.dataset.simTeamCap===name).map(x=>x.value)',team)
    assert val==[str(cap)], val
    expect(page.locator('#sim-comparison')).to_contain_text('Referência')
    assert page.locator('#sim-error').is_hidden()
    page.locator('[data-sim-preset=normal]').click()
    assert page.locator('#sim-cases').input_value()=='6'
    assert page.locator('#sim-interval').input_value()=='8'
    assert page.locator('#sim-capacity').input_value()=='1'
    (ROOT/'docs').mkdir(exist_ok=True)
    page.locator('#sim-floor-card') if False else None
    page.locator('.sim-floor-card').screenshot(path=str(ROOT/'docs'/'preview-mapa-vivo-v09.png'))
    page.locator('.sim-opportunities').screenshot(path=str(ROOT/'docs'/'preview-reforco-equipe-v09.png'))
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('.sim-floor-room').count()==4
    assert not page.locator('body').evaluate('(el)=>el.scrollWidth > window.innerWidth+10'), 'Unexpected horizontal overflow'
    page.locator('#sim-floor .sim-floor-avatars button').first.click()
    assert page.locator('#sim-selected').inner_text().strip()
    assert not errors,errors
    browser.close()
print('v0.9 browser: map, playback, presets, reinforcements, reference and mobile passed')
