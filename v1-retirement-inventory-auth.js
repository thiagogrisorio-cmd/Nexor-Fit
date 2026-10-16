import {inventoryUsers} from './v1-retirement-inventory-users.js';
/** Read-only, bounded Firebase Auth user discovery; returns aggregate counts only. */
export async function inventoryAuthUsers({auth,db,batchSize=100,maxBatches=10,sessionPageSize=100,sessionMaxPages=1000}){
 if(!auth||typeof auth.listUsers!=='function'||!db||!Number.isInteger(batchSize)||batchSize<1||batchSize>1000||!Number.isInteger(maxBatches)||maxBatches<1)throw Error('Parâmetros de descoberta inválidos');
 const counts={total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0};
 const issueCounts={'id-mismatch':0,'unsupported-schema-or-status':0};
 let token,usersScanned=0,batches=0,complete=false,allSessionPagesComplete=true;
 const seen=new Set();
 while(batches<maxBatches){
  const page=await auth.listUsers(batchSize,token);
  if(!page||!Array.isArray(page.users))throw Error('Página Auth inválida');
  const uids=page.users.map(user=>user.uid);
  if(uids.some(uid=>typeof uid!=='string'||!uid||uid.includes('/')||seen.has(uid)))throw Error('UID inválido ou repetido');
  for(const uid of uids)seen.add(uid);
  const report=await inventoryUsers({db,uids,pageSize:sessionPageSize,maxPages:sessionMaxPages});
  for(const key of Object.keys(counts))counts[key]+=report.counts[key];
  for(const key of Object.keys(issueCounts))issueCounts[key]+=report.issueCounts[key];
  usersScanned+=report.usersScanned;batches++;
  if(!report.complete)allSessionPagesComplete=false;
  if(!page.pageToken){complete=allSessionPagesComplete;break;}
  if(page.pageToken===token)throw Error('Cursor Auth repetido');
  token=page.pageToken;
 }
 return {counts,issueCounts,usersScanned,batches,complete,readOnly:true,scope:'firebase-auth-users'};
}
