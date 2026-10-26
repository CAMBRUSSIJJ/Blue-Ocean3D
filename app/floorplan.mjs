/** Layout 2D independente da lógica temporal: móveis são dados visuais, não alteram duração/capacidade. */
import {roomById} from './environments.mjs';
import {findRoute,bestEntranceRoute,sampleRoute,nearestWalkable,objectCrossesStructure} from './floorplan-navigation.mjs';
export const GRID={columns:12,rows:8};
export const FURNITURE={
 counter:{name:'Balcão',icon:'▰',w:3,h:1,category:'Atendimento'},
 desk:{name:'Mesa de atendimento',icon:'▤',w:2,h:2,category:'Atendimento'},
 station:{name:'Estação de trabalho',icon:'▣',w:2,h:2,category:'Atendimento'},
 waiting:{name:'Sofá de espera',icon:'▥',w:3,h:1,category:'Espera'},
 chair:{name:'Cadeira',icon:'●',w:1,h:1,category:'Espera'},
 kiosk:{name:'Totem de autoatendimento',icon:'▥',w:1,h:2,category:'Equipamentos'},
 shelf:{name:'Armário',icon:'▥',w:2,h:1,category:'Equipamentos'},
 plant:{name:'Planta',icon:'✿',w:1,h:1,category:'Decoração'},
 bench:{name:'Banco de espera',icon:'▥',w:3,h:1,category:'Espera'},
 table:{name:'Mesa redonda',icon:'◉',w:2,h:2,category:'Atendimento'},
 printer:{name:'Impressora',icon:'▣',w:1,h:1,category:'Equipamentos'},
 coffee:{name:'Café e água',icon:'☕',w:1,h:1,category:'Equipamentos'},
 exam:{name:'Maca de exame',icon:'▰',w:3,h:1,category:'Atendimento'},
 screen:{name:'Painel informativo',icon:'▤',w:2,h:1,category:'Equipamentos'},
 stool:{name:'Banqueta',icon:'●',w:1,h:1,category:'Espera'},
 door:{name:'Entrada / saída',icon:'↪',w:2,h:1,category:'Circulação'}
};
const uid=()=>globalThis.crypto?.randomUUID?.()||`prop-${Math.random().toString(36).slice(2)}`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function ensureFloorplan(doc){
 if(!doc.floorplan||typeof doc.floorplan!=='object'||Array.isArray(doc.floorplan))doc.floorplan={version:1,objects:[]};
 if(!Array.isArray(doc.floorplan.objects))doc.floorplan.objects=[];
 if(!Array.isArray(doc.floorplan.segments))doc.floorplan.segments=[];
 if(!doc.floorplan.scales||typeof doc.floorplan.scales!=='object'||Array.isArray(doc.floorplan.scales))doc.floorplan.scales={};
 return doc.floorplan;
}
export function furnitureDimensions(obj){
 const spec=FURNITURE[obj.kind];if(!spec)throw Error('Objeto não reconhecido.');
 // Dimensões personalizadas são medidas exibidas na planta (em células).
 if(Number.isInteger(obj.width)&&obj.width>=1&&obj.width<=GRID.columns&&Number.isInteger(obj.height)&&obj.height>=1&&obj.height<=GRID.rows)return [obj.width,obj.height];
 return obj.rotation===90?[spec.h,spec.w]:[spec.w,spec.h];
}
export function resizeFurniture(doc,id,width,height){
 const o=ensureFloorplan(doc).objects.find(o=>o.id===id);if(!o)throw Error('Objeto não encontrado.');
 const w=Number(width),h=Number(height);
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>GRID.columns||h>GRID.rows)throw Error('Informe largura e profundidade em células inteiras dentro da malha.');
 const next={...o,width:w,height:h};
 if(o.x+w>GRID.columns||o.y+h>GRID.rows)throw Error('O objeto ultrapassa os limites do ambiente.');
 if(ensureFloorplan(doc).objects.some(other=>other.id!==id&&other.roomId===o.roomId&&occupied(other,next)))throw Error('A dimensão escolhida sobrepõe outro móvel.');
 if(objectCrossesStructure(doc,next))throw Error('A dimensão escolhida atravessa uma parede ou porta.');
 o.width=w;o.height=h;return o;
}

export function occupied(a,b){const [aw,ah]=furnitureDimensions(a),[bw,bh]=furnitureDimensions(b);return a.x<b.x+bw && a.x+aw>b.x && a.y<b.y+bh && a.y+ah>b.y}
function validateRoom(doc,roomId){if(!roomById(doc,roomId))throw Error('Escolha um ambiente existente.');}
function normalizeSpot(obj,x,y,rotation=obj.rotation){const dim=furnitureDimensions({...obj,rotation});return {x:clamp(Math.round(Number(x)||0),0,GRID.columns-dim[0]),y:clamp(Math.round(Number(y)||0),0,GRID.rows-dim[1]),rotation};}
export function putFurniture(doc,{roomId,kind,x=1,y=1,nodeId='',rotation=0,width,height}){
 validateRoom(doc,roomId);if(!FURNITURE[kind])throw Error('Móvel desconhecido.');
 if(nodeId&&!doc.nodes.some(n=>n.id===nodeId&&n.environmentId===roomId))throw Error('Vincule uma atividade deste ambiente.');
 const layout=ensureFloorplan(doc),candidate={id:uid(),roomId,kind,nodeId,x:0,y:0,rotation:rotation===90?90:0};
 if(width!==undefined||height!==undefined){const base=furnitureDimensions(candidate);const w=Number(width??base[0]),h=Number(height??base[1]);if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>GRID.columns||h>GRID.rows)throw Error('Dimensões de móvel inválidas.');candidate.width=w;candidate.height=h;}
 Object.assign(candidate,normalizeSpot(candidate,x,y));
 if(layout.objects.some(x=>x.roomId===roomId&&occupied(x,candidate)))throw Error('Esse espaço já está ocupado.');
 if(objectCrossesStructure(doc,candidate))throw Error('O móvel não pode atravessar uma parede ou porta.');
 layout.objects.push(candidate);return candidate;
}
export function moveFurniture(doc,id,x,y){const layout=ensureFloorplan(doc),o=layout.objects.find(o=>o.id===id);if(!o)throw Error('Objeto não encontrado.');const next={...o,...normalizeSpot(o,x,y)};
 if(layout.objects.some(other=>other.id!==id&&other.roomId===o.roomId&&occupied(other,next)))throw Error('Posição ocupada.');
 if(objectCrossesStructure(doc,next))throw Error('O móvel não pode atravessar uma parede ou porta.');
 Object.assign(o,{x:next.x,y:next.y});return o;
}
export function rotateFurniture(doc,id){const layout=ensureFloorplan(doc),o=layout.objects.find(o=>o.id===id);if(!o)throw Error('Objeto não encontrado.');const custom=Number.isInteger(o.width)&&Number.isInteger(o.height);const next={...o,...(custom?{width:o.height,height:o.width}:{}),...normalizeSpot(o,o.x,o.y,o.rotation===90?0:90)};if(custom&&(o.x+furnitureDimensions(next)[0]>GRID.columns||o.y+furnitureDimensions(next)[1]>GRID.rows))throw Error('Sem espaço para girar este móvel.');
 if(layout.objects.some(other=>other.id!==id&&other.roomId===o.roomId&&occupied(other,next)))throw Error('Sem espaço para girar este móvel.');
 if(objectCrossesStructure(doc,next))throw Error('O móvel não pode atravessar uma parede ou porta.');
 Object.assign(o,{x:next.x,y:next.y,rotation:next.rotation,...(custom?{width:next.width,height:next.height}:{})});return o;
}
export function removeFurniture(doc,id){const layout=ensureFloorplan(doc);const count=layout.objects.length;layout.objects=layout.objects.filter(o=>o.id!==id);return count!==layout.objects.length;}
export function linkFurniture(doc,id,nodeId=''){
 const object=ensureFloorplan(doc).objects.find(o=>o.id===id);if(!object)throw Error('Móvel não encontrado.');
 if(nodeId&&!doc.nodes.some(n=>n.id===nodeId&&n.environmentId===object.roomId))throw Error('A atividade deve pertencer ao mesmo ambiente.');
 object.nodeId=nodeId;return object;
}
export function reconcileFloorplan(doc){
 const layout=ensureFloorplan(doc),rooms=new Set((doc.environments||[]).map(r=>r.id));
 layout.segments=layout.segments.filter(s=>rooms.has(s.roomId)&&['v','h'].includes(s.axis)&&['wall','open','door'].includes(s.type)&&Number.isInteger(s.x)&&Number.isInteger(s.y)&&s.x>=0&&s.y>=0&&s.x+(s.axis==='h'?1:0)<=GRID.columns&&s.y+(s.axis==='v'?1:0)<=GRID.rows);
 for(const id of Object.keys(layout.scales))if(!rooms.has(id))delete layout.scales[id];
 if(layout.roomPositions&&typeof layout.roomPositions==='object')for(const id of Object.keys(layout.roomPositions))if(!rooms.has(id))delete layout.roomPositions[id];
 if(layout.wallHeights&&typeof layout.wallHeights==='object')for(const id of Object.keys(layout.wallHeights))if(!rooms.has(id))delete layout.wallHeights[id];
 // Corridors v2.1: only valid integer cells outside all existing rooms; deduplicate imported data.
 if(!Array.isArray(layout.corridors))layout.corridors=[];
 const existingRooms=(doc.environments||[]).map((r,i)=>{
   const saved=layout.roomPositions?.[r.id];const pos=saved&&Number.isInteger(saved.x)&&Number.isInteger(saved.y)&&saved.x>=0&&saved.y>=0&&saved.x<200&&saved.y<200?saved:{x:(i%3)*14,y:Math.floor(i/3)*10};return pos;
 });
 const uniqueCorridors=new Set();layout.corridors=layout.corridors.filter(c=>{
  if(!c||!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<0||c.y<0||c.x>=200||c.y>=200)return false;
  if(existingRooms.some(p=>c.x>=p.x&&c.x<p.x+GRID.columns&&c.y>=p.y&&c.y<p.y+GRID.rows))return false;
  const k=c.x+':'+c.y;if(uniqueCorridors.has(k)||uniqueCorridors.size>=10000)return false;uniqueCorridors.add(k);return true;
 });
 layout.objects=layout.objects.filter(o=>rooms.has(o.roomId)&&FURNITURE[o.kind]&&Number.isInteger(o.x)&&Number.isInteger(o.y));
 for(const o of layout.objects){if(!Number.isInteger(o.width)||o.width<1||o.width>GRID.columns||!Number.isInteger(o.height)||o.height<1||o.height>GRID.rows){delete o.width;delete o.height;}}
 for(const o of layout.objects)if(o.nodeId&&!doc.nodes.some(n=>n.id===o.nodeId&&n.environmentId===o.roomId))o.nodeId='';
 return layout;
}
export function validFurniture(doc){const rooms=new Set((doc.environments||[]).map(r=>r.id));return ensureFloorplan(doc).objects.filter(o=>rooms.has(o.roomId)&&FURNITURE[o.kind]&&Number.isInteger(o.x)&&Number.isInteger(o.y));}
export function autoFurnish(doc,roomId=null){
 const existing=ensureFloorplan(doc).objects;let added=0;
 for(const room of (doc.environments||[]).filter(r=>!roomId||r.id===roomId)){
  const members=doc.nodes.filter(n=>n.environmentId===room.id&&['activity','decision'].includes(n.type));
  const assigned=new Set(existing.filter(o=>o.roomId===room.id).map(o=>o.nodeId).filter(Boolean));
  const placements=[{x:1,y:1},{x:5,y:1},{x:9,y:1},{x:1,y:4},{x:5,y:4},{x:9,y:4}];
  for(const node of members.filter(n=>!assigned.has(n.id))){
   let done=false;
   for(const spot of placements){try{putFurniture(doc,{roomId:room.id,kind:'desk',...spot,nodeId:node.id});added++;done=true;break}catch{}}
   if(!done)break;
  }
  if(!existing.some(o=>o.roomId===room.id&&o.kind==='waiting')){
   for(const spot of [{x:1,y:6},{x:5,y:6},{x:8,y:6}])try{putFurniture(doc,{roomId:room.id,kind:'waiting',...spot});added++;break}catch{}
  }
  if(!existing.some(o=>o.roomId===room.id&&o.kind==='plant')){
   for(const spot of [{x:11,y:6},{x:0,y:6},{x:11,y:0}])try{putFurniture(doc,{roomId:room.id,kind:'plant',...spot});added++;break}catch{}
  }
 }
 return added;
}
// Todas as posições abaixo são coordenadas conceituais de um mapa 12×8; não há cálculo de colisão de pessoas ou distância em metros.
export function anchorFor(doc,nodeId,roomId=undefined){
 const node=doc.nodes.find(n=>n.id===nodeId);
 const id=roomId??node?.environmentId;
 const list=validFurniture(doc).filter(o=>o.roomId===id);
 const exact=list.find(o=>o.nodeId===nodeId);
 const nearest=exact||list.find(o=>['desk','counter','station','kiosk'].includes(o.kind))||list[0];
 if(!nearest)return {x:GRID.columns/2,y:GRID.rows/2};
 const [w,h]=furnitureDimensions(nearest);
 return {x:nearest.x+w/2,y:nearest.y+h/2};
}
function queueAnchor(doc,roomId,order=0){const l=validFurniture(doc).find(o=>o.roomId===roomId&&o.kind==='waiting');return l?{x:clamp(l.x+0.45+(order%4)*0.55,0.4,11.6),y:clamp(l.y-.35+Math.floor(order/4)*.6,.5,6.55)}:{x:1+(order%4)*.67,y:6+Math.floor(order/4)*.5};}
export function peopleAt(doc,result,minute){
 if(!result)return [];
 const t=Math.max(0,Number(minute)||0),rows=[];
 const eventsByCase=new Map();for(const e of result.events){if(!eventsByCase.has(e.caseIndex))eventsByCase.set(e.caseIndex,[]);eventsByCase.get(e.caseIndex).push(e)}
 for(const c of result.byCase){
  if(t<c.arrival||t>c.end+.25)continue;
  const events=(eventsByCase.get(c.caseIndex)||[]).filter(e=>e.task).sort((a,b)=>a.start-b.start||a.end-b.end);
  if(!events.length)continue;
  const current=events.find(e=>e.start<=t&&t<e.end),waiting=events.find(e=>e.readyAt<=t&&t<e.start);
  const future=events.find(e=>e.start>t),past=[...events].filter(e=>e.end<=t).sort((a,b)=>b.end-a.end)[0];
  const focus=current||waiting||future||past;
  if(!focus)continue;
  const roomId=focus.environmentId||(doc.environments||[])[0]?.id;
  if(!roomId)continue;
  const anchor=current?anchorFor(doc,current.nodeId,roomId):waiting?queueAnchor(doc,roomId,c.caseIndex-1):future?queueAnchor(doc,roomId,c.caseIndex-1):anchorFor(doc,past.nodeId,roomId);
  let pos=nearestWalkable(doc,roomId,anchor);
  pos=pos?{x:pos.x+.5,y:pos.y+.5}:{x:GRID.columns/2,y:GRID.rows/2};
  let navigationWarning=false;
  // Caminho visual pela malha transitável. O percurso NÃO altera chegada, duração ou filas.
  if(current&&current.start<=t&&t<current.start+1){
   const p=(t-current.start)/Math.max(.01,Math.min(1,current.duration||1));
   const prevRoom=past?.environmentId,prev=prevRoom?anchorFor(doc,past.nodeId,prevRoom):null;
   if(prevRoom===roomId&&prev){
    const path=findRoute(doc,roomId,prev,anchor);
    if(path)pos=sampleRoute(path,p);else navigationWarning=true;
   }else{
    const entry=bestEntranceRoute(doc,roomId,anchor);
    if(prevRoom&&prevRoom!==roomId&&p<.4){
     const leaving=bestEntranceRoute(doc,prevRoom,prev);
     if(leaving){const loc=sampleRoute([...leaving].reverse(),p/.4);rows.push({id:`client-${c.caseIndex}`,kind:'client',caseIndex:c.caseIndex,nodeId:current.nodeId,roomId:prevRoom,...loc,status:'Caminhando'});continue;}
     navigationWarning=true;
    }
    if(entry)pos=sampleRoute(entry,prevRoom&&prevRoom!==roomId?(p-.4)/.6:p);else navigationWarning=true;
   }
  }
  const status=current?'Em atendimento':waiting?'Na fila':future?'Aguardando próxima etapa':'Concluído';
  rows.push({id:`client-${c.caseIndex}`,kind:'client',caseIndex:c.caseIndex,nodeId:focus.nodeId,roomId,x:pos.x,y:pos.y,status:navigationWarning?'Rota bloqueada (visual)':status});
 }
 // Profissionais são representações visuais das atividades executadas: capacidade é controlada apenas pelo motor operacional.
 const active=result.events.filter(e=>e.task&&e.start<=t&&t<e.end&&e.environmentId);
 const seen=new Map();
 for(const e of active){
  const k=`${e.environmentId}|${e.team}`,number=seen.get(k)||0;seen.set(k,number+1);
  const original=anchorFor(doc,e.nodeId,e.environmentId);const free=nearestWalkable(doc,e.environmentId,original);const p=free?{x:free.x+.5,y:free.y+.5}:original;
  rows.push({id:`staff-${e.caseIndex}-${e.nodeId}`,kind:'staff',caseIndex:e.caseIndex,nodeId:e.nodeId,roomId:e.environmentId,x:clamp(p.x+.7+number*.27,.3,11.7),y:clamp(p.y-.6,.3,7.7),status:`${e.team} · ${e.title}`});
 }
 return rows;
}
