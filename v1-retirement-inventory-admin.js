import {collectSessionInventory} from './v1-retirement-inventory-collector.js';
/** Read-only Admin SDK adapter. Caller must supply an authorized Firestore instance and uid. */
export async function inventoryUserSessions({db,uid,pageSize=100,maxPages=1000}){
 if(!db||typeof db.collection!=='function'||typeof uid!=='string'||!uid||uid.includes('/'))throw Error('Parâmetros de inventário inválidos');
 const collection=db.collection(`users/${uid}/sessions`);
 return collectSessionInventory({pageSize,maxPages,listPage:async({cursor,pageSize:size})=>{
  let query=collection.orderBy('__name__').limit(size);
  if(cursor)query=query.startAfter(cursor);
  const snapshot=await query.get();
  const rows=snapshot.docs.map(doc=>({id:doc.id,data:doc.data()}));
  const nextCursor=snapshot.docs.length===size?snapshot.docs[snapshot.docs.length-1].id:null;
  return {rows,nextCursor};
 }});
}
