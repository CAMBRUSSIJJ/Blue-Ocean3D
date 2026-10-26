/** Accessible, nonblocking destructive/replace confirmation; unlike window.confirm this can be styled. */
export function confirmAction({title='Confirmar ação',message='',confirmLabel='Confirmar',destructive=true}={}) {
 const dialog=document.getElementById('sb-confirm-dialog');
 if(!dialog || typeof dialog.showModal!=='function') return Promise.resolve(false);
 if(dialog.open) return Promise.resolve(false);
 const previous=document.activeElement;
 const heading=dialog.querySelector('#sb-confirm-title');
 const body=dialog.querySelector('#sb-confirm-message');
 const accept=dialog.querySelector('#sb-confirm-accept');
 const cancel=dialog.querySelector('#sb-confirm-cancel');
 heading.textContent=title;body.textContent=message;accept.textContent=confirmLabel;
 accept.classList.toggle('is-neutral',!destructive);
 return new Promise(resolve=>{
  let completed=false;
  const finish=()=>{
    if(completed)return;
    completed=true;
    resolve(dialog.returnValue==='confirm');
    if(previous?.isConnected && typeof previous.focus==='function')previous.focus({preventScroll:true});
  };
  dialog.addEventListener('close',finish,{once:true});
  accept.onclick=()=>dialog.close('confirm');
  cancel.onclick=()=>dialog.close('cancel');
  dialog.returnValue='cancel';
  dialog.showModal();
  cancel.focus();
 });
}
