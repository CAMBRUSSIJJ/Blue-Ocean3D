/** Galeria leve: miniaturas CSS, sem downloads nem texturas pesadas. */
export const PREVIEW_KIND={
 counter:{shape:'counter',label:'Balcão com monitor'},
 desk:{shape:'desk',label:'Mesa com pés'},
 station:{shape:'station',label:'Estação com monitor'},
 waiting:{shape:'waiting',label:'Sofá de espera'},
 chair:{shape:'chair',label:'Cadeira com encosto'},
 kiosk:{shape:'kiosk',label:'Totem de autoatendimento'},
 shelf:{shape:'shelf',label:'Armário com prateleiras'},
 plant:{shape:'plant',label:'Planta decorativa'}
};
export const EXTRA_PREVIEW_KIND={
 bench:{shape:'bench',label:'Banco de espera'},
 table:{shape:'table',label:'Mesa redonda'},
 printer:{shape:'printer',label:'Impressora'},
 coffee:{shape:'coffee',label:'Estação de café e água'},
 exam:{shape:'exam',label:'Maca de exame'},
 screen:{shape:'screen',label:'Painel informativo'},
 stool:{shape:'stool',label:'Banqueta'}
};
export function thumbnail(kind){
 const config=PREVIEW_KIND[kind]||EXTRA_PREVIEW_KIND[kind];if(!config)return '';
 return `<span class="furn-preview furn-${config.shape}" aria-hidden="true"><i class="furn-main"></i><i class="furn-detail"></i><i class="furn-accent"></i></span>`;
}
