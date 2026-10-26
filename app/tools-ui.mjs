/** v0.6 — Barra de ferramentas, menu rápido, paleta de comandos, renomear no cartão e atalhos. */
import {CARD_TYPES} from './core.mjs';
import {CATALOG_DESCRIPTIONS} from './build.mjs';
import {TOOLS,SHORTCUTS,filterCommands} from './tools.mjs';
const q$=s=>document.querySelector(s);
const escT=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initTools(api){
  let tool='select';const wrap=q$('#canvas-wrapper');
  const strip=document.createElement('div');strip.className='tool-strip';strip.setAttribute('role','toolbar');strip.setAttribute('aria-label','Ferramentas do cenário');
  strip.innerHTML=TOOLS.map(t=>`<button data-tool="${t.id}" title="${t.title} (${t.key}) — ${t.hint}" aria-label="${t.title}" aria-pressed="false"><span>${t.icon}</span><kbd>${t.key}</kbd></button>`).join('')+'<i></i><button data-cmd title="Comandos (Ctrl+K)" aria-label="Abrir paleta de comandos"><span>⌘</span><kbd>K</kbd></button><button data-help title="Atalhos de teclado (?)" aria-label="Ver atalhos de teclado"><span>?</span></button>';
  strip.addEventListener('pointerdown',e=>e.stopPropagation());
  strip.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tool)setTool(b.dataset.tool);else if(b.hasAttribute('data-cmd'))openPalette();else if(b.hasAttribute('data-help'))openHelp()});
  wrap.appendChild(strip);
  function setTool(id){if(!TOOLS.some(t=>t.id===id))return;tool=id;wrap.dataset.tool=id;strip.querySelectorAll('[data-tool]').forEach(b=>{const on=b.dataset.tool===id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});api.onTool?.(id,TOOLS.find(t=>t.id===id))}
  /* Menu rápido (duplo clique no vazio ou soltar uma conexão no vazio) */
  const menu=document.createElement('div');menu.className='quick-menu';menu.hidden=true;menu.setAttribute('role','menu');document.body.appendChild(menu);
  const closeQuick=()=>{menu.hidden=true};
  function openQuick(x,y,world,opts={}){
    menu.innerHTML=`<div class="qm-head">${escT(opts.title||'Adicionar aqui')}</div>`+Object.entries(CARD_TYPES).map(([k,t])=>`<button role="menuitem" data-q="${k}"><span class="library-icon type-${k}">${t.icon}</span><span><b>${escT(t.title)}</b><small>${escT(CATALOG_DESCRIPTIONS[k])}</small></span></button>`).join('');
    menu.hidden=false;menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
    menu.onclick=e=>{const b=e.target.closest('[data-q]');if(!b)return;closeQuick();api.addAt(b.dataset.q,world.x,world.y,opts)};
    menu.onkeydown=e=>{if(e.key==='Escape'){closeQuick();wrap.focus()}};menu.querySelector('button')?.focus();
  }
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target))closeQuick()},true);
  /* Paleta de comandos */
  const pal=document.createElement('dialog');pal.className='palette';pal.setAttribute('aria-label','Paleta de comandos');
  pal.innerHTML='<input type="search" placeholder="O que você quer fazer? Ex.: atividade, simular, ajustar…" aria-label="Buscar comando" autocomplete="off"><ul role="listbox"></ul><footer>↑↓ navegar · Enter executar · Esc fechar</footer>';
  document.body.appendChild(pal);
  const palInput=pal.querySelector('input'),palList=pal.querySelector('ul');let items=[],idx=0;
  function paint(){palList.innerHTML=items.map((c,i)=>`<li role="option" data-i="${i}" aria-selected="${i===idx}" class="${i===idx?'on':''}"><span>${escT(c.label)}</span>${c.hint?`<small>${escT(c.hint)}</small>`:''}</li>`).join('')||'<li class="empty">Nenhum comando encontrado.</li>';palList.querySelector('.on')?.scrollIntoView({block:'nearest'})}
  function openPalette(){if(pal.open)return;palInput.value='';items=filterCommands(api.commands(),'');idx=0;paint();pal.showModal();palInput.focus()}
  function runItem(i){const c=items[i];if(!c)return;pal.close();setTimeout(()=>c.run(),0)}
  palInput.addEventListener('input',()=>{items=filterCommands(api.commands(),palInput.value);idx=0;paint()});
  palInput.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(items.length-1,idx+1);paint()}else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(0,idx-1);paint()}else if(e.key==='Enter'){e.preventDefault();runItem(idx)}});
  palList.addEventListener('click',e=>{const li=e.target.closest('[data-i]');if(li)runItem(+li.dataset.i)});
  pal.addEventListener('click',e=>{if(e.target===pal)pal.close()});
  /* Atalhos */
  const help=document.createElement('dialog');help.className='modal help-dialog';help.setAttribute('aria-label','Atalhos de teclado');
  help.innerHTML=`<div class="modal-head"><div><span class="panel-eyebrow">PRODUTIVIDADE</span><h2>Atalhos de teclado</h2></div><button class="close-button" aria-label="Fechar">×</button></div><table>${SHORTCUTS.map(([k,d])=>`<tr><th><kbd>${escT(k)}</kbd></th><td>${escT(d)}</td></tr>`).join('')}</table>`;
  help.querySelector('button').addEventListener('click',()=>help.close());help.addEventListener('click',e=>{if(e.target===help)help.close()});document.body.appendChild(help);
  function openHelp(){if(!help.open)help.showModal()}
  /* Renomear no próprio cartão */
  function rename(id){
    const g=q$(`[data-node-id="${CSS.escape(id)}"]`),n=api.getDoc().nodes.find(x=>x.id===id);if(!g||!n)return;
    const r=g.getBoundingClientRect(),k=r.width/250,inp=document.createElement('input');
    inp.className='inline-rename';inp.value=n.title;inp.maxLength=100;inp.setAttribute('aria-label','Novo nome da peça');
    inp.style.cssText=`left:${r.left+8*k}px;top:${r.top+34*k}px;width:${r.width-16*k}px;font-size:${Math.max(11,15*k)}px`;
    document.body.appendChild(inp);inp.focus();inp.select();let done=false;
    const finish=ok=>{if(done)return;done=true;const v=inp.value.trim();inp.remove();if(ok&&v&&v!==n.title)api.rename(id,v)};
    inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')finish(true);else if(e.key==='Escape')finish(false)});inp.addEventListener('blur',()=>finish(true));
  }
  /* Duplo clique: peça → renomear; vazio → menu rápido (hit-test por geometria, pois o SVG é redesenhado a cada clique) */
  wrap.addEventListener('dblclick',e=>{
    if(tool!=='select'||e.target.closest('.tool-strip,.canvas-tools,.placing-chip,.viewport-help'))return;
    const w=api.worldAt(e),n=api.nodeAt(w);if(n){rename(n.id);return}
    if(api.isDropZone(w))openQuick(e.clientX,e.clientY,w);
  });
  /* Teclado */
  window.addEventListener('keydown',e=>{
    const typing=e.target.matches?.('input,textarea,select,[contenteditable]'),modal=document.querySelector('dialog[open]');
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!modal)openPalette();return}
    if(typing||modal||e.altKey||q$('#editor-view').hidden)return;
    const key=e.key.toLowerCase(),t=TOOLS.find(x=>x.key.toLowerCase()===key);
    if(!e.ctrlKey&&!e.metaKey&&t){e.preventDefault();setTool(t.id);return}
    if(!e.ctrlKey&&!e.metaKey&&key==='f'){e.preventDefault();api.fit();return}
    if(e.key==='?'){e.preventDefault();openHelp();return}
    if((e.ctrlKey||e.metaKey)&&key==='d'){e.preventDefault();api.duplicate();return}
    const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(arrows&&api.nudge(arrows[0],arrows[1]))e.preventDefault();
    if(e.key==='Escape'){closeQuick();if(tool!=='select')setTool('select')}
  });
  setTool('select');
  return {setTool,get tool(){return tool},quick:openQuick,palette:openPalette,help:openHelp,rename};
}
