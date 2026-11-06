#!/usr/bin/env python3
"""UX audit regression against real HTTP modules, persisted data and WebGL."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()

def project(page):
    return page.evaluate("JSON.parse(localStorage.getItem('service-cad-lab/v1'))")

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1200}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/app/', wait_until='networkidle')
        expect(page.locator('#site-overview')).to_be_visible()
        page.locator('[data-room-display=three]').click()
        expect(page.locator('canvas.room3d-canvas')).to_be_visible()
        assert page.locator('link[rel=stylesheet]').count() == 1
        assert page.locator('.floor-inspector-empty').is_visible()
        expect(page.locator('.room3d-wall-control')).to_be_hidden()
        page.locator('[data-room3d-structure=wall]').click()
        expect(page.locator('.room3d-wall-control')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('.room3d-wall-control')).to_be_hidden()

        # Preserve the chosen library state across editor and main-area switches.
        page.locator('#hybrid-tab-furniture').click()
        expect(page.locator('#room-furniture-palette')).to_be_visible()
        expect(page.locator('#floor-structure-tools')).to_be_hidden()
        page.locator('[data-room-display=visual]').click()
        expect(page.locator('#floor-structure-tools')).to_be_visible()
        page.locator('[data-room-display=three]').click()
        expect(page.locator('#room-furniture-palette')).to_be_visible()
        expect(page.locator('#floor-structure-tools')).to_be_hidden()
        page.locator('#hybrid-simulate').click()
        page.locator('#hybrid-construct').click()
        expect(page.locator('#room-furniture-palette')).to_be_visible()
        page.locator('#hybrid-tab-rooms').click()
        page.locator('[data-room-display=visual]').click()
        page.locator('.floor-prop[data-floor-prop]').first.click()
        assert page.locator('.workspace-inspector-section[open]').count() == 0
        position = page.locator('[data-workspace-section=position]')
        position.locator('summary').click()
        expect(page.get_by_role('spinbutton', name='Coluna', exact=True)).to_be_visible()
        expect(page.locator('fieldset.studio18-position')).to_have_attribute('aria-label', 'Posição precisa do móvel')

        # Compact/expanded journey retains every graph component.
        count = len(project(page)['nodes'])
        assert page.locator('[data-hybrid-step]').count() == count
        compact = page.locator('.hybrid-journey').bounding_box()['height']
        page.locator('#hybrid-journey-expand').click()
        assert page.locator('.hybrid-journey').bounding_box()['height'] > compact
        page.locator('#hybrid-journey-expand').click()

        # Create from the 2D view; one submit must open the new 3D room.
        page.locator('#room-new-primary').click()
        name = 'Recepção principal com nome longo para conferir o cabeçalho e ações'
        page.locator('#room-create-dialog-name').fill(name)
        page.locator('#room-create-form button[type=submit]').click()
        expect(page.locator('[data-room-display=three]')).to_have_attribute('aria-selected', 'true')
        expect(page.locator('#room-studio-heading')).to_contain_text(name)
        expect(page.locator('canvas.room3d-canvas')).to_be_visible()
        expect(page.locator('#floor-auto')).to_be_hidden()
        page.locator('.studio-more-actions > summary').click()
        expect(page.locator('#floor-auto')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#floor-auto')).to_be_hidden()

        # Destructive confirmation stays accessible and Escape preserves data.
        page.locator('#hybrid-tab-environment').click()
        page.locator('#room-delete-btn').click()
        expect(page.locator('#sb-confirm-dialog')).to_be_visible()
        expect(page.locator('#sb-confirm-cancel')).to_be_focused()
        page.keyboard.press('Escape')
        expect(page.locator('#sb-confirm-dialog')).to_be_hidden()
        assert len(project(page)['environments']) == 5
        page.locator('[data-room-display=cards]').click()
        expect(page.locator('#room-grid')).to_be_visible()
        expect(page.locator('.room-tile').first).to_be_visible()

        # Real pointer capture on the SVG body, with preview and rollback.
        page.locator('[data-room-display=overview]').click()
        expect(page.locator('.room-overview-metrics')).to_be_visible()
        assert page.locator('#site-overview .site-room-handle button').count() == 0
        doc = project(page)
        first, second = [room['id'] for room in doc['environments'][:2]]
        card = page.locator(f'[data-site-room="{second}"]')
        card.scroll_into_view_if_needed()
        rect = card.locator('svg').bounding_box()
        x, y = rect['x'] + 100, rect['y'] + 80
        original = doc['floorplan'].get('roomPositions', {})
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x - 280, y, steps=8)
        expect(page.locator(f'[data-site-room="{second}"]')).to_have_attribute('data-valid', 'false')
        assert project(page)['floorplan'].get('roomPositions', {}) == original
        page.mouse.up()
        expect(page.locator('.site-drag-status')).to_contain_text('posição original preservada')
        assert project(page)['floorplan'].get('roomPositions', {}) == original
        expect(page.locator('#room-detail h2')).to_contain_text(doc['environments'][1]['name'])

        # A cancelled valid preview must never commit (even after losing capture).
        rect = card.locator('svg').bounding_box()
        x, y = rect['x'] + 100, rect['y'] + 80
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x, y + 400, steps=8)
        expect(card).to_have_attribute('data-valid', 'true')
        page.keyboard.press('Escape')
        page.mouse.up()
        assert project(page)['floorplan'].get('roomPositions', {}) == original

        # Commit a valid room move and inspect the actual selected room.
        rect = card.locator('svg').bounding_box()
        x, y = rect['x'] + 100, rect['y'] + 80
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x, y + 400, steps=8)
        page.mouse.up()
        assert project(page)['floorplan']['roomPositions'][second] == {'x': 14, 'y': 20}
        card.focus()
        page.keyboard.press('Enter')
        expect(page.locator('#room-detail h2')).to_contain_text(doc['environments'][1]['name'])
        expect(page.locator('#floor-editor-inspector')).to_be_hidden()
        expect(page.locator('#room-open-editor')).to_be_visible()

        # Click/keyboard origin and destination with advanced form collapsed.
        page.locator('[data-site-mode=connect]').click()
        assert not page.locator('.site21-advanced').evaluate('(e)=>e.open')
        page.locator(f'[data-site-room="{first}"]').focus()
        page.keyboard.press('Enter')
        expect(page.locator('[data-connection=from]')).to_have_count(1)
        page.locator(f'[data-site-room="{second}"]').focus()
        page.keyboard.press('Enter')
        expect(page.locator('[data-connection=to]')).to_have_count(1)
        expect(page.locator('#site-connect-confirm')).to_be_enabled()
        page.locator('#site-connect-confirm').click()
        assert len(project(page)['floorplan']['corridors']) > 0
        expect(page.locator('.site-drag-status')).to_contain_text('Corredor conectado')

        # Responsive controls stay reachable without horizontal page overflow.
        page.locator('#room-open-editor').click()
        page.locator('#hybrid-tab-environment').click()
        page.locator('[data-room-display=visual]').click()
        page.locator('.floor-prop[data-floor-prop]').first.click()
        expect(page.locator('#floor-editor-inspector')).to_be_visible()
        expect(page.locator('#room-detail')).to_be_hidden()
        page.locator('[data-room-display=three]').click()
        for width, height in [(1366, 768), (820, 1000), (390, 844)]:
            page.set_viewport_size({'width': width, 'height': height})
            expect(page.locator('#room-new-primary')).to_be_visible()
            expect(page.locator('canvas.room3d-canvas')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        browser.close()
        print('PASS UX audit HTTP: construction context, panels, inspector, journey, creation, drag/rollback, connections, responsive UI')
finally:
    server.shutdown()
    server.server_close()
