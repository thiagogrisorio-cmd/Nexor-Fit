/** Pure, read-only classification for paginated Firestore session inventories. */
export function inventorySessionRows(rows){
 if(!Array.isArray(rows))throw Error('Inventário inválido');
 const counts={total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0};
 const issues=[];
 for(const row of rows){
  if(!row||typeof row.id!=='string'||!row.id||!row.data||typeof row.data!=='object')throw Error('Linha inválida');
  const {schemaVersion,status}=row.data;
  counts.total++;
  const version=schemaVersion===2?'v2':schemaVersion===undefined?'v1':null;
  if(!version||!['active','completed'].includes(status)){counts.unknown++;issues.push({id:row.id,reason:'unsupported-schema-or-status'});continue;}
  counts[version+(status==='active'?'Active':'Completed')]++;
  if(row.data.id!==row.id)issues.push({id:row.id,reason:'id-mismatch'});
 }
 return {counts,issues};
}
