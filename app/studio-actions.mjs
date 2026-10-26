/** v1.8 — Ações puras para edição precisa no estúdio (2D e 3D).
 * As dimensões continuam em células; os tempos operacionais não são alterados.
 */
import {GRID,validFurniture,furnitureDimensions,occupied,putFurniture,moveFurniture} from './floorplan.mjs';
import {objectIntersectsSegment,objectCrossesStructure,setEdge} from './floorplan-navigation.mjs';

export function duplicateFurniture(doc,id){
 const source=validFurniture(doc).find(o=>o.id===id);
 if(!source)throw Error('Selecione um móvel para duplicar.');
 const [w,h]=furnitureDimensions(source),spots=[];
 for(let y=0;y<=GRID.rows-h;y++)for(let x=0;x<=GRID.columns-w;x++){
  if(x===source.x&&y===source.y)continue;
  spots.push({x,y,dist:Math.abs(x-(source.x+w))+Math.abs(y-source.y)});
 }
 spots.sort((a,b)=>a.dist-b.dist||a.y-b.y||a.x-b.x);
 for(const s of spots){try{return putFurniture(doc,{roomId:source.roomId,kind:source.kind,x:s.x,y:s.y,rotation:source.rotation,nodeId:'',...(Number.isInteger(source.width)?{width:source.width,height:source.height}:{})});}catch{/* Tenta outra posição desocupada. */}}
 throw Error('Não existe espaço livre para duplicar este móvel.');
}
export function moveFurnitureBy(doc,id,dx,dy){
 const o=validFurniture(doc).find(x=>x.id===id);
 if(!o)throw Error('Selecione um móvel para mover.');
 const x=o.x+dx,y=o.y+dy,[w,h]=furnitureDimensions(o);
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+w>GRID.columns||y+h>GRID.rows)throw Error('O móvel não pode sair dos limites do ambiente.');
 return moveFurniture(doc,id,x,y);
}
/** Escolhe a aresta mais próxima do ponto no piso; exige clique junto à linha da grade. */
export function segmentAtFloor(x,z,tolerance=.35){
 if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>GRID.columns||z>GRID.rows)return null;
 const vx=Math.round(x),hz=Math.round(z),dx=Math.abs(x-vx),dz=Math.abs(z-hz);
 if(Math.min(dx,dz)>tolerance)return null;
 if(dx<=dz){
  return {axis:'v',x:vx,y:Math.max(0,Math.min(GRID.rows-1,Math.floor(z)))};
 }
 return {axis:'h',x:Math.max(0,Math.min(GRID.columns-1,Math.floor(x))),y:hz};
}
export function segmentPlacement(doc,roomId,segment,type){
 if(!segment||!['wall','door','open'].includes(type))return {valid:false,reason:'Clique próximo a uma linha da grade.'};
 const inRoom=(doc.environments||[]).some(r=>r.id===roomId);
 if(!inRoom)return {valid:false,reason:'Selecione um ambiente.'};
 if(type!=='open'&&validFurniture(doc).some(o=>o.roomId===roomId&&objectIntersectsSegment(o,segment.axis,segment.x,segment.y)))return {valid:false,reason:'Mova o móvel que atravessa esta divisória.'};
 return {valid:true,reason:'Segmento disponível.'};
}

/** Deslocamento atômico de um conjunto. Objetos selecionados podem trocar posições sem colisões falsas. */
export function moveFurnitureGroup(doc,ids,dx,dy){
 const all=validFurniture(doc),unique=[...new Set(ids||[])];
 if(!unique.length)throw Error('Selecione um ou mais móveis.');
 if(!Number.isInteger(dx)||!Number.isInteger(dy))throw Error('Movimento deve usar células inteiras.');
 const moving=unique.map(id=>all.find(o=>o.id===id));
 if(moving.some(x=>!x))throw Error('Há um móvel inexistente na seleção.');
 if(new Set(moving.map(o=>o.roomId)).size!==1)throw Error('Selecione móveis do mesmo ambiente.');
 const candidates=moving.map(o=>({...o,x:o.x+dx,y:o.y+dy}));
 for(const o of candidates){const [w,h]=furnitureDimensions(o);
  if(o.x<0||o.y<0||o.x+w>GRID.columns||o.y+h>GRID.rows)throw Error('Um móvel sairia dos limites do ambiente.');
  if(objectCrossesStructure(doc,o))throw Error('Um móvel atravessaria uma parede ou porta.');
 }
 const excluded=new Set(unique);
 for(const o of candidates)if(all.some(other=>!excluded.has(other.id)&&other.roomId===o.roomId&&occupied(other,o)))throw Error('O grupo sobrepõe outro móvel.');
 for(let i=0;i<moving.length;i++){moving[i].x=candidates[i].x;moving[i].y=candidates[i].y;}
 return moving;
}
export function removeFurnitureGroup(doc,ids){
 const selection=new Set(ids||[]);if(!selection.size)return 0;
 const layout=doc.floorplan;if(!Array.isArray(layout?.objects))return 0;
 const before=layout.objects.length;layout.objects=layout.objects.filter(o=>!selection.has(o.id));return before-layout.objects.length;
}
/** Traça uma sequência contínua de divisórias. Aplica tudo ou nada (uma única ação para desfazer). */
export function paintStructureLine(doc,roomId,start,end,type){
 if(!start||!end||start.axis!==end.axis||!['wall','door','open'].includes(type))throw Error('Trace um segmento na mesma linha da grade.');
 const axis=start.axis,fixed=axis==='v'?'x':'y',moving=axis==='v'?'y':'x';
 if(start[fixed]!==end[fixed])throw Error('Para construir um trecho contínuo, arraste na mesma linha da grade.');
 const positions=[];for(let v=Math.min(start[moving],end[moving]);v<=Math.max(start[moving],end[moving]);v++)positions.push({...start,[moving]:v});
 // clone evita escrita parcial se algum trecho estiver bloqueado por móvel
 const copy={...doc,floorplan:{...doc.floorplan,objects:doc.floorplan?.objects||[],segments:[...(doc.floorplan?.segments||[])],scales:doc.floorplan?.scales||{}}};
 for(const segment of positions)setEdge(copy,roomId,segment.axis,segment.x,segment.y,type);
 const old=doc.floorplan??(doc.floorplan={version:1,objects:[]});old.segments=copy.floorplan.segments;
 return positions.length;
}
