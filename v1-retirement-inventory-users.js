import {inventoryUserSessions} from './v1-retirement-inventory-admin.js';
/** Aggregate per-user inventories. No user IDs or document IDs leave this function. */
export async function inventoryUsers({db,uids,pageSize=100,maxPages=1000}){
 if(!db||!Array.isArray(uids)||uids.some(uid=>typeof uid!=='string'||!uid||uid.includes('/')))throw Error('Lista de usuários inválida');
 const counts={total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0};
 const issueCounts={'id-mismatch':0,'unsupported-schema-or-status':0};
 let complete=true;
 for(const uid of uids){
  const report=await inventoryUserSessions({db,uid,pageSize,maxPages});
  for(const key of Object.keys(counts))counts[key]+=report.counts[key];
  for(const key of Object.keys(issueCounts))issueCounts[key]+=report.issueCounts[key];
  if(!report.complete)complete=false;
 }
 return {counts,issueCounts,usersScanned:uids.length,complete,readOnly:true};
}
