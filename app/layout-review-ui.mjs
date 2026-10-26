import {captureLayout,saveLayoutBaseline,readLayoutBaseline,compareLayouts,layoutMapSVG} from './professional-review.mjs';
const safe=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
/** Read-only modal for comparing current vs captured physical layouts. */
export function initLayoutReview({root,getDocument,getRoomId}){
 const dialog=document.createElement('dialog');dialog.id='p4-layout-dialog';dialog.className='p4-layout-dialog';
 dialog.setAttribute('aria-labelledby','p4-layout-title');
 dialog.innerHTML=`<section class="p4-layout-panel">
 <header class="p4-layout-heading"><div><span>AMBIENTES DE SERVIÇO</span><h2 id="p4-layout-title">Comparação física de layouts</h2><p>Posições e componentes físicos em duas versões. Alterações de móveis não alteram automaticamente o tempo das atividades.</p></div><button type="button" id="p4-layout-close" aria-label="Fechar comparação">×</button></header>
 <div class="p4-layout-actions"><label for="p4-layout-room">Ambiente</label><select id="p4-layout-room"></select><button type="button" id="p4-layout-capture">Fixar layout atual como referência</button></div>
 <div class="p4-layout-grids"><article><h3>Referência</h3><div id="p4-layout-before"></div></article><article><h3>Atual</h3><div id="p4-layout-after"></div></article></div>
 <div id="p4-layout-diff" role="status"></div><p class="p4-layout-disclaimer">Mapas esquemáticos de 12 × 8 células. Não são laudos de circulação ou acessibilidade. A referência é salva somente neste navegador.</p></section>`;
 root.append(dialog);
 const at=id=>dialog.querySelector(id);
 const selector=at('#p4-layout-room');
 function render(){
  const doc=getDocument(),roomId=selector.value,current=captureLayout(doc);
  let reference=null;
  try{reference=readLayoutBaseline(doc)}catch{/* Browser storage may be disabled */}
  at('#p4-layout-before').innerHTML=reference?layoutMapSVG(reference,roomId):
   '<p class="p4-layout-empty">Nenhuma referência deste projeto neste navegador.</p>';
  at('#p4-layout-after').innerHTML=layoutMapSVG(current,roomId);
  const diff=at('#p4-layout-diff');
  if(!reference){diff.textContent='Fixe uma referência para visualizar e comparar o layout anterior e o atual.';return}
  const d=compareLayouts(reference,doc);
  diff.innerHTML=`<strong>${d.hasChanges?'Alterações físicas identificadas':'Layouts iguais na comparação estrutural'}</strong>
   <span>Ambientes: +${d.addedRooms.length}/−${d.removedRooms.length} · Móveis: +${d.added.length}/−${d.removed.length}/${d.changed.length} alterados · Paredes/portas: ${d.wallChanges} · Corredores: ${d.corridorChanges} · Escalas alteradas: ${d.scalesChanged.length}.</span>
   <small>Comparação global desde ${safe(new Date(reference.at).toLocaleString('pt-BR'))}. Os mapas mostram apenas o ambiente selecionado.</small>`;
 }
 function open(){
  const doc=getDocument();
  selector.innerHTML=(doc.environments||[]).map(r=>`<option value="${safe(r.id)}">${safe(r.name)}</option>`).join('');
  if(doc.environments?.some(r=>r.id===getRoomId()))selector.value=getRoomId();
  render();
  if(!dialog.open)dialog.showModal();
 }
 selector.addEventListener('change',render);
 at('#p4-layout-close').addEventListener('click',()=>dialog.close());
 at('#p4-layout-capture').addEventListener('click',()=>{
  try{saveLayoutBaseline(getDocument());render();at('#p4-layout-diff').prepend(document.createTextNode('Referência salva no navegador. '));}
  catch(err){at('#p4-layout-diff').textContent='Falha ao salvar referência: '+err.message}
 });
 return {open,render,dialog};
}
