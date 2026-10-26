/** P7 catalog search: accent-insensitive text with category intersection. */
export function normalizeCatalogText(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}
export function matchesFurniture(spec,search='',category='',kind=''){
 if(!spec)return false;
 const term=normalizeCatalogText(search);
 const inCategory=!category||spec.category===category;
 const text=normalizeCatalogText([spec.name,spec.category,spec.tags||'',kind].join(' '));
 return inCategory&&(!term||text.includes(term));
}
