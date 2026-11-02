/* P8 project library: local-first, explicit project switching, no data migration overwrite. */
const INDEX_KEY='blue-ocean3d/projects/p8';
const htmlEsc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const copy=v=>JSON.parse(JSON.stringify(v));
const newId=()=>globalThis.crypto?.randomUUID?.()||'p8-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export function makeProjectStore(storage,currentDocument){
 let state;
 try{state=JSON.parse(storage.getItem(INDEX_KEY)||'null')}catch{state=null}
 if(!state||!Array.isArray(state.projects)||!state.projects.length||typeof state.active!=='string'){
  const id=newId();
  state={version:1,active:id,projects:[{id,document:copy(currentDocument)}]};
 }
 if(!state.projects.some(p=>p.id===state.active))state.active=state.projects[0].id;
 const persist=()=>{try{storage.setItem(INDEX_KEY,JSON.stringify(state));return true}catch{return false}};
 function active(){return state.projects.find(p=>p.id===state.active)}
 function save(document){const item=active();if(!item)throw Error('Nenhum projeto ativo');item.document=copy(document);persist()}
 function create(document){const id=newId();state.projects.unshift({id,document:copy(document)});state.active=id;persist();return id}
 function open(id){const p=state.projects.find(p=>p.id===id);if(!p)throw Error('Projeto não encontrado');state.active=id;persist();return copy(p.document)}
 function list(){return state.projects.map(({id,document})=>({id,name:document.name||'Serviço sem nome',rooms:document.environments?.length||0,tasks:document.nodes?.filter(n=>n.type==='activity').length||0,updatedAt:document.updatedAt||null,roomNames:(document.environments||[]).slice(0,4).map(r=>r.name)}))}
 persist();
 return {save,create,open,list,activeId:()=>state.active};
}
function card(project,isActive){
 const boxes=Array.from({length:4},(_,i)=>'<span class="p8-cover-room">'+htmlEsc(project.roomNames[i]||'')+'</span>').join('');
 return '<article class="p8-project-card" data-p8-project="'+htmlEsc(project.id)+'"><div class="p8-project-thumbnail"><div class="p8-cover-grid">'+boxes+'</div></div><div class="p8-project-meta"><div><strong>'+htmlEsc(project.name)+'</strong><small>'+project.rooms+' ambientes · '+project.tasks+' atividades</small></div>'+(isActive?'<span class="p8-active-badge">Atual</span>':'')+'</div><button type="button" data-p8-open="'+htmlEsc(project.id)+'">Continuar projeto <span aria-hidden="true">↗</span></button></article>';
}
export function mountP8Projects({workspace,store,onOpen,onCreate}){
 const view=document.createElement('main');
 view.id='p8-projects-home';view.className='p8-projects-home';
 view.hidden=true;view.setAttribute('aria-label','Meus projetos do Blue Ocean 3D');
 view.innerHTML='<div class="p8-home-inner"><header class="p8-home-header"><div><span class="p8-eyebrow">SEU ESTÚDIO DE SERVIÇOS</span><h1>Seus projetos, em um só lugar.</h1><p>Continue um ambiente existente ou comece a desenhar um novo serviço.</p></div><button type="button" id="p8-project-create" class="p8-home-primary">+ Novo projeto</button></header><div id="p8-project-grid" class="p8-project-grid"></div><p class="p8-storage-disclaimer">✧ Projetos salvos automaticamente neste navegador. Exporte um backup para manter uma cópia independente.</p></div><dialog id="p8-project-dialog" class="p8-project-dialog" aria-labelledby="p8-project-dialog-title"><form id="p8-project-form"><div class="p8-project-dialog-head"><h2 id="p8-project-dialog-title">Novo projeto</h2><button type="button" data-p8-close aria-label="Fechar">×</button></div><label>Nome do serviço<input type="text" name="name" maxlength="100" placeholder="Ex.: Clínica de Atendimento" required></label><p>Comece com uma planta vazia. Você pode criar ambientes e atividades depois.</p><div class="p8-project-dialog-actions"><button type="button" data-p8-close>Cancelar</button><button type="submit">Criar projeto</button></div></form></dialog>';
 workspace.querySelector('.topbar').after(view);
 const dialog=view.querySelector('#p8-project-dialog');
 view.addEventListener('click',e=>{
  const id=e.target.closest('[data-p8-open]')?.dataset.p8Open;
  if(id){onOpen(id);return;}
  if(e.target.closest('#p8-project-create')){dialog.showModal();dialog.querySelector('input').focus();return;}
  if(e.target.closest('[data-p8-close]'))dialog.close();
 });
 view.querySelector('#p8-project-form').addEventListener('submit',e=>{
  e.preventDefault();const name=new FormData(e.currentTarget).get('name')?.toString().trim();
  if(!name)return;
  onCreate(name);dialog.close();e.currentTarget.reset();
 });
 function render(){
  const active=store.activeId();
  const projects=store.list();
  view.querySelector('#p8-project-grid').innerHTML=projects.map(p=>card(p,p.id===active)).join('')+'<button type="button" class="p8-new-project-card" id="p8-project-create-inline"><span class="p8-new-plus">+</span><strong>Criar um novo serviço</strong><small>Comece com uma planta vazia e defina as atividades do atendimento.</small></button>';
  view.querySelector('#p8-project-create-inline').addEventListener('click',()=>view.querySelector('#p8-project-create').click());
 }
 return {render,show(){render();view.hidden=false;document.body.classList.add('p8-home-visible');},hide(){view.hidden=true;document.body.classList.remove('p8-home-visible');},element:view};
}
