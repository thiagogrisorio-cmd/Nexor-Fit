/** Themed, keyboard-accessible confirmation without blocking the browser event loop. */
export function confirmAction(message,{confirmLabel='Confirmar',cancelLabel='Cancelar'}={}){
 if(document.querySelector('dialog[data-confirm-action]'))return Promise.resolve(false);
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.dataset.confirmAction='';dialog.className='confirm-action';
  const title=document.createElement('h2');title.id='confirmActionTitle';title.textContent=message;dialog.setAttribute('aria-labelledby',title.id);
  const form=document.createElement('form');form.method='dialog';
  for(const [value,label] of [['cancel',cancelLabel],['confirm',confirmLabel]]){
   const button=document.createElement('button');button.type='submit';button.value=value;button.textContent=label;button.className=value==='confirm'?'btn':'btn subtle';form.append(button);
  }
  dialog.append(title,form);dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='confirm';dialog.remove();resolve(confirmed)},{once:true});
  document.body.append(dialog);dialog.showModal();form.querySelector('button').focus();
 });
}
