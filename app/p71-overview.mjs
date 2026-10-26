/** P7.1 - Enhance the existing physical overview without changing the service graph. */
export function installP71Overview({root,getDocument,moveRoom,report,roomSpot,onRoomSelect,onMessage}){
 let zoom=1,initialized=false,selectedRoom='',selectedRoute='';
 const min=.55,max=2;
 const state={get zoom(){return zoom},get selectedRoom(){return selectedRoom}};
 const clamp=x=>Math.max(min,Math.min(max,Math.round(x*20)/20));
 function viewport(){return root.querySelector('.site-scroll')}
 function content(){return root.querySelector('.site-canvas')}
 function focusBounds(){
  const doc=getDocument(),places=(doc.environments||[]).map(r=>roomSpot(doc,r.id));
  const pts=[...places.map(p=>({x:p.x,y:p.y})),...(doc.floorplan?.corridors||[]).map(p=>({x:p.x,y:p.y}))];
  if(!pts.length)return {minX:0,minY:0,maxX:35,maxY:22};
  return {minX:Math.min(...pts.map(p=>p.x)),minY:Math.min(...pts.map(p=>p.y)),
   maxX:Math.max(...places.map(p=>p.x+12),...pts.map(p=>p.x+1)),
   maxY:Math.max(...places.map(p=>p.y+8),...pts.map(p=>p.y+1))};
 }
 function applyZoom(center=true){
  const canvas=content(),holder=root.querySelector('.p71-zoom-layer'),scroll=viewport();
  if(!canvas||!holder||!scroll)return;
  holder.style.width=(canvas.offsetWidth*zoom)+'px';
  holder.style.height=(canvas.offsetHeight*zoom)+'px';
  canvas.style.transformOrigin='top left';
  canvas.style.transform='scale('+zoom+')';
  root.querySelector('#p71-zoom-value').textContent=Math.round(zoom*100)+'%';
  if(center){
   const b=focusBounds(),mx=(b.minX+b.maxX)*10*zoom,my=((b.minY+b.maxY)*10+42)*zoom;
   scroll.scrollLeft=Math.max(0,mx-scroll.clientWidth/2);
   scroll.scrollTop=Math.max(0,my-scroll.clientHeight/2);
  }
 }
 function fit(){
  const scroll=viewport(),b=focusBounds();
  if(!scroll||scroll.clientWidth<30||scroll.clientHeight<30)return;
  const contentWidth=Math.max(250,(b.maxX-b.minX)*20+80);
  const contentHeight=Math.max(180,(b.maxY-b.minY)*20+115);
  zoom=clamp(Math.min(max,(scroll.clientWidth-36)/contentWidth,(scroll.clientHeight-28)/contentHeight));
  initialized=true;applyZoom();
 }
 function selectRoom(id){
  selectedRoom=id;
  for(const card of root.querySelectorAll('.site-room')){
   const on=card.dataset.siteRoom===id;
   card.classList.toggle('p71-selected-room',on);
   card.setAttribute('aria-label',(on?'Selecionado: ':'Selecionar ')+card.querySelector('.site-room-handle b')?.textContent);
  }
  onRoomSelect?.(id);
 }
 function selectRoute(id){
  selectedRoute=selectedRoute===id?'':id;
  for(const button of root.querySelectorAll('[data-site-inspect-route]')){
   const active=button.dataset.siteInspectRoute===selectedRoute;
   button.setAttribute('aria-pressed',String(active));
  }
  for(const path of root.querySelectorAll('[data-site-route]')){
   path.classList.toggle('p71-route-highlight',path.dataset.siteRoute===selectedRoute);
   path.classList.toggle('p71-route-dimmed',Boolean(selectedRoute)&&path.dataset.siteRoute!==selectedRoute);
  }
 }
 function enhance(){
  if(!root.querySelector('.site-head'))return;
  root.querySelector('.site-head .panel-eyebrow').textContent='PLANEJAMENTO FÍSICO';
  const reset=root.querySelector('[data-site-reset]');
  if(reset)reset.textContent='↺ Restaurar posições';
  const all=root.querySelector('[data-site-connect-all]');
  if(all)all.textContent='Gerar corredores do fluxo';
  const connect=root.querySelector('[data-site-connect]');
  if(connect)connect.textContent='Criar ligação física';
  const tools=root.querySelector('.site21-tools');
  if(tools){
   tools.insertAdjacentHTML('afterbegin','<strong class="p71-toolbar-heading">Ferramentas da planta</strong>');
   tools.insertAdjacentHTML('beforeend','<div class="p71-zoom-controls" aria-label="Zoom e enquadramento"><button type="button" data-p71-zoom="out" aria-label="Diminuir zoom">−</button><output id="p71-zoom-value">100%</output><button type="button" data-p71-zoom="in" aria-label="Aumentar zoom">＋</button><button type="button" data-p71-zoom="fit">Ajustar à tela</button></div>');
   tools.insertAdjacentHTML('afterend','<div class="p71-legend"><span><i class="p71-key corridor"></i> Corredor físico</span><span><i class="p71-key route"></i> Percurso transitável</span><span><i class="p71-key blocked"></i> Ligação bloqueada</span></div>');
  }
  const sc=viewport(),canvas=content();
  if(sc&&canvas){const layer=document.createElement('div');layer.className='p71-zoom-layer';canvas.before(layer);layer.append(canvas)}
  const summary=root.querySelector('.site-notes');
  if(summary){
   const result=report(getDocument());
   summary.querySelector('b')?.replaceWith(Object.assign(document.createElement('h3'),{textContent:'Conectividade do serviço'}));
   const heading=document.createElement('p');heading.className='p71-route-summary';
   heading.textContent=result.linked+' de '+result.links.length+' percursos transitáveis';
   summary.querySelector('h3')?.after(heading);
   const paragraphs=summary.querySelectorAll('p.site-ok, p.site-warning');
   for(const [idx,p] of [...paragraphs].entries()){
    const route=result.links[idx];if(!route)continue;
    const btn=document.createElement('button');btn.type='button';btn.className='p71-route-choice';
    btn.dataset.siteInspectRoute=route.from+'|'+route.to;
    btn.setAttribute('aria-pressed',String(selectedRoute===btn.dataset.siteInspectRoute));
    while(p.firstChild&&p.firstChild.nodeType===3)btn.append(p.firstChild);
    p.prepend(btn);
   }
  }
  const reportLinks=report(getDocument()).links;
  const svg=root.querySelector('.site-link');
  if(svg){const shapes=svg.querySelectorAll('polyline,line');shapes.forEach((line,i)=>{const link=reportLinks[i];if(link)line.dataset.siteRoute=link.from+'|'+link.to;})}
  for(const card of root.querySelectorAll('.site-room')){
   card.tabIndex=0;card.setAttribute('role','group');
   card.setAttribute('aria-label','Selecionar '+card.querySelector('.site-room-handle b')?.textContent);
   card.classList.toggle('p71-selected-room',card.dataset.siteRoom===selectedRoom);
   card.setAttribute('aria-label',(card.dataset.siteRoom===selectedRoom?'Selecionado: ':'Selecionar ')+card.querySelector('.site-room-handle b')?.textContent);
  }
  // Invalidate a focus that is no longer in the graph without affecting stored data.
  if(!reportLinks.some(r=>r.from+'|'+r.to===selectedRoute))selectedRoute='';
  for(const line of root.querySelectorAll('[data-site-route]')){
   line.classList.toggle('p71-route-highlight',line.dataset.siteRoute===selectedRoute);
   line.classList.toggle('p71-route-dimmed',Boolean(selectedRoute)&&line.dataset.siteRoute!==selectedRoute);
  }
  requestAnimationFrame(()=>{if(!initialized)fit();else applyZoom(false)});
 }
 root.addEventListener('click',event=>{
  const zoomControl=event.target.closest('[data-p71-zoom]');
  if(zoomControl){
   const type=zoomControl.dataset.p71Zoom;
   if(type==='fit')fit();else{zoom=clamp(zoom+(type==='in'?.15:-.15));initialized=true;applyZoom()}
   return;
  }
  const route=event.target.closest('[data-site-inspect-route]');
  if(route){selectRoute(route.dataset.siteInspectRoute);return}
  const room=event.target.closest('.site-room');
  if(room&&!event.target.closest('button'))selectRoom(room.dataset.siteRoom);
 });
 root.addEventListener('keydown',event=>{
  const card=event.target.closest('.site-room');
  if(!card||event.target!==card)return;
  if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRoom(card.dataset.siteRoom);return}
  const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const delta=steps[event.key];if(!delta)return;
  event.preventDefault();const p=roomSpot(getDocument(),card.dataset.siteRoom),n=event.shiftKey?5:1;
  const x=Math.max(0,Math.min(190,p.x+delta[0]*n)),y=Math.max(0,Math.min(190,p.y+delta[1]*n));
  try{moveRoom(card.dataset.siteRoom,x,y);selectRoom(card.dataset.siteRoom)}
  catch(err){onMessage?.('⚠ '+err.message)}
 });
 root.addEventListener('wheel',event=>{
  if(!event.ctrlKey||!event.target.closest('.site-scroll'))return;
  event.preventDefault();zoom=clamp(zoom+(event.deltaY<0?.1:-.1));initialized=true;applyZoom();
 },{passive:false});
 return {enhance,state,fit,selectRoom};
}
