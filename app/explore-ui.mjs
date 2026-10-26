import {CARD_TYPES,EDGE_TYPES,LANES} from './core.mjs';
import {EXPLORE_VIEWS,RELATION_FILTERS,exploreProjection,graphLayout,exploreReportCsv} from './explore.mjs';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const trim=(s,n=27)=>String(s??'').length>n?String(s).slice(0,n-1)+'…':String(s??'');
const nice = n=>new Intl.NumberFormat('pt-BR').format(n);
function svgLabel(text,x,y,cls,size=27){const words=String(text??'').split(/\s+/),rows=[],row=[];for(const w of words){if((row.join(' ')+' '+w).trim().length>size&&row.length){rows.push(row.join(' '));row.length=0}row.push(w)}if(row.length)rows.push(row.join(' '));return rows.slice(0,2).map((s,i)=>`<text x="${x}" y="${y+i*17}" class="${cls}">${escapeHtml(trim(s,size+4))}</text>`).join('')}
function renderSVG(projection,layout,chosen,zoom){
 const chosenNode=chosen?.kind==='node'?chosen.id:null, chosenEdge=chosen?.kind==='edge'?chosen.id:null;
 const neighbor=new Set([chosenNode]);for(const e of projection.edges){if(e.from===chosenNode)neighbor.add(e.to);if(e.to===chosenNode)neighbor.add(e.from)}
 const defs=`<defs><marker id="ex-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="#8faeae"/></marker></defs>`;
 const bg=layout.groups.map(g=>`<g><rect class="ex-svg-group" x="${g.x}" y="18" width="${g.width}" height="${layout.height-36}" rx="18"/><rect class="ex-svg-band" x="${g.x}" y="18" width="${g.width}" height="53" rx="18"/><text x="${g.x+17}" y="38" class="ex-svg-kicker">${escapeHtml(g.kicker)}</text><text x="${g.x+17}" y="60" class="ex-svg-group-title">${escapeHtml(trim(g.label,27))}</text><text x="${g.x+g.width-18}" y="39" text-anchor="end" class="ex-svg-count">${g.nodes.length}</text>${g.nodes.length?'':`<text x="${g.x+20}" y="${110}" class="ex-svg-quiet">Sem peças nesta categoria</text>`}</g>`).join('');
 const edges=layout.links.map(({edge,from,to})=>{const offset=from.x<to.x?1:-1;const x1=from.x+((offset===1)?from.w:0),y1=from.y+from.h/2, x2=to.x+((offset===1)?0:to.w),y2=to.y+to.h/2;
 const same=Math.abs(from.x-to.x)<1;const d=same?`M${from.x+from.w-13},${y1} C${from.x+from.w+40},${y1} ${to.x+to.w+40},${y2} ${to.x+to.w-13},${y2}`:`M${x1},${y1} C${x1+(x2-x1)*.5},${y1} ${x2-(x2-x1)*.5},${y2} ${x2},${y2}`;
 const dim=chosenNode&&!neighbor.has(edge.from)&&!neighbor.has(edge.to);
 return `<g class="ex-svg-edge ${chosenEdge===edge.id?'is-selected':''} ${dim?'is-muted':''}" data-explore-edge="${escapeHtml(edge.id)}" role="button" tabindex="0" aria-label="${escapeHtml(EDGE_TYPES[edge.type].title+': '+from.node.title+' para '+to.node.title)}"><title>${escapeHtml(EDGE_TYPES[edge.type].title)}</title><path d="${d}" fill="none" stroke="${EDGE_TYPES[edge.type].color}" stroke-width="3" marker-end="url(#ex-arrow)"/><path d="${d}" fill="none" stroke="transparent" stroke-width="16"/></g>`}).join('');
 const nodes=layout.groups.map(g=>g.cards.map(({node:n,x,y,w,h})=>{
 const active=chosenNode===n.id,dim=chosenNode&&!neighbor.has(n.id),type=CARD_TYPES[n.type],team=n.team?.trim()||'Equipe não definida';
 return `<g class="ex-svg-node ${active?'is-selected':''} ${dim?'is-muted':''}" data-explore-node="${escapeHtml(n.id)}" tabindex="0" role="button" aria-label="${escapeHtml('Selecionar '+n.title+', '+type.title)}"><title>${escapeHtml(n.title)}</title><rect class="ex-node-shadow" x="${x}" y="${y+3}" width="${w}" height="${h}" rx="13"/><rect class="ex-node-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="13"/><rect x="${x}" y="${y+15}" width="4" height="${h-30}" rx="2" fill="${LANES.find(l=>l.id===n.lane)?.accent||'#3baaa1'}"/><rect class="ex-icon-bg" x="${x+13}" y="${y+11}" width="31" height="31" rx="9"/><text class="ex-node-icon" x="${x+28}" y="${y+32}" text-anchor="middle">${escapeHtml(type.icon)}</text><text class="ex-node-type" x="${x+54}" y="${y+22}">${escapeHtml(type.title.toLocaleUpperCase('pt-BR'))}</text>${svgLabel(n.title,x+15,y+53,'ex-node-title',29)}<text class="ex-node-meta" x="${x+15}" y="${y+h-11}">${escapeHtml(trim(team,25))} ${n.duration>0?' · '+nice(n.duration)+' min':''}</text><circle cx="${x+w-19}" cy="${y+25}" r="3.5" fill="${active?'#168c7f':'#b1cbca'}"/></g>`
 }).join('')).join('');
 return `<svg class="ex-graph" id="ex-graph" xmlns="http://www.w3.org/2000/svg" width="${Math.round(layout.width*zoom)}" height="${Math.round(layout.height*zoom)}" viewBox="0 0 ${layout.width} ${layout.height}" role="group" aria-label="Mapa de exploração do serviço: ${projection.groups.length} grupos, ${projection.nodes.length} componentes"><rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#f2f7f5"/>${defs}${bg}${edges}${nodes}</svg>`;
}
function csvDownload(filename,content){const blob=new Blob([content],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
const safeId=x=>String(x??'').replace(/[^a-z0-9-]+/gi,'-').slice(0,50);
export function initExplorer({getDocument,onEdit,onBack}){
 const root=document.querySelector('#explore-view');if(!root)throw Error('Explore view element absent');
 const ui={view:'stages',relation:'auto',search:'',stage:'all',team:'all',selected:null,onlyRelated:false,zoom:1,active:false};
 let projection=null,layout=null;
 const $=s=>root.querySelector(s);
 function setMode(view){ui.view=view;ui.relation='auto';ui.onlyRelated=false;update();announce('Visualização: '+EXPLORE_VIEWS.find(v=>v.id===view).label)}
 function announce(msg){$('#ex-live').textContent=msg}
 function selectNode(id){ui.selected={kind:'node',id};ui.onlyRelated=false;update();announce('Peça selecionada: '+(getDocument().nodes.find(n=>n.id===id)?.title||'Componente'))}
 function selectEdge(id){ui.selected={kind:'edge',id};update()}
 function centerOn(id){const pos=layout?.positions.get(id);if(!pos)return;const pane=$('#ex-scroll');pane.scrollTo({left:Math.max(0,(pos.x+pos.w/2)*ui.zoom - pane.clientWidth/2),top:Math.max(0,(pos.y+pos.h/2)*ui.zoom - pane.clientHeight/2),behavior:'smooth'})}
 function focusSelected(){if(ui.selected?.kind!=='node')return;const p=layout?.positions.get(ui.selected.id);if(!p)return;const pane=$('#ex-scroll');pane.scrollTo({left:Math.max(0,(p.x+p.w/2)*ui.zoom - pane.clientWidth/2),top:Math.max(0,(p.y+p.h/2)*ui.zoom - pane.clientHeight/2),behavior:'smooth'})}
 function fit(){if(!layout)return;const pane=$('#ex-scroll'),width=Math.max(200,pane.clientWidth-30),height=Math.max(220,pane.clientHeight-30);ui.zoom=Math.max(.42,Math.min(1.15,Math.min(width/layout.width,height/layout.height)));renderGraph();pane.scrollTo({left:0,top:0});}
 // pane dimensions are read only when the view is visible; scroll is never written to the model.
 function renderGraph(){if(!layout)return;$('#ex-diagram').innerHTML=renderSVG(projection,layout,ui.selected,ui.zoom);$('#ex-zoom-label').textContent=Math.round(ui.zoom*100)+'%';renderMini()}
 function renderMini(){if(!layout)return;const pane=$('#ex-scroll'),width=184,height=98,scale=Math.min((width-12)/layout.width,(height-12)/layout.height),ox=(width-layout.width*scale)/2,oy=(height-layout.height*scale)/2;
 const blocks=layout.groups.map(g=>`<rect x="${ox+g.x*scale}" y="${oy+17*scale}" width="${g.width*scale}" height="${(layout.height-34)*scale}" rx="3" fill="#dcece7" stroke="#acd1c8"/>`).join('');
 const cards=[...layout.positions.values()].map(p=>`<rect x="${ox+p.x*scale}" y="${oy+p.y*scale}" width="${Math.max(1,p.w*scale)}" height="${Math.max(2,p.h*scale)}" rx="1" fill="#318d80" opacity=".72"/>`).join('');
 const vx=ox+(pane.scrollLeft/ui.zoom)*scale,vy=oy+(pane.scrollTop/ui.zoom)*scale,vw=Math.min(layout.width,pane.clientWidth/ui.zoom)*scale,vh=Math.min(layout.height,pane.clientHeight/ui.zoom)*scale;
 $('#ex-mini').innerHTML=`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Miniatura do mapa">${blocks}${cards}<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#fff" fill-opacity=".16" stroke="#1c8d7d" stroke-width="1.7" rx="2"/></svg>`;
 }
 function renderDetails(){const d=getDocument(),selected=ui.selected,focus=selected?.kind==='node'?d.nodes.find(n=>n.id===selected.id):null,edge=selected?.kind==='edge'?d.edges.find(e=>e.id===selected.id):null;
 if(focus){const stage=d.stages[focus.stage]?.name,links=d.edges.filter(e=>e.from===focus.id||e.to===focus.id),related=projection?.downstream||[];
 $('#ex-details').innerHTML=`<div class="ex-detail-top"><span class="ex-inspector-eyebrow">PEÇA EM FOCO</span><div class="ex-detail-icon">${escapeHtml(CARD_TYPES[focus.type].icon)}</div><h2>${escapeHtml(focus.title)}</h2><p>${escapeHtml(CARD_TYPES[focus.type].title)} · ${escapeHtml(stage||'Sem etapa')}</p></div><div class="ex-detail-stack"><div><small>EQUIPE</small><b>${escapeHtml(focus.team||'Não definida')}</b></div><div><small>RESPONSÁVEL</small><b>${escapeHtml(focus.owner||'Não definido')}</b></div><div><small>TEMPO INFORMADO</small><b>${focus.duration>0?escapeHtml(focus.duration)+' minutos':'Não informado'}</b></div></div><div class="ex-insight-callout"><strong>${links.length} relações diretas · ${related.length} elementos adiante</strong><span>Abrange conexões do modelo. Não é cálculo de caminho crítico.</span></div><button class="ex-cta" id="ex-edit-current">↗ Editar no Modo Construção</button><h3 class="ex-aside-title">Elementos relacionados</h3><div class="ex-relations">${links.length?links.map(e=>{const other=d.nodes.find(n=>n.id===(e.from===focus.id?e.to:e.from));return `<button data-ex-related="${escapeHtml(other?.id)}"><span>${escapeHtml(EDGE_TYPES[e.type].title)}</span><b>${escapeHtml(trim(other?.title||'Componente',32))}</b></button>`}).join(''):'<p>Nenhuma conexão registrada.</p>'}</div>`;
 $('#ex-edit-current')?.addEventListener('click',()=>onEdit(focus.id));$('#ex-details').querySelectorAll('[data-ex-related]').forEach(el=>el.addEventListener('click',()=>selectNode(el.dataset.exRelated)));
 } else if(edge){const a=d.nodes.find(n=>n.id===edge.from),b=d.nodes.find(n=>n.id===edge.to);$('#ex-details').innerHTML=`<span class="ex-inspector-eyebrow">CONEXÃO EM FOCO</span><h2>${escapeHtml(EDGE_TYPES[edge.type].title)}</h2><p class="ex-detail-description">${escapeHtml(a?.title||'Origem')} → ${escapeHtml(b?.title||'Destino')}</p><div class="ex-detail-stack"><div><small>DESCRIÇÃO</small><b>${escapeHtml(edge.label||'Não informada')}</b></div><div><small>ACEITE</small><b>${escapeHtml(edge.acceptance||'Não informado')}</b></div></div><div class="ex-relations"><button data-ex-related="${escapeHtml(a?.id)}">Abrir origem</button><button data-ex-related="${escapeHtml(b?.id)}">Abrir destino</button></div>`;$('#ex-details').querySelectorAll('[data-ex-related]').forEach(el=>el.addEventListener('click',()=>selectNode(el.dataset.exRelated)));
 }else{
 $('#ex-details').innerHTML=`<span class="ex-inspector-eyebrow">RESUMO DO SERVIÇO</span><h2>Explore seu projeto</h2><p class="ex-detail-description">Selecione uma peça ou conexão para entender sua participação no serviço, sem alterar os dados.</p><div class="ex-insight-callout"><strong>${projection?.stats.warnings??0} pontos para revisar</strong><span>Informações faltantes não impedem a construção, mas podem dificultar a operação.</span></div><h3 class="ex-aside-title">O que você pode descobrir?</h3><div class="ex-guide-rows"><span>◉ Quem realiza cada atividade</span><span>↗ Como as atividades dependem umas das outras</span><span>▦ Quais sistemas sustentam a entrega</span><span>◇ Onde estão os handoffs entre equipes</span></div>`;
 }
 const warn=projection?.warnings||[];$('#ex-issues').innerHTML=warn.length?warn.slice(0,5).map(w=>`<div class="ex-issue"><span class="ex-issue-dot"></span>${escapeHtml(w.text)}</div>`).join(''):'<div class="ex-issue-empty">Nenhum alerta básico no modelo.</div>';
 $('#ex-issue-count').textContent=warn.length;
 }
 function renderStats(){const st=projection.stats;$('#ex-stats').innerHTML=[['▤','Etapas',getDocument().stages.length],['▣','Atividades',st.activities],['♧','Equipes',st.teams],['▦','Recursos',st.resources],['↗','Passagens',st.handoffs]].map(([icon,label,value])=>`<div class="ex-stat"><span>${icon}</span><b>${nice(value)}</b><small>${label}</small></div>`).join('')}
 function renderToolbar(){
 $('#ex-tabs').innerHTML=EXPLORE_VIEWS.map(v=>`<button class="ex-tab ${ui.view===v.id?'active':''}" data-ex-view="${v.id}" aria-pressed="${ui.view===v.id}"><span>${v.icon}</span>${v.label}</button>`).join('');
 $('#ex-stage').innerHTML=`<option value="all">Todas as etapas</option>`+getDocument().stages.map((s,i)=>`<option value="${i}" ${String(ui.stage)===String(i)?'selected':''}>${escapeHtml(s.name)}</option>`).join('');
 $('#ex-team').innerHTML=`<option value="all">Todas as equipes</option>`+projection.teams.map(t=>`<option value="${escapeHtml(t)}" ${ui.team===t?'selected':''}>${escapeHtml(t)}</option>`).join('');
 $('#ex-relation').innerHTML=RELATION_FILTERS.map(t=>`<option value="${t.id}" ${ui.relation===t.id?'selected':''}>${escapeHtml(t.label)}</option>`).join('');
 $('#ex-related-only').disabled=!ui.selected||ui.selected.kind!=='node';$('#ex-related-only').checked=ui.onlyRelated;
 }
 function update(preserveScroll=true){if(!ui.active)return;const pane=$('#ex-scroll'),old={left:pane.scrollLeft,top:pane.scrollTop};projection=exploreProjection(getDocument(),{...ui,selected:ui.selected?.kind==='node'?ui.selected.id:null});layout=graphLayout(projection);renderToolbar();renderStats();renderGraph();renderDetails();$('#ex-count').textContent=`${projection.nodes.length} de ${projection.total.nodes} peças · ${projection.edges.length} conexões nesta visão`;$('#ex-desc').textContent=EXPLORE_VIEWS.find(v=>v.id===ui.view)?.desc;if(preserveScroll)pane.scrollTo(old.left,old.top);}
 root.addEventListener('click',e=>{const tab=e.target.closest('[data-ex-view]'),node=e.target.closest('[data-explore-node]'),edge=e.target.closest('[data-explore-edge]');if(tab){setMode(tab.dataset.exView);return}if(node){selectNode(node.dataset.exploreNode);return}if(edge){selectEdge(edge.dataset.exploreEdge);return}});
 root.addEventListener('keydown',e=>{const target=e.target.closest('[data-explore-node],[data-explore-edge]');if(!target||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();target.dataset.exploreNode?selectNode(target.dataset.exploreNode):selectEdge(target.dataset.exploreEdge)});
 $('#ex-search').addEventListener('input',e=>{ui.search=e.target.value;update()});
 $('#ex-stage').addEventListener('change',e=>{ui.stage=e.target.value;update()});
 $('#ex-team').addEventListener('change',e=>{ui.team=e.target.value;update()});
 $('#ex-relation').addEventListener('change',e=>{ui.relation=e.target.value;update()});
 $('#ex-related-only').addEventListener('change',e=>{ui.onlyRelated=e.target.checked;update()});
 $('#ex-clear').addEventListener('click',()=>{ui.search='';ui.stage='all';ui.team='all';ui.relation='auto';ui.onlyRelated=false;ui.selected=null;$('#ex-search').value='';update();announce('Filtros removidos.')});
 $('#ex-zoom-in').addEventListener('click',()=>{ui.zoom=Math.min(1.8,ui.zoom*1.2);renderGraph()});
 $('#ex-zoom-out').addEventListener('click',()=>{ui.zoom=Math.max(.42,ui.zoom/1.2);renderGraph()});
 $('#ex-fit').addEventListener('click',fit);
 $('#ex-focus').addEventListener('click',focusSelected);
 $('#ex-scroll').addEventListener('scroll',()=>{renderMini()},{passive:true});
 $('#ex-mini').addEventListener('click',e=>{if(!layout)return;const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height,pane=$('#ex-scroll');pane.scrollTo({left:Math.max(0,(x*layout.width)*ui.zoom - pane.clientWidth/2),top:Math.max(0,(y*layout.height)*ui.zoom - pane.clientHeight/2),behavior:'smooth'})});
 $('#ex-csv').addEventListener('click',()=>{const d=getDocument(),base=(d.name||'servico').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase().slice(0,40);csvDownload(`${base||'servico'}-exploracao.csv`,exploreReportCsv(d,projection));announce('Relatório CSV preparado.')});
 $('#ex-back').addEventListener('click',onBack);
 return {show(){ui.active=true;root.hidden=false;update(false);setTimeout(()=>fit(),0)},hide(){ui.active=false;root.hidden=true},refresh(){update()},state:ui};
}
