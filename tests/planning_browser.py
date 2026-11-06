#!/usr/bin/env python3
"""Service planning starts on the site; long flow boards fill and scroll the workspace."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/app/'
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
            args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':1920,'height':1080},reduced_motion='reduce')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='networkidle')
        expect(page.locator('[data-room-display=overview]')).to_have_attribute('aria-selected','true')
        expect(page.locator('#site-overview')).to_be_visible()
        assert page.locator('canvas.room3d-canvas').count()==0,'3D should load only after an explicit editor action'

        # Creating rooms during planning must keep the user on the site.
        page.locator('[data-site-create]').click()
        page.locator('#room-create-dialog-name').fill('Sala planejada')
        page.locator('#room-create-form button[type=submit]').click()
        expect(page.locator('#site-overview')).to_be_visible()
        expect(page.locator('#room-detail h2')).to_have_text('Sala planejada')
        assert page.locator('canvas.room3d-canvas').count()==0

        # Build a real imported service with more activities than the old 12-item cap.
        ids=page.evaluate('''async()=>{
          const {createDocument,addEdge}=await import('/app/core.mjs');
          const {createRoom,assignRoom}=await import('/app/environments.mjs');
          const {insertComponent}=await import('/app/build.mjs');
          const doc=createDocument('Planejamento com atividades longas');
          const room=createRoom(doc,{name:'Recepção e conferência de documentos'});
          for(const name of ['Triagem','Atendimento','Pagamento'])createRoom(doc,{name});
          let previous=null;
          for(let i=1;i<=24;i++){
            const {node}=insertComponent(doc,{type:'activity',stage:0,fields:{
              title:`Atividade ${i}: conferir documentos e orientar o cliente sobre o serviço`,
              team:'Atendimento',duration:5
            }});
            assignRoom(doc,node.id,room.id);
            if(previous)addEdge(doc,{from:previous,to:node.id,type:'sequence'});
            previous=node.id;
          }
          localStorage.setItem('service-cad-lab/v1',JSON.stringify(doc));
          return {room:room.id,last:previous};
        }''')
        page.reload(wait_until='networkidle')
        expect(page.locator('#site-overview')).to_be_visible()
        page.locator('[data-site-flow]').click()
        board=page.locator('.room-workflow-drawer')
        expect(board).to_be_visible()
        assert page.locator('.room-part[data-room-node]').count()==24
        assert page.locator('.room-part b').last.inner_text()=='Atividade 24: conferir documentos e orientar o cliente sobre o serviço'

        # At desktop and mobile sizes, the board fills the available central area.
        # Its last activity must be scrollable and actually clickable.
        for width,height in [(1920,1080),(1366,768),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            main=page.locator('.rooms-main').bounding_box()
            panel=board.bounding_box()
            assert panel['height']>=main['height']-100,(width,main,panel)
            assert board.evaluate('(e)=>e.scrollHeight>e.clientHeight'),width
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            last=page.locator(f'.room-part[data-room-node="{ids["last"]}"]')
            last.scroll_into_view_if_needed()
            last.click()
            expect(page.locator('#room-task-dialog')).to_be_visible()
            expect(page.locator('#room-task-heading')).to_have_text(last.locator('b').inner_text())
            page.locator('#room-task-close').click()

        page.set_viewport_size({'width':1366,'height':768})
        board.evaluate('(e)=>e.scrollTop=0')
        search=page.locator('#room-search')
        search.fill('Atividade 24:')
        expect(page.locator('.room-part[data-room-node]')).to_have_count(1)
        search.fill('Recepção e conferência')
        expect(page.locator('.room-part[data-room-node]')).to_have_count(24)
        search.fill('')
        room=page.locator(f'.room-tile[data-room-id="{ids["room"]}"]')
        room.locator('[data-room-select]').click()
        expect(page.locator('#room-detail')).to_be_visible()
        page.locator('#room-open-editor').click()
        expect(page.locator('[data-room-display=three]')).to_have_attribute('aria-selected','true')
        expect(page.locator('canvas.room3d-canvas')).to_be_visible()
        expect(page.locator('#room-studio-heading')).to_contain_text('Recepção e conferência de documentos')
        page.locator('#btn-export').click()
        page.locator('#new-project').click()
        expect(page.locator('#sb-confirm-dialog')).to_be_visible()
        page.locator('#sb-confirm-accept').click()
        expect(page.locator('#site-overview')).to_be_visible()
        expect(page.locator('[data-room-display=overview]')).to_have_attribute('aria-selected','true')
        expect(page.locator('[data-site-room]')).to_have_count(0)
        assert not errors,errors
        browser.close()
        print('PASS Planning: site-first, room creation without premature 3D, full-height flow, 24 activities, search, mobile scrolling and explicit 3D')
finally:
    server.shutdown()
    server.server_close()
