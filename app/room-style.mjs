/** Parâmetros arquitetônicos visuais, independentes do motor de filas. */
import {ensureFloorplan} from './floorplan.mjs';
export const DEFAULT_WALL_HEIGHT=2.7;
export const WALL_HEIGHT_MIN=1.8;
export const WALL_HEIGHT_MAX=4.2;
export function wallHeight(doc,roomId){
 const value=Number(ensureFloorplan(doc).wallHeights?.[roomId]);
 return Number.isFinite(value)&&value>=WALL_HEIGHT_MIN&&value<=WALL_HEIGHT_MAX?value:DEFAULT_WALL_HEIGHT;
}
export function setWallHeight(doc,roomId,meters){
 if(!(doc.environments||[]).some(r=>r.id===roomId))throw Error('Selecione um ambiente válido.');
 if(meters===''||meters===null||meters===undefined)throw Error('Informe a altura das paredes.');
 const value=Number(meters);
 if(!Number.isFinite(value)||value<WALL_HEIGHT_MIN||value>WALL_HEIGHT_MAX)throw Error('Altura entre 1,80 m e 4,20 m.');
 const floor=ensureFloorplan(doc);floor.wallHeights??={};floor.wallHeights[roomId]=Math.round(value*100)/100;
 return floor.wallHeights[roomId];
}
/** Altura das paredes em unidades da cena (1 unidade equivale a 1 célula). */
export function wallSceneHeight(doc,roomId,scale){return wallHeight(doc,roomId)/scale;}
