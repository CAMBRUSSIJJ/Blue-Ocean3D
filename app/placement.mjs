/** v1.5: prévia de encaixe pura, compartilhada pelo 2D e 3D. Nunca altera o documento. */
import {GRID,FURNITURE,validFurniture,furnitureDimensions,occupied} from './floorplan.mjs';
import {objectCrossesStructure} from './floorplan-navigation.mjs';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const FURNITURE_DRAG_TYPE='application/x-service-builder-furniture';
export function placementAt(doc,{roomId,kind,x,y,rotation=0,ignoreId=null}){
 if(!FURNITURE[kind])return {valid:false,reason:'Selecione um móvel da biblioteca.'};
 if(!(doc.environments||[]).some(r=>r.id===roomId))return {valid:false,reason:'Selecione um ambiente válido.'};
 if(!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))return {valid:false,reason:'Posição inválida.'};
 const original=ignoreId?validFurniture(doc).find(o=>o.id===ignoreId):null;const obj={id:ignoreId||'preview',roomId,kind,rotation:rotation===90?90:0,x:0,y:0,nodeId:'',...(original&&Number.isInteger(original.width)?{width:original.width,height:original.height}:{})};
 const [w,h]=furnitureDimensions(obj);
 obj.x=clamp(Math.round(Number(x)),0,GRID.columns-w);
 obj.y=clamp(Math.round(Number(y)),0,GRID.rows-h);
 if(validFurniture(doc).some(o=>o.roomId===roomId&&o.id!==ignoreId&&occupied(o,obj)))return {valid:false,reason:'Espaço ocupado por outro objeto.',object:obj};
 if(objectCrossesStructure(doc,obj))return {valid:false,reason:'O objeto atravessa uma parede ou porta.',object:obj};
 return {valid:true,reason:'Posição disponível.',object:obj};
}
export function placementFromPoint(doc,{roomId,kind,pointX,pointY,rotation=0,ignoreId=null}){
 if(!FURNITURE[kind])return {valid:false,reason:'Móvel não encontrado.'};
 const original=ignoreId?validFurniture(doc).find(o=>o.id===ignoreId):null;const [w,h]=furnitureDimensions(original||{kind,rotation});
 return placementAt(doc,{roomId,kind,x:Math.round(pointX-w/2),y:Math.round(pointY-h/2),rotation,ignoreId});
}
