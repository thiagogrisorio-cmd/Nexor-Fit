import {decodeSessionFromFirestore} from './firestore-session-codec.js';
import {planLegacySessionMigration} from './session-v2-migration-plan.js';

/**
 * Read-only recovery preflight. Immutable backups are never deleted.
 * Restoring a V1 document requires an explicit separate, privileged procedure.
 */
export function inspectV2MigrationBackup({sessionId,backup,parent,exerciseDocuments}){
 if(!sessionId||!backup||!parent)throw Error('Dados de recuperação incompletos');
 if(backup.sessionId!==sessionId||backup.original?.id!==sessionId)
  return {status:'invalid-backup',reason:'session-id-mismatch'};
 if(parent.id!==sessionId||parent.schemaVersion!==2)
  return {status:'conflict',reason:'parent-not-v2'};
 if(!Array.isArray(exerciseDocuments)||exerciseDocuments.length!==12)
  return {status:'incomplete',reason:'exercise-count'};
 const indices=new Set(exerciseDocuments.map(item=>item?.index));
 if(indices.size!==12||Array.from({length:12},(_,i)=>i).some(i=>!indices.has(i)))
  return {status:'incomplete',reason:'exercise-indices'};
 let legacy,plan;
 try{
  legacy=decodeSessionFromFirestore(backup.original);
  plan=planLegacySessionMigration(legacy);
 }catch{
  return {status:'invalid-backup',reason:'invalid-legacy-data'};
 }
 if(plan.status!=='ready')return {status:'invalid-backup',reason:'migration-plan'};
 const mismatch=plan.exercises.some(expected=>{
  const actual=exerciseDocuments.find(row=>row.index===expected.index);
  return actual.sessionId!==sessionId||actual.sets?.length!==2;
 });
 if(mismatch)return {status:'conflict',reason:'v2-structure-mismatch'};
 return {status:'ready-for-manual-review',sessionId,legacy,checks:plan.checks,
  warning:'Do not overwrite V2 automatically; it may contain newer workout changes.'};
}
