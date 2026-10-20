/** Read-only orphan audit for session owners discovered from Firestore. */
export async function auditSessionOwners({listOwnerPage,ownerExists,pageSize=100,maxPages=1000}){
 if(typeof listOwnerPage!=='function'||typeof ownerExists!=='function'||!Number.isInteger(pageSize)||pageSize<1||pageSize>500||!Number.isInteger(maxPages)||maxPages<1)throw Error('Parâmetros de auditoria inválidos');
 let cursor=null,pages=0,complete=false,ownersScanned=0,orphanOwners=0;
 const seenOwners=new Set(),seenCursors=new Set();
 while(pages<maxPages){
  const page=await listOwnerPage({cursor,pageSize});
  if(!page||!Array.isArray(page.ownerIds)||!(page.nextCursor===null||typeof page.nextCursor==='string'))throw Error('Página inválida');
  for(const uid of page.ownerIds){
   if(typeof uid!=='string'||!uid||uid.includes('/'))throw Error('UID inválido');
   if(seenOwners.has(uid))continue;
   seenOwners.add(uid);ownersScanned++;
   if(!(await ownerExists(uid)))orphanOwners++;
  }
  pages++;
  if(page.nextCursor===null){complete=true;break;}
  if(!page.nextCursor||seenCursors.has(page.nextCursor))throw Error('Cursor inválido ou repetido');
  seenCursors.add(page.nextCursor);cursor=page.nextCursor;
 }
 return {ownersScanned,orphanOwners,pages,complete,readOnly:true};
}
