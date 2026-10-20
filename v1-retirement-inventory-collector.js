import {inventorySessionRows} from './v1-retirement-inventory.js';
/** Aggregate paginated session snapshots without exposing user identifiers in the report. */
export async function collectSessionInventory({listPage,pageSize=100,maxPages=1000}){
 if(typeof listPage!=='function'||!Number.isInteger(pageSize)||pageSize<1||pageSize>500||!Number.isInteger(maxPages)||maxPages<1)throw Error('Parâmetros de paginação inválidos');
 const counts={total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0};
 const issueCounts={'id-mismatch':0,'unsupported-schema-or-status':0};
 let cursor=null,pages=0,complete=false;
 const seen=new Set();
 while(pages<maxPages){
  const page=await listPage({cursor,pageSize});
  if(!page||!Array.isArray(page.rows)||!(page.nextCursor===null||typeof page.nextCursor==='string'))throw Error('Resposta de paginação inválida');
  const result=inventorySessionRows(page.rows);
  for(const key of Object.keys(counts))counts[key]+=result.counts[key];
  for(const issue of result.issues)issueCounts[issue.reason]++;
  pages++;
  if(page.nextCursor===null){complete=true;break;}
  if(!page.nextCursor||seen.has(page.nextCursor))throw Error('Cursor de paginação repetido ou vazio');
  seen.add(page.nextCursor);cursor=page.nextCursor;
 }
 return {counts,issueCounts,pages,complete,readOnly:true};
}
