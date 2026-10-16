const DB='nexor-fit-offline-v1';
function openReceipts(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,2);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'id'});if(!db.objectStoreNames.contains('operations')){const store=db.createObjectStore('operations',{keyPath:'id'});store.createIndex('sessionId','sessionId');}if(!db.objectStoreNames.contains('receipts'))db.createObjectStore('receipts',{keyPath:'id'});};
 req.onerror=()=>reject(req.error);
 req.onsuccess=()=>resolve(req.result);
});}
function transact(mode,action){return openReceipts().then(db=>new Promise((resolve,reject)=>{
 const tx=db.transaction('receipts',mode),store=tx.objectStore('receipts');let value;
 tx.oncomplete=()=>{db.close();resolve(value);};
 tx.onerror=()=>{db.close();reject(tx.error);};
 tx.onabort=()=>{db.close();reject(tx.error);};
 action(store,result=>{value=result;});
}));}
export function saveReceipt(receipt){if(!receipt?.id)throw Error('Recibo inválido');return transact('readwrite',store=>store.put(receipt));}
export function getReceipt(id){if(!id)throw Error('Identificador obrigatório');return transact('readonly',(store,done)=>{const req=store.get(id);req.onsuccess=()=>done(req.result||null);});}
