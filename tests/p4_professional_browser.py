#!/usr/bin/env python3
"""P4 browser regression: compare physical baselines and download printable HTML report."""
from pathlib import Path
from inline_app import inline_app
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1366,'height':768},accept_downloads=True,reduced_motion='reduce')
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 # Use a realistic secure origin: localStorage is unavailable to about:blank
 # and would give a false failure for a browser-local layout reference.
 html=inline_app(ROOT)
 page.route('https://blue-ocean.test/**',lambda route:route.fulfill(
  status=200,content_type='text/html; charset=utf-8',body=html))
 page.goto('https://blue-ocean.test/app/',wait_until='domcontentloaded')
 expect(page.locator('#hybrid-layout-compare')).to_be_visible(timeout=15000)
 page.locator('#hybrid-layout-compare').click()
 dialog=page.locator('#p4-layout-dialog')
 expect(dialog).to_be_visible()
 expect(dialog.locator('#p4-layout-before')).to_contain_text('Nenhuma referência')
 expect(dialog.locator('#p4-layout-after svg')).to_be_visible()
 dialog.locator('#p4-layout-capture').click()
 expect(dialog.locator('#p4-layout-before svg')).to_be_visible()
 # Change a physical property in the current canonical project; baseline must remain untouched.
 page.evaluate("""() => {
   const obj=doc.floorplan.objects[0];
   if(!obj)throw new Error('Demo should have a piece of furniture');
   obj.rotation=obj.rotation===90?0:90;
 }""")
 dialog.locator('#p4-layout-room').select_option(page.evaluate('doc.environments[0].id'))
 expect(dialog.locator('#p4-layout-diff')).to_contain_text('Alterações físicas identificadas')
 page.set_viewport_size({'width':900,'height':700})
 expect(dialog.locator('#p4-layout-after svg')).to_be_visible()
 page.keyboard.press('Escape')
 expect(dialog).to_be_hidden()
 page.set_viewport_size({'width':1920,'height':1080})
 page.locator('#hybrid-simulate').click()
 if page.locator('#sim-allow-parallel').count():
  page.locator('#sim-allow-parallel').check()
  page.locator('#sim-run').click()
 button=page.locator('#p4-export-report')
 expect(button).to_be_enabled(timeout=15000)
 with page.expect_download() as download_info:
  button.click()
 dl=download_info.value
 assert dl.suggested_filename=='blue-ocean-relatorio-servico.html',dl.suggested_filename
 report=Path(dl.path()).read_text()
 assert 'Relatório profissional de cenário' in report
 assert 'Comparação física' in report
 assert 'Imprimir / salvar PDF' in report
 assert 'estimativas' in report.lower()
 assert not errors,errors
 print('PASS P4 Chromium: local baseline, visual comparison, responsive dialog and report export')
 browser.close()
