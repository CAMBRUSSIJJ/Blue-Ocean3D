/**
 * Blue Ocean 3D — controles de workspace (P0/P1).
 * Não altera o modelo de serviço, a cena Three.js ou a simulação.
 */
const KEY='blue-ocean3d/workspace/v1';
const LIMITS={left:{min:176,max:360,default:205},right:{min:246,max:480,default:298}};
const CENTER_MIN=360;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=value=>{try{localStorage.setItem(KEY,JSON.stringify(value))}catch{/* private mode */}};
const isWidth=(value,side)=>Number.isFinite(value)&&value>=LIMITS[side].min&&value<=LIMITS[side].max;

export function initWorkspaceControls({shell,main,left,right}){
 const stored=read();
 const state={
  left:isWidth(stored.left,'left')?stored.left:LIMITS.left.default,
  right:isWidth(stored.right,'right')?stored.right:LIMITS.right.default,
  leftCollapsed:stored.leftCollapsed===true,
  rightCollapsed:stored.rightCollapsed===true
 };
 const refs={};
 function persist(){write(state)}
 function widthLimits(side){
  const other=side==='left'?'right':'left';
  const otherWidth=state[other+'Collapsed']?0:state[other];
  const available=Math.max(LIMITS[side].min,shell.clientWidth-otherWidth-CENTER_MIN-14);
  return {...LIMITS[side],max:Math.max(LIMITS[side].min,Math.min(LIMITS[side].max,available))};
 }
 function update({save=false}={}){
  for(const side of ['left','right']){
   shell.style.setProperty('--workspace-'+side+'-size',state[side]+'px');
   shell.classList.toggle('workspace-'+side+'-collapsed',state[side+'Collapsed']);
   const collapsed=state[side+'Collapsed'];
   refs[side].toggle.textContent=side==='left'?'◀':'▶';
   refs[side].toggle.setAttribute('aria-label',(collapsed?'Abrir ':'Recolher ')+(side==='left'?'biblioteca':'propriedades'));
   refs[side].toggle.setAttribute('aria-expanded',String(!collapsed));
   refs[side].reopen.hidden=!collapsed;
   refs[side].separator.setAttribute('aria-valuenow',String(Math.round(state[side])));
   refs[side].separator.setAttribute('aria-valuemin',String(LIMITS[side].min));
   refs[side].separator.setAttribute('aria-valuemax',String(widthLimits(side).max));
   refs[side].separator.setAttribute('aria-valuetext',Math.round(state[side])+' pixels');
  }
  if(save)persist();
 }
 function setWidth(side,value,save=false){
  const {min,max}=widthLimits(side);
  state[side]=Math.round(clamp(value,min,max));
  update({save});
 }
 function setCollapsed(side,collapsed){
  state[side+'Collapsed']=collapsed;
  update({save:true});
  if(collapsed)refs[side].reopen.focus();
  else refs[side].toggle.focus();
 }
 function control(side,dock){
  const header=document.createElement('div');
  header.className='workspace-dock-head';
  dock.insertBefore(header,dock.firstChild);
  header.append(dock.querySelector('.hybrid-dock-tabs'));
  const reset=document.createElement('button');
  reset.type='button';reset.className='workspace-reset-size';reset.textContent='↺';
  reset.setAttribute('aria-label','Restaurar largura '+(side==='left'?'da biblioteca':'das propriedades'));
  reset.title='Restaurar largura padrão';
  reset.addEventListener('click',()=>setWidth(side,LIMITS[side].default,true));
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='workspace-collapse';toggle.title='Recolher painel';
  toggle.addEventListener('click',()=>setCollapsed(side,true));
  header.append(reset,toggle);
  const reopen=document.createElement('button');
  reopen.type='button';reopen.className='workspace-reopen workspace-reopen-'+side;
  reopen.textContent=side==='left'?'▤ Biblioteca':'☷ Propriedades';
  reopen.setAttribute('aria-label','Abrir '+(side==='left'?'biblioteca':'propriedades'));
  reopen.addEventListener('click',()=>setCollapsed(side,false));
  main.append(reopen);
  const separator=document.createElement('div');
  separator.className='workspace-splitter workspace-splitter-'+side;
  separator.tabIndex=0;
  separator.setAttribute('role','separator');
  separator.setAttribute('aria-orientation','vertical');
  separator.setAttribute('aria-label','Redimensionar '+(side==='left'?'biblioteca':'propriedades'));
  separator.title='Arraste para ajustar · setas do teclado para precisão · duplo clique restaura';
  if(side==='left')dock.after(separator);
  else dock.before(separator);
  let drag=null;
  separator.addEventListener('pointerdown',e=>{
   if(e.button!==0||state[side+'Collapsed']||matchMedia('(max-width:900px)').matches)return;
   e.preventDefault();
   drag={x:e.clientX,width:state[side]};
   separator.setPointerCapture?.(e.pointerId);
   document.body.classList.add('workspace-resizing');
  });
  separator.addEventListener('pointermove',e=>{
   if(!drag)return;
   const delta=(e.clientX-drag.x)*(side==='left'?1:-1);
   setWidth(side,drag.width+delta);
  });
  const finish=()=>{if(!drag)return;drag=null;document.body.classList.remove('workspace-resizing');persist()};
  separator.addEventListener('pointerup',finish);
  separator.addEventListener('pointercancel',finish);
  separator.addEventListener('lostpointercapture',finish);
  separator.addEventListener('dblclick',()=>setWidth(side,LIMITS[side].default,true));
  separator.addEventListener('keydown',e=>{
   let next=null;
   const n=LIMITS[side];
   if(e.key==='ArrowLeft')next=state[side]+(side==='left'?-16:16);
   if(e.key==='ArrowRight')next=state[side]+(side==='left'?16:-16);
   if(e.key==='Home')next=n.min;
   if(e.key==='End')next=widthLimits(side).max;
   if(next===null)return;
   e.preventDefault();setWidth(side,next,true);
  });
  refs[side]={toggle,reset,reopen,separator};
 }
 control('left',left);control('right',right);
 function keepCenter(){
  if(matchMedia('(max-width:900px)').matches)return;
  for(const side of ['right','left']){
   if(!state[side+'Collapsed'])state[side]=Math.min(state[side],widthLimits(side).max);
  }
  update();
 }
 window.addEventListener('resize',keepCenter,{passive:true});
 keepCenter();
 return {state,setWidth,setCollapsed};
}
