const DB='nexor-fit-offline-v1';
export async function saveReceipt(receipt){
 if(!receipt?.id)throw Error('Recibo inválido');
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,2);
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{
   const db=req.result;
   const tx=db.transaction('receipts','readwrite');
   tx.objectStore('receipts').put(receipt);
   tx.oncomplete=()=>{db.close();resolve();};
   tx.onerror=()=>reject(tx.error);
  };
 });
}
