// IndexedDB storage for offline workout sessions and a durable mutation queue.
const DB_NAME='nexor-fit-offline-v1',VERSION=2;
let connection;
function database(){
 if(!('indexedDB' in globalThis))return Promise.reject(Error('IndexedDB indisponível'));
 if(!connection)connection=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,VERSION);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'id'});
   if(!db.objectStoreNames.contains('receipts'))db.createObjectStore('receipts',{keyPath:'id'});
   if(!db.objectStoreNames.contains('operations')){
    const store=db.createObjectStore('operations',{keyPath:'id'});
    store.createIndex('sessionId','sessionId');
   }
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 }).catch(error=>{connection=null;throw error});
 return connection;
}
async function transact(storeName,mode,action){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(storeName,mode),store=tx.objectStore(storeName);
  let result;
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||Error('Transação abortada'));
  try{action(store,value=>{result=value})}catch(error){tx.abort();reject(error)}
 });
}
export const saveOfflineSession=session=>transact('sessions','readwrite',(store)=>store.put(session));
export const getOfflineSession=id=>transact('sessions','readonly',(store,done)=>{
 const request=store.get(id);request.onsuccess=()=>done(request.result||null);
});
export const enqueueOfflineOperation=operation=>transact('operations','readwrite',store=>store.add(operation));
export const removeOfflineOperation=id=>transact('operations','readwrite',store=>store.delete(id));
export const listOfflineOperations=()=>transact('operations','readonly',(store,done)=>{
 const request=store.getAll();request.onsuccess=()=>done(request.result||[]);
});
export async function persistOfflineMutation(session,operation){
 // Both records are committed atomically or neither is saved.
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['sessions','operations'],'readwrite');
  tx.objectStore('sessions').put(session);
  tx.objectStore('operations').add(operation);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||Error('Offline write failed'));
 });
}
