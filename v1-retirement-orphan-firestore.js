/** Read-only Firestore collection-group session scan, with Firebase Auth owner verification. */
export async function auditFirestoreSessionOrphans({db,auth,pageSize=100,maxPages=1000}){
 if(!db||typeof db.collectionGroup!=='function'||!auth||typeof auth.getUser!=='function'||!Number.isInteger(pageSize)||pageSize<1||pageSize>500||!Number.isInteger(maxPages)||maxPages<1)throw Error('Parâmetros de auditoria inválidos');
 let last=null,pages=0,complete=false,sessionDocuments=0,ownersScanned=0,orphanOwners=0,invalidPaths=0;
 const seen=new Set();
 while(pages<maxPages){
  let query=db.collectionGroup('sessions').orderBy('__name__').limit(pageSize);
  if(last)query=query.startAfter(last);
  const snapshot=await query.get();
  if(!snapshot||!Array.isArray(snapshot.docs))throw Error('Página Firestore inválida');
  for(const doc of snapshot.docs){
   sessionDocuments++;
   const segments=typeof doc?.ref?.path==='string'?doc.ref.path.split('/'):[];
   if(segments.length!==4||segments[0]!=='users'||!segments[1]||segments[2]!=='sessions'||!segments[3]){invalidPaths++;continue;}
   const uid=segments[1];
   if(seen.has(uid))continue;
   seen.add(uid);ownersScanned++;
   try{await auth.getUser(uid);}catch(error){
    if(error?.code==='auth/user-not-found')orphanOwners++;
    else throw error;
   }
  }
  pages++;
  if(snapshot.docs.length<pageSize){complete=true;break;}
  last=snapshot.docs[snapshot.docs.length-1];
 }
 return {sessionDocuments,ownersScanned,orphanOwners,invalidPaths,pages,complete,readOnly:true};
}
