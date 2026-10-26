/** v0.7 — Visão 3D estilo "construtor de casas". Three.js é carregado sob demanda (vendor/three). */
import {CARD_TYPES,LANES,EDGE_TYPES,deleteNode} from './core.mjs';
import {CATALOG_DESCRIPTIONS,insertComponent} from './build.mjs';
import {createRoom} from './environments.mjs';
import {layoutWorld,roomAtPoint,relativeTo,snapGrid} from './scene3d.mjs';
const v3$=s=>document.querySelector(s);
const v3esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const V3_SPEC={activity:{h:1.1,s:'box',w:1.5,d:1.2},touchpoint:{h:.9,s:'cyl',r:.6},evidence:{h:.35,s:'box',w:1.6,d:1.1},decision:{h:1,s:'dia'},system:{h:1.9,s:'box',w:1.1,d:1.1},resource:{h:.8,s:'cyl',r:.55},metric:{h:1.4,s:'cyl',r:.32}};
const V3_FLOOR=.16,v3clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function initView3D(api){
  const root=v3$('#view3d-view'),state={active:false};
  let THREE=null,renderer,scene,camera,sun,world,edgeGroup,plumb,ghost,dom,stage,layout,raf=0,ready=false,starting=false;
  let selected=null,placing=null,down=null,drag=null,mode='orbit';
  const cam={yaw:.75,pitch:.85,dist:26,tx:6,tz:6};let goalYaw=cam.yaw;
  const items=new Map(),pos=new Map(),raycaster={},ndc={};
  root.innerHTML=`<div class="v3-top"><div><div class="panel-eyebrow">VISÃO 3D · CONSTRUTOR DE ESPAÇOS</div><h1>Monte o espaço do seu serviço <span>✦</span></h1><p>Cada ambiente é uma sala e cada peça é um objeto. Arraste, solte em outra sala e veja o serviço ganhar forma.</p></div><div class="v3-top-actions"><button class="button muted" id="v3-rooms">▣ Ambientes prontos</button><button class="button primary" id="v3-back">← Voltar a construir</button></div></div>
  <div class="v3-main"><div class="v3-stage" id="v3-stage"><div class="v3-loading" id="v3-loading">Carregando o 3D…</div><div class="v3-chip" id="v3-chip" role="status"></div><div class="v3-views"><button id="v3-rl" title="Girar à esquerda (Q)" aria-label="Girar à esquerda">⟲</button><button id="v3-rr" title="Girar à direita (E)" aria-label="Girar à direita">⟳</button><button id="v3-fit" title="Enquadrar tudo">Enquadrar</button></div></div><aside class="v3-panel inspector" id="v3-panel" aria-live="polite"></aside></div>
  <div class="v3-bar" id="v3-bar" role="toolbar" aria-label="Peças para colocar"><span class="v3-bar-title">COLOCAR</span>${Object.entries(CARD_TYPES).map(([k,t])=>`<button class="piece" data-piece="${k}" title="${v3esc(CATALOG_DESCRIPTIONS[k])}" aria-pressed="false"><span class="library-icon type-${k}">${t.icon}</span>${v3esc(t.title)}</button>`).join('')}<i></i><button class="piece" id="v3-new-room"><span class="library-icon">＋</span>Ambiente</button></div>`;
  const chip=v3$('#v3-chip'),panel=v3$('#v3-panel'),say=(m,warn=false)=>{chip.textContent=m;chip.classList.toggle('warn',warn)};
  const V3_HINT='Arraste para girar · Shift ou botão direito: mover a vista · Roda: zoom · Arraste uma peça para movê-la';
  const doc=()=>api.getDocument();
  async function start(){
    if(starting)return;starting=true;const loading=v3$('#v3-loading');loading.hidden=false;
    try{
      THREE=await import('../vendor/three/three.module.min.js');stage=v3$('#v3-stage');
      renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      dom=renderer.domElement;dom.tabIndex=0;dom.setAttribute('aria-label','Cena 3D do serviço');stage.prepend(dom);
      scene=new THREE.Scene();scene.background=new THREE.Color('#e9f2f0');camera=new THREE.PerspectiveCamera(42,1,.1,400);
      scene.add(new THREE.HemisphereLight('#ffffff','#a9c0bb',1.05));
      sun=new THREE.DirectionalLight('#ffffff',1.7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;scene.add(sun,sun.target);
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:'#dce8e5',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
      const grid=new THREE.GridHelper(200,100,'#c5d8d4','#d3e2de');grid.position.y=.01;scene.add(grid);
      world=new THREE.Group();edgeGroup=new THREE.Group();scene.add(world,edgeGroup);
      plumb=new THREE.Mesh(new THREE.OctahedronGeometry(.26),new THREE.MeshStandardMaterial({color:'#3ddc84',emissive:'#1fa35c',emissiveIntensity:.8,flatShading:true}));plumb.scale.y=1.6;plumb.visible=false;scene.add(plumb);
      Object.assign(raycaster,{r:new THREE.Raycaster(),plane:new THREE.Plane(new THREE.Vector3(0,1,0),-V3_FLOOR)});ndc.v=new THREE.Vector2();
      new ResizeObserver(resize).observe(stage);bindPointer();ready=true;loading.hidden=true;resize();rebuild();frame();say(V3_HINT);renderPanel();loop();
    }catch(err){console.warn('3D indisponível',err);loading.textContent='Não foi possível iniciar o 3D neste navegador (WebGL indisponível ou arquivos de vendor ausentes). Os modos Construir e Ambientes continuam funcionando.';ready=false}
    starting=false;
  }
  function resize(){if(!renderer)return;const w=Math.max(200,stage.clientWidth),h=Math.max(200,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  function applyCam(){cam.yaw+=(goalYaw-cam.yaw)*.2;const c=Math.cos(cam.pitch);camera.position.set(cam.tx+cam.dist*Math.sin(cam.yaw)*c,cam.dist*Math.sin(cam.pitch),cam.tz+cam.dist*Math.cos(cam.yaw)*c);camera.lookAt(cam.tx,0,cam.tz)}
  function frame(){if(!layout)return;const b=layout.bounds;cam.tx=(b.minX+b.maxX)/2;cam.tz=(b.minZ+b.maxZ)/2;cam.dist=v3clamp(Math.max(b.maxX-b.minX,b.maxZ-b.minZ)*1.25,14,120);cam.pitch=.85}
  function loop(t=0){if(!state.active||!ready){raf=0;return}raf=requestAnimationFrame(loop);if(plumb.visible){plumb.rotation.y+=.03;plumb.position.y=(plumb.userData.base||2)+Math.sin(t/300)*.12}applyCam();renderer.render(scene,camera)}
  function clear(g){for(const c of [...g.children]){g.remove(c);c.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m){m.map?.dispose();m.dispose?.()}})}}
  function v3round(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function v3label(lines,{bg='#ffffffee',fg='#14323a',scale=1}={}){
    const cv=document.createElement('canvas');cv.width=512;cv.height=lines.length>1?132:84;const c=cv.getContext('2d');
    c.fillStyle=bg;v3round(c,4,4,cv.width-8,cv.height-8,26);c.fill();c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';
    lines.forEach((l,i)=>{c.font=`${i?'500 28px':'800 36px'} sans-serif`;c.globalAlpha=i?.75:1;c.fillText(l,256,lines.length>1?(i?96:44):cv.height/2,480)});
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sp.scale.set(cv.width/120*scale,cv.height/120*scale,1);sp.renderOrder=5;return sp;
  }
  function bodyMesh(type,color){
    const s=V3_SPEC[type]||V3_SPEC.activity;let geo;
    if(s.s==='cyl')geo=new THREE.CylinderGeometry(s.r*.92,s.r,s.h,28);else if(s.s==='dia'){geo=new THREE.BoxGeometry(1.05,s.h,1.05)}else geo=new THREE.BoxGeometry(s.w,s.h,s.d);
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.05}));if(s.s==='dia')m.rotation.y=Math.PI/4;m.position.y=s.h/2+V3_FLOOR;m.castShadow=m.receiveShadow=true;return m;
  }
  function rebuild(){
    if(!ready)return;const d=doc();clear(world);items.clear();pos.clear();layout=layoutWorld(d);
    for(const r of layout.rooms){
      const base=new THREE.Color(r.color),floorC=base.clone().lerp(new THREE.Color('#ffffff'),.72);
      const fl=new THREE.Mesh(new THREE.BoxGeometry(r.w,V3_FLOOR,r.d),new THREE.MeshStandardMaterial({color:floorC,roughness:.9}));fl.position.set(r.x+r.w/2,V3_FLOOR/2,r.z+r.d/2);fl.receiveShadow=true;world.add(fl);
      const wm=new THREE.MeshStandardMaterial({color:base,roughness:.7}),T=.14,H=.55;
      for(const [w,dd,px,pz] of [[r.w,T,r.x+r.w/2,r.z],[r.w,T,r.x+r.w/2,r.z+r.d],[T,r.d,r.x,r.z+r.d/2],[T,r.d,r.x+r.w,r.z+r.d/2]]){const wall=new THREE.Mesh(new THREE.BoxGeometry(w,H,dd),wm);wall.position.set(px,H/2+V3_FLOOR,pz);wall.castShadow=wall.receiveShadow=true;world.add(wall)}
      const lb=v3label([`${r.icon} ${r.name.slice(0,26)}`,`${r.count} peça${r.count===1?'':'s'}`],{bg:'#'+base.getHexString()+'ee',fg:'#ffffff',scale:.95});lb.position.set(r.x+r.w/2,.95,r.z+r.d+.55);world.add(lb);
    }
    const nodes=new Map(d.nodes.map(n=>[n.id,n]));
    for(const it of layout.items){
      const n=nodes.get(it.id);if(!n)continue;const lane=LANES.find(l=>l.id===CARD_TYPES[n.type].lane),s=V3_SPEC[n.type]||V3_SPEC.activity;
      const g=new THREE.Group();g.position.set(it.x,0,it.z);const b=bodyMesh(n.type,lane?.accent||'#168b86');b.userData={id:n.id};g.add(b);
      const sub=[n.team,Number(n.duration)?`${Number(n.duration)} min`:''].filter(Boolean).join(' · ');
      const lb=v3label([`${CARD_TYPES[n.type].icon} ${String(n.title).slice(0,24)}`,...(sub?[sub.slice(0,34)]:[])]);lb.position.y=s.h+V3_FLOOR+.95;g.add(lb);
      g.userData={id:n.id,body:b,h:s.h+V3_FLOOR};world.add(g);items.set(n.id,g);pos.set(n.id,{x:it.x,z:it.z,h:g.userData.h});
    }
    const extent=Math.max(layout.bounds.maxX,layout.bounds.maxZ);const c=sun.shadow.camera;c.left=c.bottom=-extent*.8;c.right=c.top=extent*.8;c.far=extent*3;c.updateProjectionMatrix();
    sun.position.set(layout.bounds.maxX/2+extent*.5,extent*.9,layout.bounds.maxZ/2+extent*.35);sun.target.position.set(layout.bounds.maxX/2,0,layout.bounds.maxZ/2);
    if(selected&&!items.has(selected))selected=null;buildEdges();updateSelection();
  }
  function buildEdges(){
    clear(edgeGroup);
    for(const e of doc().edges){const a=pos.get(e.from),b=pos.get(e.to);if(!a||!b)continue;
      const A=new THREE.Vector3(a.x,a.h+.35,a.z),B=new THREE.Vector3(b.x,b.h+.35,b.z),lift=1.1+A.distanceTo(B)*.12,M=A.clone().add(B).multiplyScalar(.5);M.y+=lift;
      const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A,M,B),24,.045,6),new THREE.MeshBasicMaterial({color:EDGE_TYPES[e.type].color}));edgeGroup.add(tube);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.13,.34,10),new THREE.MeshBasicMaterial({color:EDGE_TYPES[e.type].color}));tip.position.copy(B);tip.position.y+=.12;tip.rotation.x=Math.PI;edgeGroup.add(tip);
    }
  }
  function updateSelection(){
    for(const [id,g] of items){const m=g.userData.body.material;m.emissive.set(id===selected?'#2fb7a6':'#000000');m.emissiveIntensity=.45}
    const p=pos.get(selected);plumb.visible=!!p;if(p){plumb.userData.base=p.h+2.2;plumb.position.set(p.x,plumb.userData.base,p.z)}
  }
  function selectItem(id){selected=id;updateSelection();renderPanel()}
  function renderPanel(){
    const d=doc(),n=d.nodes.find(x=>x.id===selected);
    if(!n){panel.innerHTML=`<div class="panel-eyebrow">CONSTRUTOR 3D</div><h2>${d.environments?.length?'Escolha uma peça':'Comece por um ambiente'}</h2><p>${d.environments?.length?'Clique numa peça para editar, ou escolha uma peça na barra inferior e clique dentro de um ambiente para colocá-la.':'Clique em “＋ Ambiente” na barra inferior ou abra “Ambientes prontos” para começar com um conjunto pronto.'}</p><div class="hint-steps"><span>01 · Crie ambientes</span><span>02 · Coloque peças</span><span>03 · Arraste entre salas</span></div><p class="help">Linhas coloridas mostram as conexões; as posições 3D ficam salvas no projeto.</p>`;return}
    const f=(t,k,type='text')=>`<label class="field">${t}<input data-f="${k}" type="${type}" value="${v3esc(n[k])}" ${type==='number'?'min="0" step="any"':'maxlength="100"'}></label>`;
    panel.innerHTML=`<div class="inspect-header"><div><div class="panel-eyebrow">PEÇA SELECIONADA</div><h2>${v3esc(CARD_TYPES[n.type].title)}</h2></div><span class="inspect-symbol">${CARD_TYPES[n.type].icon}</span></div>${f('Como essa peça se chama?','title')}${f('Quem faz?','owner')}${f('Equipe','team')}${f('Tempo (minutos)','duration','number')}<label class="field">Ambiente<select data-f="env"><option value="">Sem ambiente</option>${(d.environments||[]).map(r=>`<option value="${v3esc(r.id)}" ${n.environmentId===r.id?'selected':''}>${v3esc(r.name)}</option>`).join('')}</select></label><div class="inspector-foot-actions"><button class="button small muted" data-act="edit">▦ Editar no mapa 2D</button><button class="danger" data-act="del">Excluir peça</button></div>`;
  }
  panel.addEventListener('change',e=>{const f=e.target.dataset?.f;if(!f||!selected)return;const id=selected,val=e.target.value;
    try{api.mutate(d=>{const n=d.nodes.find(x=>x.id===id);if(!n)return;if(f==='env'){if(val)n.environmentId=val;else delete n.environmentId;delete n.at}else if(f==='duration')n.duration=Math.max(0,Number(val)||0);else if(f==='title'&&!val.trim())return;else n[f]=val.slice(0,100)})}catch(err){say(err.message,true)}});
  panel.addEventListener('click',e=>{const a=e.target.closest('[data-act]')?.dataset.act;if(!a||!selected)return;if(a==='edit')api.onEdit(selected);else if(a==='del')deleteSelected()});
  function deleteSelected(){if(!selected)return;const id=selected;selected=null;try{api.mutate(d=>deleteNode(d,id));say('Peça removida. Ctrl+Z desfaz.')}catch(err){say(err.message,true)}}
  /* Ponteiro: peça → arrastar; fundo → girar; Shift/direito/meio → mover a vista */
  function setRay(e){const r=dom.getBoundingClientRect();ndc.v.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);raycaster.r.setFromCamera(ndc.v,camera)}
  function floorPoint(e){setRay(e);const p=new THREE.Vector3();return raycaster.r.ray.intersectPlane(raycaster.plane,p)?p:null}
  function pickItem(e){setRay(e);return raycaster.r.intersectObjects([...items.values()].map(g=>g.userData.body),false)[0]?.object.userData.id||null}
  function moveVisual(id,x,z){const g=items.get(id),p=pos.get(id);if(!g||!p)return;p.x=x;p.z=z;g.position.set(x,0,z);buildEdges();if(id===selected)plumb.position.set(x,plumb.position.y,z)}
  function ghostAt(e){
    if(!placing)return;const p=floorPoint(e);if(!p){ghost.visible=false;return}
    const x=snapGrid(p.x),z=snapGrid(p.z),ok=!!roomAtPoint(layout,x,z);ghost.visible=true;ghost.position.set(x,0,z);ghost.children[0].material.color.set(ok?'#3ddc84':'#e05a5a');
  }
  function setPlacing(type){
    placing=placing===type?null:type;v3$('#v3-bar').querySelectorAll('[data-piece]').forEach(b=>{const on=b.dataset.piece===placing;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
    if(ghost){scene.remove(ghost);ghost=null}
    if(placing){const g=new THREE.Group(),m=bodyMesh(placing,'#3ddc84');m.material.transparent=true;m.material.opacity=.6;m.castShadow=false;g.add(m);g.visible=false;ghost=g;scene.add(g);say(`${CARD_TYPES[placing].title}: clique dentro de um ambiente para colocar. Esc cancela.`)}else say(V3_HINT);
  }
  function placeAt(e){
    const p=floorPoint(e);if(!p)return;const x=snapGrid(p.x),z=snapGrid(p.z),room=roomAtPoint(layout,x,z);
    if(!room){say(doc().environments?.length?'Coloque dentro de um ambiente (área colorida).':'Crie um ambiente primeiro: use “＋ Ambiente”.',true);return}
    const rel=relativeTo(room,x,z),type=placing;
    try{api.mutate(d=>{const {node}=insertComponent(d,{type});node.at=rel;if(room.id)node.environmentId=room.id});const n=doc().nodes[doc().nodes.length-1];setPlacing(type);selectItem(n.id);say(`${CARD_TYPES[type].title} colocado em ${room.name}. Dê um nome no painel.`)}catch(err){say(err.message,true)}
  }
  function dropItem(id){
    const p=pos.get(id),room=p&&roomAtPoint(layout,p.x,p.z);
    if(!room){say('Solte a peça dentro de um ambiente.',true);rebuild();return}
    const rel=relativeTo(room,p.x,p.z),was=doc().nodes.find(n=>n.id===id)?.environmentId||null;
    try{api.mutate(d=>{const n=d.nodes.find(x=>x.id===id);n.at=rel;if(room.id)n.environmentId=room.id;else delete n.environmentId});say(room.id!==was?`Peça movida para ${room.name}.`:'Peça reposicionada.')}catch(err){say(err.message,true);rebuild()}
  }
  function bindPointer(){
    dom.addEventListener('contextmenu',e=>e.preventDefault());
    dom.addEventListener('pointerdown',e=>{
      dom.setPointerCapture(e.pointerId);dom.focus();down={x:e.clientX,y:e.clientY,btn:e.button,moved:false,cam:{...cam},yaw:goalYaw};drag=null;
      if(e.button===0&&!e.shiftKey){if(placing){placeAt(e);down=null;return}
        const id=pickItem(e);if(id){selectItem(id);const p=floorPoint(e),ip=pos.get(id);drag=p?{id,dx:ip.x-p.x,dz:ip.z-p.z}:null;return}}
      mode=(e.button===2||e.button===1||e.shiftKey)?'pan':'orbit';
    });
    dom.addEventListener('pointermove',e=>{
      if(placing)ghostAt(e);if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>3)down.moved=true;
      if(drag){const p=floorPoint(e);if(p&&down.moved)moveVisual(drag.id,snapGrid(p.x+drag.dx),snapGrid(p.z+drag.dz));return}
      if(mode==='orbit'){goalYaw=cam.yaw=down.yaw-dx*.006;cam.pitch=v3clamp(down.cam.pitch+dy*.005,.2,1.4)}
      else{const k=cam.dist*.0016,s=Math.sin(cam.yaw),c=Math.cos(cam.yaw);cam.tx=down.cam.tx-c*dx*k-s*dy*k;cam.tz=down.cam.tz+s*dx*k-c*dy*k}
    });
    const end=()=>{if(drag&&down?.moved)dropItem(drag.id);else if(down&&!down.moved&&down.btn===0&&!drag&&!placing)selectItem(null);down=null;drag=null};
    dom.addEventListener('pointerup',end);dom.addEventListener('pointercancel',()=>{if(drag)rebuild();down=null;drag=null});
    dom.addEventListener('wheel',e=>{e.preventDefault();cam.dist=v3clamp(cam.dist*(e.deltaY>0?1.1:1/1.1),6,140)},{passive:false});
  }
  v3$('#v3-back').addEventListener('click',()=>api.onBack());v3$('#v3-rooms').addEventListener('click',()=>api.onRooms());
  v3$('#v3-rl').addEventListener('click',()=>{goalYaw+=Math.PI/2});v3$('#v3-rr').addEventListener('click',()=>{goalYaw-=Math.PI/2});v3$('#v3-fit').addEventListener('click',frame);
  v3$('#v3-bar').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!ready)return;if(b.dataset.piece)setPlacing(b.dataset.piece);else if(b.id==='v3-new-room'){const name=prompt('Nome do novo ambiente','Novo ambiente');if(name?.trim()){try{api.mutate(d=>createRoom(d,{name}));say(`Ambiente “${name.trim()}” criado. Escolha uma peça e clique dentro dele.`)}catch(err){say(err.message,true)}}}});
  window.addEventListener('keydown',e=>{
    if(!state.active||e.target.matches?.('input,textarea,select')||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey)return;
    const k=e.key.toLowerCase();
    if(e.key==='Escape'){if(placing)setPlacing(placing);else selectItem(null)}else if(k==='q')goalYaw+=Math.PI/2;else if(k==='e')goalYaw-=Math.PI/2;else if(k==='f')frame();
    else if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();deleteSelected()}
  });
  return {state,
    show(){state.active=true;root.hidden=false;if(!ready)start();else{resize();rebuild();renderPanel();if(!raf)loop()}},
    hide(){state.active=false;root.hidden=true;if(placing&&ready)setPlacing(placing)},
    refresh(){if(!ready)return;rebuild();renderPanel()}};
}
