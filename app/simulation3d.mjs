/** Service Builder 1.6 — visualizador 3D de uma sala por vez.
 * Apenas projeta eventos do motor canônico. Nunca recalcula horários, capacidades ou custos.
 * Rotas visuais são calculadas em floorplan.mjs; distância não entra na simulação temporal.
 */
import {GRID,FURNITURE,validFurniture,furnitureDimensions,peopleAt} from './floorplan.mjs';
import {roomEdges,cellMeters} from './floorplan-navigation.mjs';
import {wallSceneHeight} from './room-style.mjs';
import {physicalTravellers} from './site-traffic.mjs';
import {siteRoomSpot} from './site-routing.mjs';
import {roomInteractionPlan} from './simulation-poses.mjs';
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
export function simulationRoomActors(doc,result,minute,roomId){
 if(!result||!roomId)return [];
 // Modelos importados de versões antigas podem não ter a planta normalizada.
 // Evita que a camada de visualização acrescente propriedades ao projeto original.
 const floor=doc.floorplan;
 const safe=Array.isArray(floor?.objects)&&Array.isArray(floor?.segments)&&floor?.scales&&typeof floor.scales==='object'
  ?doc:{...doc,floorplan:{version:1,objects:Array.isArray(floor?.objects)?floor.objects:[],segments:Array.isArray(floor?.segments)?floor.segments:[],scales:floor?.scales&&typeof floor.scales==='object'?floor.scales:{},wallHeights:floor?.wallHeights||{}}};
 const travellers=physicalTravellers(safe,result,minute),moving=new Set(travellers.map(a=>a.id));
 const standing=peopleAt(safe,result,minute).filter(a=>a.roomId===roomId&&!moving.has(a.id));
 const origin=siteRoomSpot(safe,roomId);const entering=travellers.filter(a=>a.roomId===roomId).map(a=>({...a,x:a.x-origin.x,y:a.y-origin.y}));
 return roomInteractionPlan(safe,standing.concat(entering).map(a=>({...a,x:clamp(Number(a.x)||0,.2,GRID.columns-.2),y:clamp(Number(a.y)||0,.2,GRID.rows-.2)})),roomId);
}
export function simulationRoomStatus(actors){return {
 clients:new Set(actors.filter(a=>a.kind==='client').map(a=>a.caseIndex)).size,
 staff:actors.filter(a=>a.kind==='staff').length,
 waiting:actors.filter(a=>a.kind==='client'&&a.status==='Na fila').length,
 serving:actors.filter(a=>a.kind==='client'&&a.status==='Em atendimento').length,
 blocked:actors.filter(a=>a.status?.includes('bloqueada')).length
}}
export function sceneGeometry(doc,roomId){
 const room=(doc.environments||[]).find(r=>r.id===roomId);
 return room?{room,objects:validFurniture(doc).filter(o=>o.roomId===roomId),edges:roomEdges(doc,roomId),height:wallSceneHeight(doc,roomId,cellMeters(doc,roomId))}:null;
}
export function initSimulation3D({container,onSelect,onUnavailable}){
 let THREE,renderer,scene,camera,world,actorsGroup,canvas,raycaster,mouse,ready=false,failed=false,active=false,loading=null;
 let roomId='',sceneKey='',actorModels=new Map(),frame=0,resizeObserver=null,pointer=null,lastFrame=0,playing=false;
 const view={yaw:.79,pitch:.87,zoom:1.08,targetX:6,targetZ:4,cutaway:true};
 function mat(color){return new THREE.MeshLambertMaterial({color})}
 function box(g,w,h,d,x,y,z,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);g.add(mesh);return mesh}
 function sphere(g,r,x,y,z,color){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,10,7),mat(color));mesh.position.set(x,y,z);g.add(mesh);return mesh}
 function cyl(g,r,h,x,y,z,color){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),mat(color));mesh.position.set(x,y,z);g.add(mesh);return mesh}
 function destroyGroup(group){if(!group)return;for(const c of [...group.children]){group.remove(c);c.traverse(obj=>{obj.geometry?.dispose();if(obj.material?.dispose){obj.material.dispose()}})}}
 function makeFurniture(g,obj){
  const [w,d]=furnitureDimensions(obj),root=new THREE.Group();root.position.set(obj.x+w/2,0,obj.y+d/2);root.rotation.y=obj.rotation===90?Math.PI/2:0;root.scale.set(obj.rotation===90?d/FURNITURE[obj.kind].w:w/FURNITURE[obj.kind].w,1,obj.rotation===90?w/FURNITURE[obj.kind].h:d/FURNITURE[obj.kind].h);g.add(root);
  // A footprint is canonical; simple geometry keeps rendering viable on integrated GPUs.
  const ww=FURNITURE[obj.kind].w*.85,dd=FURNITURE[obj.kind].h*.85;
  const wood='#b88d69',metal='#698e91',fabric='#9889b7';
  if(FURNITURE[obj.kind]?.visualOnly){
   // Static figurine, not a simulated client or professional.
   const shirt=obj.kind==='person_professional'?'#4570a1':obj.kind==='person_receptionist'?'#2786b3':'#8a8eb5';
   const seated=obj.kind==='person_client_seated';
   cyl(root,.20,seated?.4:.58,0,seated?.57:.80,0,shirt);
   sphere(root,.17,0,seated?1.05:1.24,0,'#dfb08f');
   box(root,.11,seated?.30:.54,.13,-.11,seated?.24:.29,0,'#52687d');
   box(root,.11,seated?.30:.54,.13,.11,seated?.24:.29,0,'#52687d');
   if(seated){box(root,.65,.15,.60,0,.40,0,'#899dac');box(root,.65,.53,.10,0,.67,-.3,'#899dac')}
  }
  else if(['reception_desk','clinic_desk','meeting_table','side_table','desk','station','table'].includes(obj.kind)){
   if(obj.kind==='table'){cyl(root,.7,.14,0,.76,0,wood);cyl(root,.14,.72,0,.37,0,'#785f4b')}
   else{box(root,ww,.13,dd,0,.78,0,wood);for(const x of [-ww*.42,ww*.42])for(const z of [-dd*.38,dd*.38])box(root,.08,.7,.08,x,.40,z,'#69594d');if(obj.kind==='station'){box(root,.55,.48,.08,0,1.08,-.3,'#405e68');box(root,.42,.30,.02,0,1.10,-.245,'#a4d8d9')}}
  }else if(obj.kind==='counter'){box(root,ww,.9,dd,0,.48,0,wood);box(root,ww,.13,dd+.07,0,1,0,'#ecd0a2')}
  else if(['waiting','bench','chair','stool'].includes(obj.kind)){box(root,ww,.22,dd*.83,0,.43,0,fabric);box(root,ww,.48,.17,0,.70,-dd*.38,'#8577a7');for(const x of [-ww*.4,ww*.4])box(root,.08,.45,.08,x,.22,0,metal)}
  else if(obj.kind==='exam'){box(root,ww,.23,dd*.87,0,.76,0,'#b7d1d6');box(root,.60,.12,dd*.6,-ww*.27,.95,0,'#eff7f5');for(const x of [-ww*.4,ww*.4])box(root,.10,.65,.10,x,.36,0,metal)}
  else if(obj.kind==='plant'){cyl(root,.3,.53,0,.3,0,'#b57f61');sphere(root,.41,0,1,0,'#5b9978');sphere(root,.29,.22,1.16,.1,'#78ad84')}
  else if(obj.kind==='door'){box(root,ww,.04,dd,0,.09,0,'#b5d6c6')}
  else if(obj.kind==='kiosk'){box(root,ww*.7,1.45,dd*.7,0,.78,0,metal);box(root,ww*.5,.49,.04,0,1.23,dd*.37,'#a6e0df')}
  else if(obj.kind==='shelf'){box(root,ww,1.4,dd*.8,0,.72,0,'#a38869');for(const h of [.36,.76,1.18])box(root,ww,.05,dd*.8,0,h,0,'#e3c4a0')}
  else if(obj.kind==='coffee'){box(root,ww*.7,1.04,dd*.7,0,.53,0,metal);cyl(root,.2,.33,0,1.21,-.03,'#c8e9ed')}
  else if(obj.kind==='screen'){box(root,ww,.7,.14,0,1.16,0,'#3e6570');box(root,ww*.87,.59,.03,0,1.16,.09,'#a8e0df');box(root,.09,.74,.10,0,.52,0,metal)}
  else{box(root,ww,.55,dd,0,.36,0,metal);box(root,ww*.65,.08,dd*.6,0,.7,0,'#d6e6e6')}
 }
 function makeWall(g,e,height){const open=e.type==='door',x=e.axis==='h'?e.x+.5:e.x,z=e.axis==='h'?e.y:e.y+.5;
  const showHeight=open?height*.26:(view.cutaway?Math.min(.75,height):height);
  if(e.axis==='h')box(g,1.01,showHeight,.09,x,showHeight/2,z,open?'#86b5ab':'#b6ccc4');
  else box(g,.09,showHeight,1.01,x,showHeight/2,z,open?'#86b5ab':'#b6ccc4');
  if(open){if(e.axis==='h')box(g,.11,Math.min(height,2.2),.09,x-.45,Math.min(height,2.2)/2,z,'#5f9d8c');else box(g,.09,Math.min(height,2.2),.11,x,Math.min(height,2.2)/2,z-.45,'#5f9d8c')}
 }
 function personModel(actor){
  const group=new THREE.Group();group.position.set(actor.x,0,actor.y);const upper=new THREE.Group();group.add(upper);
  const staff=actor.kind==='staff',queued=actor.status==='Na fila';
  const body=mat(staff?'#1a8c7a':queued?'#dbac68':'#597eac'),skin=mat('#e5b48d'),dark=mat('#294953');
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.16,.21,.48,9),body);torso.position.y=.74;upper.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.17,12,9),skin);head.position.y=1.12;upper.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.174,11,7),dark);hair.scale.y=.34;hair.position.y=1.24;upper.add(hair);
  const limbMat=mat(staff?'#294f5d':'#5b7185');
  const left=new THREE.Mesh(new THREE.BoxGeometry(.11,.39,.11),limbMat);left.position.set(-.1,.29,0);group.add(left);
  const right=left.clone();right.position.x=.1;group.add(right);
  const arm1=new THREE.Mesh(new THREE.BoxGeometry(.105,.32,.12),body);arm1.position.set(-.23,.74,0);upper.add(arm1);
  const arm2=arm1.clone();arm2.position.x=.23;upper.add(arm2);
  group.userData={actorId:actor.id,caseIndex:actor.caseIndex,nodeId:actor.nodeId,kind:actor.kind};
  group.traverse(child=>{child.userData.actorId=actor.id});
  return {group,left,right,arm1,arm2,from:{x:actor.x,y:actor.y},to:{x:actor.x,y:actor.y},began:performance.now(),status:actor.status,pose:actor.pose||'standing',upper,heading:0};
 }
 function updateActors(actors,instant=false){if(!actorsGroup)return;
  const ids=new Set(actors.map(a=>a.id));for(const [id,m] of actorModels)if(!ids.has(id)){actorsGroup.remove(m.group);destroyGroup(m.group);actorModels.delete(id)}
  const now=performance.now();for(const actor of actors){let model=actorModels.get(actor.id);
   if(!model){model=personModel(actor);actorModels.set(actor.id,model);actorsGroup.add(model.group)}
   const dist=Math.hypot(actor.x-model.to.x,actor.y-model.to.y);
   if(instant||dist>1.5){model.group.position.set(actor.x,0,actor.y);model.from={x:actor.x,y:actor.y}}
   else model.from={x:model.group.position.x,y:model.group.position.z};
   model.to={x:actor.x,y:actor.y};model.began=now;model.status=actor.status;model.pose=actor.pose||'standing';
   if(dist>.08)model.heading=Math.atan2(actor.x-model.from.x,actor.y-model.from.y);
   model.group.userData.nodeId=actor.nodeId;model.group.userData.kind=actor.kind;model.group.traverse(o=>{o.userData.actorId=actor.id});
  }
  if(active)requestFrame();
 }
 function updateCamera(){if(!camera||!container)return;const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),span=14/view.zoom,aspect=w/h;
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  const rad=19,c=Math.cos(view.pitch);camera.position.set(view.targetX+rad*c*Math.sin(view.yaw),rad*Math.sin(view.pitch),view.targetZ+rad*c*Math.cos(view.yaw));camera.lookAt(view.targetX,.25,view.targetZ)}
 function draw(now=performance.now()){
  frame=0;if(!active||!ready)return;
  updateCamera();let moving=false;
  for(const m of actorModels.values()){
   const elapsed=(now-m.began)/320,t=clamp(elapsed,0,1),e=t*t*(3-2*t);
   m.group.position.x=m.from.x+(m.to.x-m.from.x)*e;m.group.position.z=m.from.y+(m.to.y-m.from.y)*e;
   const isMoving=elapsed<1&&Math.hypot(m.to.x-m.from.x,m.to.y-m.from.y)>.025;
   moving ||=isMoving;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const gait=isMoving&&!reduced?Math.sin(now/95)*.24:0;
   const seated=m.pose==='seated',reclined=m.pose==='reclining',working=m.pose==='working';
   m.upper.position.y=seated?-.21:reclined?-.30:0;
   m.upper.rotation.x=reclined?-.6:0;
   m.left.position.z=seated?.13:0;m.right.position.z=seated?.13:0;
   m.left.rotation.x=seated?-1.07:gait;m.right.rotation.x=seated?-1.07:-gait;
   const gesture=working&&!reduced?Math.sin(now/440)*.10:0;
   m.arm1.rotation.x=working?-.45+gesture:-gait*.65;
   m.arm2.rotation.x=working?-.5-gesture:gait*.65;
   if(isMoving)m.group.rotation.y=m.heading;
  }
  renderer.render(scene,camera);if(moving||playing)requestFrame();lastFrame=now;
 }
 function requestFrame(){if(!frame&&active&&ready)frame=requestAnimationFrame(draw)}
 function buildWorld(doc,id){const spec=sceneGeometry(doc,id);if(!spec)return;
  destroyGroup(world);destroyGroup(actorsGroup);actorModels.clear();actorsGroup=new THREE.Group();
  const tile=new THREE.Color(spec.room.color||'#68a997').lerp(new THREE.Color('#f7fbf7'),.91);
  box(world,12,.13,8,6,-.10,4,tile);
  for(let x=0;x<=GRID.columns;x++)box(world,.014,.009,8,x,-.02,4,'#c4ded2');
  for(let z=0;z<=GRID.rows;z++)box(world,12,.009,.014,6,-.02,z,'#c4ded2');
  for(const e of spec.edges)makeWall(world,e,spec.height);
  for(const o of spec.objects)makeFurniture(world,o);
  world.add(actorsGroup);roomId=id;requestFrame();
 }
 function resize(){if(!ready||!container.clientWidth)return;renderer.setSize(Math.max(200,container.clientWidth),Math.max(200,container.clientHeight),false);requestFrame()}
 async function start(){if(ready||failed)return ready;if(loading)return loading;
  loading=(async()=>{try{
   THREE=await import('../vendor/three/three.module.min.js');
   renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0xeaf2ec);
   canvas=renderer.domElement;canvas.className='sim3d-canvas';canvas.setAttribute('aria-label','Simulação 3D: arraste para girar, use a roda do mouse para aproximar e clique em um personagem para inspecionar.');canvas.tabIndex=0;container.appendChild(canvas);
   scene=new THREE.Scene();scene.background=new THREE.Color('#e9f2ed');scene.add(new THREE.HemisphereLight('#ffffff','#b0c7bf',2.05));
   const sun=new THREE.DirectionalLight('#ffffff',1.3);sun.position.set(-5,18,8);scene.add(sun);
   camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);world=new THREE.Group();scene.add(world);
   raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();
   canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch,moved:false};canvas.setPointerCapture(e.pointerId)});
   canvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>5)pointer.moved=true;
    if(pointer.moved){view.yaw=pointer.yaw+dx*.008;view.pitch=clamp(pointer.pitch+dy*.006,.2,1.52);requestFrame()}});
   canvas.addEventListener('pointerup',e=>{if(!pointer)return;const p=pointer;pointer=null;if(p.moved)return;
    const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*2-1;mouse.y=1-(e.clientY-r.top)/r.height*2;
    raycaster.setFromCamera(mouse,camera);const matches=raycaster.intersectObjects(actorsGroup.children,true);
    for(const hit of matches){let obj=hit.object;while(obj&&!obj.userData?.actorId)obj=obj.parent;
     const model=obj&&actorModels.get(obj.userData.actorId);if(model){onSelect?.({caseIndex:Number(model.group.userData.caseIndex),nodeId:model.group.userData.nodeId,kind:model.group.userData.kind});break}}
   });
   canvas.addEventListener('pointercancel',()=>pointer=null);
   canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoom=clamp(view.zoom*(e.deltaY>0?.91:1.1),.65,2.8);requestFrame()},{passive:false});
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;active=false;onUnavailable?.('O contexto gráfico 3D foi perdido. Visualização 2D ativada.')});
   resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);ready=true;resize();return true;
  }catch(error){failed=true;console.warn('Simulação 3D indisponível:',error);renderer?.dispose();canvas?.remove();onUnavailable?.('WebGL indisponível. Você pode continuar a simulação em 2D.');return false}})();return loading;
 }
 let lastDoc=null,lastResult=null,lastMinute=0,lastRoomId=null;
 async function update(doc,result,minute,id,options={}){
  lastDoc=doc;lastResult=result;lastMinute=minute;lastRoomId=id;playing=!!options.playing;
  if(!active||!id)return false;
  if(!(await start())||!active)return false;
  const key=`${doc.updatedAt||''}|${id}|${view.cutaway}`;
  if(key!==sceneKey){sceneKey=key;buildWorld(doc,id)}
  const rows=simulationRoomActors(doc,result,minute,id);
  updateActors(rows,options.instant);
  return true;
 }
 return {
  async show(){active=true;return lastDoc?update(lastDoc,lastResult,lastMinute,lastRoomId,{instant:true}):start()},
  hide(){active=false;playing=false;if(frame)cancelAnimationFrame(frame);frame=0},
  update,reset(){sceneKey=''},
  control(action){if(action==='left')view.yaw-=Math.PI/4;if(action==='right')view.yaw+=Math.PI/4;if(action==='top'){view.pitch=1.52;view.yaw=0}if(action==='iso'){view.pitch=.87;view.yaw=.79}if(action==='plus')view.zoom=clamp(view.zoom*1.18,.65,2.8);if(action==='minus')view.zoom=clamp(view.zoom/1.18,.65,2.8);if(action==='fit'){view.yaw=.79;view.pitch=.87;view.zoom=1.08;view.targetX=6;view.targetZ=4}if(action==='walls'){view.cutaway=!view.cutaway;sceneKey='';if(lastDoc&&ready)buildWorld(lastDoc,lastRoomId);return view.cutaway}requestFrame();return view.cutaway},
  dispose(){active=false;playing=false;if(frame)cancelAnimationFrame(frame);resizeObserver?.disconnect();destroyGroup(world);renderer?.dispose();canvas?.remove();ready=false},
  get available(){return ready&&!failed},get unavailable(){return failed}
 };
}
