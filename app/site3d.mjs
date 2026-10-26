/** v2.2 — Vista geral isométrica leve, exclusivamente apresentação.
 * Utiliza a mesma topologia/células da planta 2D; WebGL opcional.
 */
import {GRID,validFurniture,furnitureDimensions} from './floorplan.mjs';
import {roomEdges} from './floorplan-navigation.mjs';
import {siteRoomSpot,corridors,sampleSiteRoute} from './site-routing.mjs';
export function createSite3D(container,{onUnavailable}={}){
 let THREE,renderer,scene,camera,staticWorld,peopleWorld,observer,canvas,ready=false,failed=false,shown=false,loading=null,lastKey='';
 let bounds={cx:18,cz:12,size:40};const view={yaw:.8,pitch:.78,zoom:1},pointer={active:false};
 const peopleModels=new Map();let animation=0;
 function fit(){if(!renderer||!shown)return;const w=Math.max(280,container.clientWidth),h=Math.max(250,container.clientHeight),size=bounds.size/view.zoom,aspect=w/h;
   camera.left=-size*aspect/2;camera.right=size*aspect/2;camera.top=size/2;camera.bottom=-size/2;
   camera.position.set(bounds.cx+size*Math.cos(view.yaw)*Math.cos(view.pitch),size*Math.sin(view.pitch),bounds.cz+size*Math.sin(view.yaw)*Math.cos(view.pitch));
   camera.lookAt(bounds.cx,0,bounds.cz);camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.render(scene,camera);
 }
 function material(color){return new THREE.MeshLambertMaterial({color})}
 function cube(group,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);group.add(mesh);return mesh}
 function release(group){for(const obj of [...group.children]){obj.traverse(part=>{part.geometry?.dispose();const m=part.material;if(Array.isArray(m))m.forEach(x=>x.dispose?.());else m?.dispose?.()});group.remove(obj)}}
 async function start(){if(failed)return false;if(ready)return true;if(loading)return loading;
  loading=(async()=>{try{THREE=await import('../vendor/three/three.module.min.js');renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
   canvas=renderer.domElement;canvas.className='sim22-overview-canvas';canvas.setAttribute('aria-label','Planta geral em 3D: arraste para girar e use a roda para aproximar');container.appendChild(canvas);
   scene=new THREE.Scene();scene.background=new THREE.Color('#e8f2ed');camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,500);
   scene.add(new THREE.HemisphereLight('#ffffff','#c3dfcf',2));const light=new THREE.DirectionalLight('#ffffff',1.2);light.position.set(-10,35,20);scene.add(light);
   staticWorld=new THREE.Group();peopleWorld=new THREE.Group();scene.add(staticWorld,peopleWorld);
   canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer.active=true;pointer.x=e.clientX;pointer.y=e.clientY;pointer.yaw=view.yaw;pointer.pitch=view.pitch;canvas.setPointerCapture(e.pointerId)});
   canvas.addEventListener('pointermove',e=>{if(!pointer.active)return;view.yaw=pointer.yaw+(e.clientX-pointer.x)*.008;view.pitch=Math.max(.24,Math.min(1.4,pointer.pitch+(e.clientY-pointer.y)*.006));fit()});
   canvas.addEventListener('pointerup',()=>pointer.active=false);canvas.addEventListener('pointercancel',()=>pointer.active=false);
   canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoom=Math.max(.6,Math.min(3,view.zoom*(e.deltaY>0?.9:1.1)));fit()},{passive:false});
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;shown=false;stopFrames();onUnavailable?.('WebGL indisponível para a planta geral. Continue em 2D.')});
   observer=new ResizeObserver(fit);observer.observe(container);ready=true;return true;
  }catch(err){failed=true;renderer?.dispose();canvas?.remove();onUnavailable?.('Não foi possível abrir a planta geral em 3D. O mapa 2D continua disponível.');return false}})();return loading;
 }
 function build(doc){release(staticWorld);const rooms=doc.environments||[],halls=corridors(doc);
  const minX=Math.min(0,...rooms.map(r=>siteRoomSpot(doc,r.id).x)),minY=Math.min(0,...rooms.map(r=>siteRoomSpot(doc,r.id).y));
  const maxX=Math.max(20,...rooms.map(r=>siteRoomSpot(doc,r.id).x+GRID.columns),...halls.map(h=>h.x+1));
  const maxZ=Math.max(15,...rooms.map(r=>siteRoomSpot(doc,r.id).y+GRID.rows),...halls.map(h=>h.y+1));
  bounds={cx:(maxX+minX)/2,cz:(maxZ+minY)/2,size:Math.max(20,maxZ-minY+8,(maxX-minX)/1.65+7)};
  cube(staticWorld,bounds.cx,-.2,bounds.cz,maxX-minX+8,.25,maxZ-minY+8,'#dce9e1');
  for(const h of halls)cube(staticWorld,h.x+.5,.005,h.y+.5,.96,.09,.96,'#d0ab76');
  for(const room of rooms){const spot=siteRoomSpot(doc,room.id);cube(staticWorld,spot.x+GRID.columns/2,.035,spot.y+GRID.rows/2,GRID.columns,.14,GRID.rows,'#f7faf6');
    for(const edge of roomEdges(doc,room.id)){
      const x=spot.x+edge.x+(edge.axis==='h'?.5:0),z=spot.y+edge.y+(edge.axis==='v'?.5:0);
      const height=edge.type==='door'?.34:.9;
      cube(staticWorld,x,height/2+.1,z,edge.axis==='h'?1.01:.1,height,edge.axis==='v'?1.01:.1,edge.type==='door'?'#2da789':'#92b6a7');
    }
  }
  for(const o of validFurniture(doc)){const spot=siteRoomSpot(doc,o.roomId);if(!spot)continue;const [w,d]=furnitureDimensions(o);cube(staticWorld,spot.x+o.x+w/2,.36,spot.y+o.y+d/2,w*.88,.55,d*.88,'#a28c77')}
 }
 function makePerson(actor){
   const group=new THREE.Group();group.position.set(actor.x,0,actor.y);peopleWorld.add(group);
   const staff=actor.kind==='staff';const color=staff?'#188e79':actor.pose==='walking'?'#db9a45':'#5d83b1';
   const upper=new THREE.Group();group.add(upper);
   const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.46,8),material(color));body.position.y=.66;upper.add(body);
   const head=new THREE.Mesh(new THREE.SphereGeometry(.16,8,7),material('#e2ae90'));head.position.y=1.03;upper.add(head);
   const hair=new THREE.Mesh(new THREE.SphereGeometry(.167,8,6),material('#49615d'));hair.scale.y=.28;hair.position.y=1.16;upper.add(hair);
   const left=cube(group,-.11,.22,0,.1,.36,.12,'#536779');const right=cube(group,.11,.22,0,.1,.36,.12,'#536779');
   const armLeft=cube(upper,-.22,.65,.02,.1,.28,.1,color),armRight=cube(upper,.22,.65,.02,.1,.28,.1,color);
   return {group,upper,left,right,armLeft,armRight,pose:actor.pose,from:{x:actor.x,y:actor.y},to:{x:actor.x,y:actor.y},started:performance.now(),heading:0,route:actor.route||null,fromProgress:actor.progress??0,toProgress:actor.progress??0,currentProgress:actor.progress??0};
 }
 function actorsDraw(actors){const now=performance.now(),activeIds=new Set(actors.map(a=>a.id));
   for(const [id,model] of peopleModels){if(!activeIds.has(id)){releasePerson(model);peopleModels.delete(id)}}
   for(const actor of actors){if(!Number.isFinite(actor.x)||!Number.isFinite(actor.y))continue;
     let model=peopleModels.get(actor.id);if(!model){model=makePerson(actor);peopleModels.set(actor.id,model)}
     model.from={x:model.group.position.x,y:model.group.position.z};model.to={x:actor.x,y:actor.y};model.started=now;model.pose=actor.pose;
     if(actor.route?.length>1&&Number.isFinite(actor.progress)){
       const old=model.route,matching=old?.length===actor.route.length&&old[0]?.x===actor.route[0]?.x&&old[0]?.y===actor.route[0]?.y&&old.at(-1)?.x===actor.route.at(-1)?.x&&old.at(-1)?.y===actor.route.at(-1)?.y;
       model.fromProgress=matching?model.currentProgress:actor.progress;model.toProgress=actor.progress;model.route=actor.route;
     }else{model.route=null;model.fromProgress=0;model.toProgress=0;model.currentProgress=0;}
     const dx=model.to.x-model.from.x,dy=model.to.y-model.from.y;
     if(Math.hypot(dx,dy)>.03)model.heading=Math.atan2(dx,dy);
   }
   beginFrames();
 }
 function releasePerson(model){model.group.traverse(part=>{part.geometry?.dispose();part.material?.dispose?.()});peopleWorld.remove(model.group)}
 function stopFrames(){if(animation)cancelAnimationFrame(animation);animation=0}
 function beginFrames(){if(shown&&ready&&!animation)animation=requestAnimationFrame(tick)}
 function tick(now){animation=0;if(!shown||!ready)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   let moving=false,working=false;
   for(const model of peopleModels.values()){
     const delta=Math.hypot(model.to.x-model.from.x,model.to.y-model.from.y),f=reduced?1:Math.min(1,(now-model.started)/440),ease=f*f*(3-2*f);
     const routePosition=model.route&&model.pose==='walking'?sampleSiteRoute(model.route,model.fromProgress+(model.toProgress-model.fromProgress)*ease):null;
     model.currentProgress=model.fromProgress+(model.toProgress-model.fromProgress)*ease;
     model.group.position.set(routePosition?.x??model.from.x+(model.to.x-model.from.x)*ease,0,routePosition?.y??model.from.y+(model.to.y-model.from.y)*ease);
     const gait=delta>.02&&f<1&&!reduced?Math.sin(now/95)*.21:0;
     const seated=model.pose==='seated',reclined=model.pose==='reclining';
     model.upper.position.y=seated?-.21:reclined?-.3:0;
     model.upper.rotation.x=reclined?-.55:0;
     model.left.rotation.x=seated?-1.05:gait;model.right.rotation.x=seated?-1.05:-gait;
     model.left.position.z=seated?.14:0;model.right.position.z=seated?.14:0;
     const gesture=model.pose==='working'&&!reduced?Math.sin(now/390)*.12:0;
     model.armLeft.rotation.x=model.pose==='working'?-.38+gesture:-gait*.6;
     model.armRight.rotation.x=model.pose==='working'?-.38-gesture:gait*.6;
     if(delta>.02)model.group.rotation.y=model.heading;
     moving||=f<1&&delta>.02;working||=model.pose==='working';
   }
   renderer.render(scene,camera);
   if(moving||working&&!reduced)animation=requestAnimationFrame(tick);
 }

 return {async show(doc,actors){shown=true;if(!await start()){shown=false;return false;}this.update(doc,actors);return true},
  update(doc,actors){if(!ready||!shown)return;const key=doc.id+'|'+doc.updatedAt;
   if(key!==lastKey){build(doc);lastKey=key;}actorsDraw(actors);fit()},
  hide(){shown=false;stopFrames()},get unavailable(){return failed},
  dispose(){shown=false;stopFrames();observer?.disconnect();for(const m of peopleModels.values())releasePerson(m);peopleModels.clear();if(staticWorld)release(staticWorld);if(peopleWorld)release(peopleWorld);renderer?.dispose();canvas?.remove();ready=false}
 };
}
