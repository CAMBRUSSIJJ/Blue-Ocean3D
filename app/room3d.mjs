/** Service Builder v1.5 — editor 3D de UM ambiente; mesmo floorplan canônico do 2D. */
import {GRID,FURNITURE,validFurniture,furnitureDimensions,resizeFurniture,putFurniture,moveFurniture,rotateFurniture,removeFurniture} from './floorplan.mjs';
import {wallHeight,wallSceneHeight,setWallHeight} from './room-style.mjs';
import {roomEdges,cellMeters,setEdge} from './floorplan-navigation.mjs';
import {segmentAtFloor,segmentPlacement,duplicateFurniture,moveFurnitureBy,moveFurnitureGroup,removeFurnitureGroup,paintStructureLine} from './studio-actions.mjs';
import {placementFromPoint,FURNITURE_DRAG_TYPE} from './placement.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const colors={counter:0xb68762,desk:0xc79c76,station:0x6d9eac,waiting:0x8278b9,chair:0xb5a3cd,kiosk:0x6898ad,shelf:0x967557,plant:0x519b6c,door:0x85a997};
export function initRoom3D({element,getDocument,getRoomId,getSelection,getSelections,getPlacing,mutate,onSelect,onPlaced,onCancel,onMessage,onUnavailable}){
 let THREE,renderer,scene,world,camera,dom,ready=false,active=false,loading=false,raf=0,ro=null;
 const view={yaw:0.72,pitch:0.89,zoom:1,targetX:6,targetZ:4,cutaway:true},pointer={down:null};
 const ray={};let resizePreview=null;let surface,ghost=null,ghostKey='',ghostValid=false,structureMode=null,structurePreview=null,structurePreviewKey='';
 let hoveredId=null;
 function hideStructurePreview(){if(!structurePreview||!world)return;world.remove(structurePreview);structurePreview.geometry?.dispose();structurePreview.material?.dispose();structurePreview=null;structurePreviewKey='';requestFrame();}
 function hideResizePreview(){if(!resizePreview||!world)return;world.remove(resizePreview);resizePreview.geometry?.dispose();resizePreview.material?.dispose();resizePreview=null;requestFrame();}
 function hideGhost(){if(!ghost||!world)return;world.remove(ghost);disposeGroup(ghost);ghost=null;ghostKey='';}
 function structureAt(pos){
  const segment=pos?segmentAtFloor(pos.x,pos.z):null;
  const result=segmentPlacement(getDocument(),getRoomId(),segment,structureMode);
  return {...result,segment};
 }
 function previewStructure(pos){
  if(!ready||!structureMode||!pos){hideStructurePreview();return;}
  const {valid,segment}=structureAt(pos);if(!segment){hideStructurePreview();return;}
  const key=[getRoomId(),structureMode,segment.axis,segment.x,segment.y,valid].join(':');
  if(key===structurePreviewKey)return;
  hideStructurePreview();
  const horizontal=segment.axis==='h',color=valid?0x13a977:0xda515b;
  const geo=new THREE.BoxGeometry(horizontal?.96:.16,.12,horizontal?.16:.96);
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88,depthTest:false});
  const mesh=new THREE.Mesh(geo,material);mesh.position.set(horizontal?segment.x+.5:segment.x,.16,horizontal?segment.y:segment.y+.5);
  mesh.renderOrder=40;world.add(mesh);structurePreview=mesh;structurePreviewKey=key;requestFrame();
 }
 function toggleStructure(mode){
  structureMode=structureMode===mode?null:mode;
  hideGhost();hideStructurePreview();
  if(structureMode){onCancel?.();say(`Modo ${structureMode==='wall'?'Parede':structureMode==='door'?'Porta':'Passagem livre'}: clique próximo à linha da grade. Esc cancela.`)}
  else say('Modo de construção encerrado.');
  element.querySelectorAll('[data-room3d-structure]').forEach(b=>{const active=b.dataset.room3dStructure===structureMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  dom?.focus();requestFrame();
 }
 function placeStructure(pos){
  const {valid,segment,reason}=structureAt(pos);
  if(!valid){say('⚠ '+reason);return;}
  try{mutate(d=>setEdge(d,getRoomId(),segment.axis,segment.x,segment.y,structureMode));
   say(structureMode==='wall'?'Parede construída.':structureMode==='door'?'Porta posicionada.':'Passagem liberada.');
   hideStructurePreview();renderRoom();}
  catch(error){say('⚠ '+error.message);renderRoom();}
 }
 function previewAt(kind,pos,ignoreId=null){
  if(!pos||!FURNITURE[kind]||!getRoomId()){hideGhost();return null;}
  const result=placementFromPoint(getDocument(),{roomId:getRoomId(),kind,pointX:pos.x,pointY:pos.z,ignoreId,rotation:ignoreId?validFurniture(getDocument()).find(o=>o.id===ignoreId)?.rotation||0:0});
  const o=result.object;if(!o){hideGhost();return result;}
  const key=[o.roomId,kind,o.x,o.y,o.rotation,o.width,o.height,result.valid,ignoreId].join(':');
  if(key!==ghostKey){hideGhost();ghost=furniture(o,false);ghost.userData.objectId=null;
   ghost.traverse(m=>{if(m.isMesh){m.userData.objectId=null;m.material.transparent=true;m.material.opacity=.52;m.material.depthWrite=false;m.material.color.lerp(new THREE.Color(result.valid?'#168db8':'#df5561'),.65);}});
   ghost.position.y=.15;world.add(ghost);ghostKey=key;
  }
  ghostValid=result.valid;requestFrame();return result;
 }

 function say(s){onMessage?.(s)}
 function disposeGroup(group){if(!group)return;for(const c of [...group.children]){group.remove(c);c.traverse(o=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.map?.dispose();m.dispose?.()}}})}}
 function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:0.78,metalness:0.02,...extra})}
 function cub(parent,w,h,d,x,y,z,color,extra={}){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,extra));mesh.position.set(x,y,z);mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function sphere(parent,r,x,y,z,color){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 function cylinder(parent,a,b,h,x,y,z,color){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,12),mat(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 function furniture(o,selected,hovered=false){
  const [w,d]=furnitureDimensions(o),group=new THREE.Group();group.position.set(o.x+w/2,0.06,o.y+d/2);group.rotation.y=o.rotation===90?Math.PI/2:0;group.userData.objectId=o.id;
  const spec=FURNITURE[o.kind];group.scale.set(o.rotation===90?d/spec.w:w/spec.w,1,o.rotation===90?w/spec.h:d/spec.h);
  const color=colors[o.kind]||0x8dafa1,iw=FURNITURE[o.kind].w*.82,id=FURNITURE[o.kind].h*.82;
  cub(group,iw,.06,id,0,.08,0,0xdbe7df); // sombra/base visual
  if(o.kind==='counter'){cub(group,iw,.88,id,0,.5,0,color);cub(group,iw,.15,id+.12,0,1.02,0,0xe0ba92);cub(group,iw*.34,.30,.07,0,1.27,-.2,0x2e5d65);cub(group,iw*.31,.22,.025,0,1.29,-.15,0x8bdbdf);cub(group,.33,.04,.15,.12,1.13,.12,0x465a59)}
  else if(o.kind==='desk'||o.kind==='station'){cub(group,iw,.16,id,0,.84,0,color);for(const x of [-iw*.4,iw*.4])for(const z of [-id*.35,id*.35])cub(group,.10,.72,.1,x,.42,z,0x6f5844);if(o.kind==='station'){cub(group,.68,.58,.08,0,1.2,-.35,0x2e5261);cub(group,.5,.29,.035,0,1.22,-.29,0x9fd9de);cub(group,.24,.08,.26,0,.9,-.24,0x3b5660);cub(group,.38,.035,.19,0,.95,.09,0x405763)}}
  else if(o.kind==='waiting'){cub(group,iw,.39,id*.82,0,.35,.04,color);cub(group,iw,.62,.23,0,.68,-id*.39,color);for(const x of [-iw*.46,iw*.46])cub(group,.18,.35,id*.82,x,.48,.04,color)}
  else if(o.kind==='chair'){cub(group,iw*.75,.2,id*.68,0,.47,.1,color);cub(group,iw*.75,.75,.14,0,.72,-id*.33,color);cub(group,iw*.64,.07,.08,0,1.11,-id*.33,0x8d7b9f);for(const x of [-iw*.28,iw*.28])for(const z of [-id*.2,id*.2])cub(group,.08,.46,.08,x,.25,z,0x736b78)}
  else if(o.kind==='kiosk'){cub(group,iw*.6,1.45,id*.62,0,.8,0,color);cub(group,iw*.46,.56,.05,0,1.12,id*.33,0x34596c);cub(group,iw*.37,.38,.055,0,1.15,id*.365,0x81d7de)}
  else if(o.kind==='shelf'){cub(group,iw,1.65,id*.72,0,.87,0,color);for(const y of [.34,.83,1.3]){cub(group,iw*.98,.07,id*.76,0,y,0,0xdfc3a2); for(const x of [-iw*.30,0,iw*.30])cub(group,.15,.27,id*.28,x,y+.16,.02,0x75a6a0)}}
  else if(o.kind==='bench'){cub(group,iw,.16,id*.8,0,.53,.07,0x9a815b);cub(group,iw,.38,.11,0,.77,-id*.37,0x97734f);for(const x of [-iw*.44,iw*.44])cub(group,.11,.50,.12,x,.27,0,0x655b4c)}
  else if(o.kind==='table'){cylinder(group,.82,.82,.14,0,.79,0,0xc29a6f);cylinder(group,.16,.16,.73,0,.38,0,0x7c5f42);cylinder(group,.52,.52,.08,0,.06,0,0x776552)}
  else if(o.kind==='printer'){cub(group,iw*.84,.45,id*.85,0,.39,0,0x7f9baa);cub(group,iw*.72,.14,id*.5,0,.68,-.14,0xdce8e9);cub(group,.27,.05,.16,.08,.70,-.06,0x2f6771);cub(group,iw*.6,.04,.22,0,.14,.31,0xf6f7f2)}
  else if(o.kind==='coffee'){cub(group,iw*.65,1.26,id*.75,0,.69,0,0x699a9b);cylinder(group,.19,.19,.46,0,1.39,-.12,0x3e6677);cylinder(group,.22,.21,.08,0,1.60,-.12,0xe8edef);cub(group,.28,.2,.08,0,1.0,.35,0xb0e4e0)}
  else if(o.kind==='exam'){cub(group,iw,.25,id*.82,0,.76,0,0xb7cbd0);cub(group,iw*.9,.12,id*.7,0,.95,0,0xe6f2f3);cub(group,.45,.15,id*.72,-iw*.34,1.1,0,0xe0ebea);for(const x of [-iw*.43,iw*.43])for(const z of [-id*.3,id*.3])cub(group,.09,.60,.09,x,.38,z,0x75969a)}
  else if(o.kind==='screen'){cub(group,iw*.94,.16,id*.42,0,.7,0,0x8a9f9d);cub(group,iw*.8,.70,.13,0,1.14,-.18,0x385963);cub(group,iw*.69,.55,.025,0,1.15,-.10,0x9ccfd0);cub(group,.09,.56,.12,0,.36,0,0x6e8a84)}
  else if(o.kind==='stool'){cylinder(group,.39,.39,.14,0,.75,0,0x9a84b0);cylinder(group,.07,.07,.65,0,.36,0,0x667b84);for(const [x,z] of [[-.3,-.25],[.3,-.25],[-.3,.25],[.3,.25]])cylinder(group,.04,.04,.37,x,.22,z,0x6b7784)}
  else if(o.kind==='plant'){cylinder(group,.31,.26,.5,0,.31,0,0xc78061);cylinder(group,.08,.08,.55,0,.76,0,0x638a4c);for(const [x,z,y] of [[-.22,-.05,1.13],[.16,.12,1.19],[.03,-.20,1.32],[-.10,.17,1.36]])sphere(group,.31,x,y,z,0x4d9666)}
  else if(o.kind==='door'){cub(group,iw,.045,id,0,.07,0,0x9fc4b5);for(const x of [-iw*.43,iw*.43])cylinder(group,.07,.07,1.3,x,.66,0,0x317f74);cub(group,iw,.09,.13,0,1.32,0,0x317f74)}
  else cub(group,iw,.7,id,0,.5,0,color);
  if(selected||hovered){const accent=selected?0x155eef:0x5ba9ed;cub(group,Math.max(iw+.15,.8),.045,Math.max(id+.15,.8),0,.058,0,accent,{emissive:accent,emissiveIntensity:selected?.55:.2});}
  group.traverse(c=>{if(c.isMesh)c.userData.objectId=o.id});
  return group;
 }
 function makeWall(e,doc,roomId){
  const boundary=(e.axis==='h'&&(e.y===0||e.y===GRID.rows))||(e.axis==='v'&&(e.x===0||e.x===GRID.columns));
  // Frente baixa para que seja possível ver os móveis em perspectiva isométrica.
  const front=e.axis==='h'?e.y===GRID.rows:e.x===GRID.columns;
  const fullHeight=wallSceneHeight(doc,roomId,cellMeters(doc,roomId));
  const height=view.cutaway?(front?.24:(boundary?fullHeight*.78:fullHeight*.55)):fullHeight,thin=.095;
  const x=e.axis==='h'?e.x+.5:e.x,z=e.axis==='v'?e.y+.5:e.y;
  if(e.type==='wall'){cub(world,e.axis==='h'?1.01:thin,height,e.axis==='v'?1.01:thin,x,height/2,z,document.body.classList.contains('bo-ocean')?0xe0e9f5:(front?0xa2b6ae:0xb9cac1));return}
  if(e.type==='door'){
   // Abertura transitável: soleira e batente ao invés de uma parede sólida.
   cub(world,e.axis==='h'?.96:thin,.035,e.axis==='v'?.96:thin,x,.036,z,document.body.classList.contains('bo-ocean')?0x4b9dc8:0x3cab88);
   const h=view.cutaway&&front?.24:Math.min(2.55,fullHeight),dx=e.axis==='h'?.43:0,dz=e.axis==='v'?.43:0;
   for(const s of [-1,1])cub(world,.085,h,.085,x+dx*s,h/2,z+dz*s,document.body.classList.contains('bo-ocean')?0x3b76b4:0x328f7c);
  }
 }
 function renderRoom(){
  if(!ready||!active)return;
  ghost=null;ghostKey='';structurePreview=null;structurePreviewKey='';resizePreview=null;disposeGroup(world);const doc=getDocument(),room=(doc.environments||[]).find(r=>r.id===getRoomId());
  if(!room){say('Adicione ou selecione um ambiente para iniciar a construção 3D.');renderer.render(scene,camera);return}
  const ocean=document.body.classList.contains('bo-ocean');const dark=document.body.classList.contains('sb-hybrid-active')&&!ocean;const base=new THREE.Color(room.color||'#155eef').lerp(new THREE.Color(dark?'#334e49':ocean?'#f6f9fe':'#ffffff'),dark?.86:ocean?.94:.88);
  cub(world,GRID.columns,.12,GRID.rows,GRID.columns/2,-.08,GRID.rows/2,base);
  const grid=new THREE.GridHelper(48,48,dark?0x365d58:ocean?0xc0d2e6:0xc1d7cc,dark?0x284842:ocean?0xe2ebf6:0xe0ece5);grid.scale.set(.25,1,.25);grid.position.set(GRID.columns/2,.004,GRID.rows/2);world.add(grid);
  for(const edge of roomEdges(doc,room.id))makeWall(edge,doc,room.id);
  const objects=validFurniture(doc).filter(o=>o.roomId===room.id);
 const selectedIds=getSelections?.()||[getSelection()];
 for(const o of objects)world.add(furniture(o,selectedIds.includes(o.id),hoveredId===o.id));
 const selected=objects.find(o=>o.id===getSelection());
 // Show the drag-to-resize grip on hover only; the selected floor outline remains visible.
 if(selected&&selectedIds.length===1&&!structureMode&&(hoveredId===selected.id||pointer.down?.resizeId===selected.id)){
  const [w,h]=furnitureDimensions(selected);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.38),new THREE.MeshBasicMaterial({color:0x155eef,depthTest:false}));
  grip.position.set(selected.x+w-.12,.36,selected.y+h-.12);grip.renderOrder=65;grip.userData.resizeId=selected.id;world.add(grip);
 }
 const info=element.querySelector('#room3d-object-info');
 if(info){
  if(selected){
   const [w,d]=furnitureDimensions(selected),meters=cellMeters(doc,room.id);
   info.textContent=`${FURNITURE[selected.kind]?.name||'Móvel'} · ${(w*meters).toFixed(2)} × ${(d*meters).toFixed(2)} m · coluna ${selected.x+1}, linha ${selected.y+1}`;
   info.hidden=false;
  }else{info.textContent='';info.hidden=true;}
 }
  const meters=cellMeters(doc,room.id);const heightInput=element.querySelector('#room3d-wall-height');if(heightInput&&document.activeElement!==heightInput)heightInput.value=wallHeight(doc,room.id).toFixed(2);const chip=element.querySelector('.room3d-dim');if(chip)chip.textContent=`${(GRID.columns*meters).toFixed(1)} × ${(GRID.rows*meters).toFixed(1)} m · ${objects.length} objetos · paredes ${wallHeight(doc,room.id).toFixed(1)} m`;
  requestFrame();
 }
 function updateCamera(){
  if(!camera)return;
  const aspect=Math.max(.6,element.clientWidth/Math.max(1,element.clientHeight)),span=15/view.zoom;
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  const radius=20,cos=Math.cos(view.pitch);camera.position.set(view.targetX+Math.sin(view.yaw)*radius*cos,Math.sin(view.pitch)*radius,view.targetZ+Math.cos(view.yaw)*radius*cos);camera.lookAt(view.targetX,.3,view.targetZ);
 }
 function requestFrame(){if(!ready||!active)return;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;updateCamera();renderer.render(scene,camera)})}
 function resize(){if(!renderer||!active)return;const w=Math.max(250,element.clientWidth),h=Math.max(250,element.clientHeight);renderer.setSize(w,h,false);requestFrame()}
 function point(e){const box=dom.getBoundingClientRect();ray.ndc.set(((e.clientX-box.left)/box.width)*2-1,1-((e.clientY-box.top)/box.height)*2);ray.cast.setFromCamera(ray.ndc,camera);}
 function hit(e){point(e);const hits=ray.cast.intersectObjects(world.children,true);const grip=hits.find(h=>h.object.userData.resizeId)?.object.userData.resizeId||null;const id=grip||hits.find(h=>h.object.userData.objectId)?.object.userData.objectId||null;const v=new THREE.Vector3();const ok=ray.cast.ray.intersectPlane(ray.plane,v);return {id,resizeId:grip,pos:ok?{x:v.x,z:v.z}:null};}
 function startPointer(e){if(e.button!==0&&e.button!==2)return;const h=hit(e),o=validFurniture(getDocument()).find(o=>o.id===h.id)||null;
  hoveredId=h.id;
  pointer.down={resizeId:h.resizeId,resizeOriginal:h.resizeId?o:null,x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch,targetX:view.targetX,targetZ:view.targetZ,id:structureMode?null:h.id,button:e.button,moved:false,original:structureMode?null:o,pos:h.pos,edge:structureMode?structureAt(h.pos).segment:null};
  if(e.button===0&&h.id&&!h.resizeId&&!structureMode&&!getPlacing()){hideGhost();if(e.shiftKey){onSelect(h.id,true);pointer.down=null;renderRoom();return;}if(!(getSelections?.()||[]).includes(h.id))onSelect(h.id);renderRoom();}dom.setPointerCapture?.(e.pointerId);
 }
 function movePointer(e){const p=pointer.down;
  if(!p){
   const h=hit(e);const nextHovered=(!structureMode&&!getPlacing())?h.id:null;
   dom.style.cursor=structureMode?'crosshair':getPlacing()?'copy':h.resizeId?'nwse-resize':h.id?'grab':'default';
   if(nextHovered!==hoveredId){hoveredId=nextHovered;renderRoom();}
   if(structureMode)previewStructure(h.pos);
   else if(getPlacing())previewAt(getPlacing(),h.pos);
   else hideGhost();
   return;
  }
  dom.style.cursor=p.resizeId?'nwse-resize':p.id?'grabbing':'default';
  const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>5)p.moved=true;
  if(p.resizeId&&p.resizeOriginal){const pos=hit(e).pos;if(!pos)return;const w=clamp(Math.round(pos.x-p.resizeOriginal.x),1,GRID.columns-p.resizeOriginal.x),h=clamp(Math.round(pos.z-p.resizeOriginal.y),1,GRID.rows-p.resizeOriginal.y);p.resizeWidth=w;p.resizeHeight=h;try{const test=structuredClone(getDocument());resizeFurniture(test,p.resizeId,w,h);p.resizeAllowed=true;}catch{p.resizeAllowed=false;}hideResizePreview();resizePreview=new THREE.Mesh(new THREE.BoxGeometry(w,.06,h),new THREE.MeshBasicMaterial({color:p.resizeAllowed?0x10aa81:0xd95b66,transparent:true,opacity:.37,depthTest:false}));resizePreview.position.set(p.resizeOriginal.x+w/2,.22,p.resizeOriginal.y+h/2);resizePreview.renderOrder=60;world.add(resizePreview);say(`${w} × ${h} células · ${p.resizeAllowed?'posição livre':'bloqueado'}`);const grip=world.children.find(o=>o.userData.resizeId===p.resizeId);if(grip){grip.position.x=p.resizeOriginal.x+w-.12;grip.position.z=p.resizeOriginal.y+h-.12;grip.material.color.set(p.resizeAllowed?0x079b7b:0xd85e62);}requestFrame();return;}
  if(structureMode&&p.button===0){previewStructure(hit(e).pos);return;}
  if(e.shiftKey&&p.button===0){hideGhost();const speed=.013/view.zoom;view.targetX=clamp(p.targetX-dx*speed,0,GRID.columns);view.targetZ=clamp(p.targetZ+dy*speed,0,GRID.rows);requestFrame();return;}
  if(p.button===2||(!p.id&&!getPlacing()&&!structureMode)){hideGhost();view.yaw=p.yaw+dx*.008;view.pitch=clamp(p.pitch+dy*.006,.25,1.52);requestFrame();return;}
  if(p.moved&&p.id&&!structureMode&&!getPlacing()&&p.original){
   if((getSelections?.()||[]).length>1){hideGhost();say('Grupo selecionado: utilize as setas do teclado ou o painel Objeto para mover em conjunto.');return;}const group=world.children.find(o=>o.userData.objectId===p.id);if(group)group.visible=false;
   const spot=previewAt(p.original.kind,hit(e).pos,p.id);if(spot?.object){p.to=spot.object;p.allowed=spot.valid;}requestFrame();}
 }
 function placeFromPoint(kind,pos){const candidate=previewAt(kind,pos);if(!candidate?.valid){say('⚠ '+(candidate?.reason||'Posição inválida.'));return;}
  try{let id;mutate(doc=>{id=putFurniture(doc,{roomId:getRoomId(),kind,x:candidate.object.x,y:candidate.object.y}).id;});hideGhost();onSelect(id);onPlaced();say(`${FURNITURE[kind].name} colocado no ambiente 3D.`);}catch(error){say('⚠ '+error.message);renderRoom()}
 }
 function endPointer(e){const p=pointer.down;pointer.down=null;if(!p||p.button!==0)return;
  if(p.resizeId){hideResizePreview();if(p.resizeWidth&&p.resizeHeight&&p.resizeAllowed){try{mutate(d=>resizeFurniture(d,p.resizeId,p.resizeWidth,p.resizeHeight));say('Móvel redimensionado pela alça 3D.');}catch(error){say('⚠ '+error.message)}}else if(p.resizeWidth)say('⚠ Redimensionamento bloqueado.');renderRoom();return;}
  if(p.id&&p.to&&p.moved){if(!p.allowed){say('⚠ Local bloqueado. Escolha outra posição.');hideGhost();renderRoom();return;}
   try{mutate(doc=>moveFurniture(doc,p.id,p.to.x,p.to.y));hideGhost();onSelect(p.id);say('Objeto movido no ambiente 3D.');renderRoom();}catch(error){say('⚠ '+error.message);hideGhost();renderRoom();}return;
  }
  if(structureMode){
   if(p.moved&&p.edge){const point=hit(e).pos,first=p.edge,last=point?(first.axis==='v'?{...first,y:Math.max(0,Math.min(GRID.rows-1,Math.floor(point.z)))}:{...first,x:Math.max(0,Math.min(GRID.columns-1,Math.floor(point.x)))}):first;
    try{let count;mutate(d=>{count=paintStructureLine(d,getRoomId(),first,last,structureMode)});say(`${count} trecho(s) atualizado(s) em sequência.`);hideStructurePreview();renderRoom()}catch(error){say('⚠ '+error.message);renderRoom()}
   }else placeStructure(hit(e).pos);return;
  }
  if(p.moved){hideGhost();return;}const type=getPlacing();if(type)placeFromPoint(type,hit(e).pos);else if(!p.id){onSelect(null);renderRoom();}
 }
 function handleControls(e){const tool=e.target.closest('[data-room3d-structure]');if(tool){toggleStructure(tool.dataset.room3dStructure);return;}const b=e.target.closest('[data-room3d-control]');if(!b)return;const action=b.dataset.room3dControl;if(action==='left')view.yaw-=Math.PI/4;if(action==='right')view.yaw+=Math.PI/4;if(action==='zoom-in')view.zoom=clamp(view.zoom*1.2,.6,2.8);if(action==='zoom-out')view.zoom=clamp(view.zoom/1.2,.6,2.8);if(action==='reset'){view.yaw=.72;view.pitch=.89;view.zoom=1;view.targetX=6;view.targetZ=4}
  if(action==='top'){view.pitch=1.52;view.yaw=0;view.targetX=6;view.targetZ=4}
  if(action==='isometric'){view.yaw=.72;view.pitch=.89}
  if(action==='focus-selected'){
   const id=getSelection(),o=validFurniture(getDocument()).find(item=>item.id===id&&item.roomId===getRoomId());
   if(!o){say('Selecione um móvel para centralizá-lo na câmera.');return}
   const [w,d]=furnitureDimensions(o);
   view.targetX=o.x+w/2;view.targetZ=o.y+d/2;view.zoom=clamp(Math.max(view.zoom,1.45),.6,2.8);
   say('Câmera centralizada no móvel. Pressione F para enquadrar o ambiente.');
  }
  if(action==='help'){
   const help=element.querySelector('#room3d-quick-help'),expanded=help.hidden;
   help.hidden=!expanded;b.setAttribute('aria-expanded',String(expanded));
   if(expanded)help.querySelector('button')?.focus();
   return;
  }
  if(action==='close-help'){
   element.querySelector('#room3d-quick-help').hidden=true;
   element.querySelector('[data-room3d-control="help"]').setAttribute('aria-expanded','false');
   element.querySelector('[data-room3d-control="help"]').focus();return;
  }
  if(action==='cutaway'){view.cutaway=!view.cutaway;const btn=element.querySelector('[data-room3d-control="cutaway"]');if(btn){btn.setAttribute('aria-pressed',String(view.cutaway));btn.textContent=view.cutaway?'◧ Corte':'▣ Paredes';}renderRoom()}
  if(action==='duplicate-selected'){
   const id=getSelection();if(!id){say('Selecione um móvel antes de duplicá-lo.');return;}
   try{let clone;mutate(d=>{clone=duplicateFurniture(d,id)});onSelect(clone.id);say('Móvel duplicado em um espaço livre. Vínculo de atividade não foi copiado.');renderRoom();}catch(err){say('⚠ '+err.message)}
  }
  if(action==='rotate-selected'){const id=getSelection();if(!id){say('Selecione um móvel para girá-lo.');return}try{mutate(d=>rotateFurniture(d,id));say('Objeto girado 90°.');onSelect(id);renderRoom()}catch(err){say('⚠ '+err.message)}}
  requestFrame()}
 async function load(){if(ready||loading)return;loading=true;element.querySelector('.room3d-loading').hidden=false;
  try{
   THREE=await import('../vendor/three/three.module.min.js');
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(document.body.classList.contains('bo-ocean')?0xeff5fc:0xe8f1ec,1);
   dom=renderer.domElement;dom.className='room3d-canvas';dom.tabIndex=0;dom.setAttribute('aria-label','Ambiente 3D interativo. Clique para selecionar móveis. Arraste para mover.');element.querySelector('.room3d-viewport').appendChild(dom);
   scene=new THREE.Scene();scene.background=new THREE.Color(document.body.classList.contains('bo-ocean')?'#eff5fc':'#e8f1ec');scene.add(new THREE.HemisphereLight(0xffffff,0x9fbab0,2.1));const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(6,18,12);scene.add(sun);
   world=new THREE.Group();scene.add(world);camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,150);ray.cast=new THREE.Raycaster();ray.ndc=new THREE.Vector2();ray.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
   dom.addEventListener('pointerdown',startPointer);dom.addEventListener('pointermove',movePointer);dom.addEventListener('pointerup',endPointer);dom.addEventListener('pointercancel',()=>{pointer.down=null;hideGhost();hideStructurePreview();hideResizePreview();renderRoom()});dom.addEventListener('pointerleave',()=>{if(!pointer.down){hoveredId=null;dom.style.cursor='default';hideGhost();hideStructurePreview();renderRoom();requestFrame()}});dom.addEventListener('dragover',e=>{if(![...e.dataTransfer.types].includes(FURNITURE_DRAG_TYPE))return;e.preventDefault();e.dataTransfer.dropEffect='copy';const kind=getPlacing();if(kind)previewAt(kind,hit(e).pos)});dom.addEventListener('dragleave',e=>{if(e.relatedTarget!==dom){hideGhost();requestFrame()}});dom.addEventListener('drop',e=>{if(![...e.dataTransfer.types].includes(FURNITURE_DRAG_TYPE))return;e.preventDefault();const kind=e.dataTransfer.getData(FURNITURE_DRAG_TYPE);if(FURNITURE[kind]&&kind!=='door')placeFromPoint(kind,hit(e).pos)});dom.addEventListener('contextmenu',e=>e.preventDefault());dom.addEventListener('wheel',e=>{e.preventDefault();view.zoom=clamp(view.zoom*(e.deltaY<0?1.12:1/1.12),.6,2.8);requestFrame()},{passive:false});
   ro=new ResizeObserver(resize);ro.observe(element);ready=true;element.querySelector('.room3d-loading').hidden=true;resize();renderRoom();
  }catch(error){const m=element.querySelector('.room3d-loading');m.hidden=false;m.textContent='Visualização 3D indisponível (WebGL). Utilize a planta 2D para continuar editando.';say('3D indisponível neste navegador; alternando para o editor 2D.');onUnavailable?.();console.warn(error)}
  loading=false;
 }
 element.addEventListener('click',handleControls);
 element.querySelector('#room3d-quick-help')?.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  e.preventDefault();e.stopPropagation();
  handleControls({target:element.querySelector('[data-room3d-control="close-help"]')});
 });
 element.querySelector('#room3d-wall-height')?.addEventListener('change',e=>{
  const id=getRoomId();if(!id)return;
  try{mutate(d=>setWallHeight(d,id,e.target.value));say(`Paredes ajustadas para ${wallHeight(getDocument(),id).toFixed(2)} m.`);renderRoom()}
  catch(error){say('⚠ '+error.message);e.target.value=wallHeight(getDocument(),id).toFixed(2)}
 });
 window.addEventListener('keydown',e=>{
  if(!active||e.target.closest?.('input,textarea,select,button,[contenteditable="true"]')||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]'))return;
  const key=e.key.toLowerCase();
  if(key==='q'||key==='e'){view.yaw+=(key==='q'?-1:1)*Math.PI/4;requestFrame()}
  if(key==='f'){view.yaw=.72;view.pitch=.89;view.zoom=1;view.targetX=6;view.targetZ=4;requestFrame()}
  if(key==='g'&&getSelection()){e.preventDefault();handleControls({target:element.querySelector('[data-room3d-control="focus-selected"]')})}
  if(key==='?'||key==='h'){e.preventDefault();handleControls({target:element.querySelector('[data-room3d-control="help"]')});return}
  if(key==='d'&&e.shiftKey&&getSelection()){e.preventDefault();handleControls({target:element.querySelector('[data-room3d-control="duplicate-selected"]')});return}
  if((e.key==='Delete'||e.key==='Backspace')&&getSelection()){const ids=getSelections?.()||[getSelection()];try{mutate(d=>ids.length>1?removeFurnitureGroup(d,ids):removeFurniture(d,ids[0]));hideGhost();onSelect(null);say('Móvel(is) excluído(s).');renderRoom()}catch(error){say('⚠ '+error.message)}e.preventDefault();return}
  const nudge=e.key==='ArrowLeft'?[-1,0]:e.key==='ArrowRight'?[1,0]:e.key==='ArrowUp'?[0,-1]:e.key==='ArrowDown'?[0,1]:null;
  if(nudge&&getSelection()){
   e.preventDefault();const ids=getSelections?.()||[getSelection()];
   if(e.shiftKey){
    if(ids.length!==1){say('Redimensione um móvel por vez usando Shift + setas.');return}
    const o=validFurniture(getDocument()).find(item=>item.id===ids[0]);if(!o)return;
    const [w,h]=furnitureDimensions(o),nextW=w+nudge[0],nextH=h+nudge[1];
    try{mutate(d=>resizeFurniture(d,o.id,nextW,nextH));say(`Dimensões: ${nextW} × ${nextH} células.`);renderRoom()}
    catch(error){say('⚠ '+error.message)}return;
   }
   try{mutate(d=>ids.length>1?moveFurnitureGroup(d,ids,...nudge):moveFurnitureBy(d,ids[0],...nudge));say(ids.length>1?'Grupo ajustado.':'Móvel ajustado.');renderRoom()}
   catch(error){say('⚠ '+error.message)}return;
  }
  if(key==='r'&&getSelection())handleControls({target:element.querySelector('[data-room3d-control="rotate-selected"]')});
  if(e.key==='Escape'){if(structureMode)toggleStructure(structureMode);onCancel?.();onSelect(null);hoveredId=null;const help=element.querySelector('#room3d-quick-help');if(help)help.hidden=true;const helpBtn=element.querySelector('[data-room3d-control="help"]');if(helpBtn)helpBtn.setAttribute('aria-expanded','false');say('Seleção e ferramenta ativa canceladas.');renderRoom()}
 });
 return {activate(){active=true;load().then(()=>{resize();renderRoom()})},deactivate(){active=false;pointer.down=null;hoveredId=null;hideGhost();hideStructurePreview();hideResizePreview();if(raf)cancelAnimationFrame(raf);raf=0},render:renderRoom,dispose(){active=false;ro?.disconnect();disposeGroup(world);renderer?.dispose()}};
}
