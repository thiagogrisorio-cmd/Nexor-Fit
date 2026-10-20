import {planLegacySessionMigration} from './session-v2-migration-plan.js';
import {decodeSessionFromFirestore} from './firestore-session-codec.js';

/**
 * Stages an atomic migration in one Firestore transaction.
 * IMPORTANT: This is a staging primitive, not enabled in the application.
 * Backup write requires dedicated Firestore security rules before production use.
 */
export async function migrateLegacySessionAtomically({db,uid,sessionId,doc,runTransaction,serverTimestamp}){
 if(!db||!uid||!sessionId||!doc||!runTransaction||!serverTimestamp)throw Error('Migração incompleta');
 const parent=doc(db,'users',uid,'sessions',sessionId);
 const backup=doc(db,'users',uid,'sessionBackups',sessionId);
 const control=doc(db,'users',uid,'sessionControl','active');
 const children=Array.from({length:12},(_,i)=>doc(db,'users',uid,'sessions',sessionId,'exercises',String(i)));
 return runTransaction(db,async tx=>{
  // All reads precede all writes, as required by Firestore transactions.
  const [parentSnapshot,backupSnapshot,controlSnapshot,...childSnapshots]=await Promise.all([
   tx.get(parent),tx.get(backup),tx.get(control),...children.map(ref=>tx.get(ref))
  ]);
  if(!parentSnapshot.exists())throw Error('Sessão original ausente');
  const original=parentSnapshot.data();
  if(original.schemaVersion===2){
   if(childSnapshots.some((snapshot,index)=>{
    if(!snapshot.exists())return true;
    const row=snapshot.data();
    return row.index!==index||row.sessionId!==sessionId||!Number.isInteger(row.revision)||row.revision<0||
     !Array.isArray(row.sets)||row.sets.length!==2||row.sets.some(set=>
      typeof set?.done!=='boolean'||(set.completedAt!==null&&typeof set.completedAt!=='string'));
   }))return {status:'conflict',sessionId,reason:'incomplete-v2-migration'};
   return {status:'already-v2',sessionId};
  }
  if(original.id!==sessionId)return {status:'conflict',sessionId,reason:'session-id-mismatch'};
  if(original.status!=='active'||!controlSnapshot.exists()||controlSnapshot.data().sessionId!==sessionId)
   return {status:'conflict',sessionId,reason:'not-active-session'};
  if(backupSnapshot.exists()||childSnapshots.some(s=>s.exists()))
   return {status:'conflict',sessionId,reason:'migration-target-exists'};
  const decoded=decodeSessionFromFirestore(original);
  const plan=planLegacySessionMigration(decoded);
  if(plan.status!=='ready')return plan;
  // Preserve original Firestore representation for recovery and audit.
  tx.set(backup,{sessionId,original,createdAt:serverTimestamp()});
  tx.set(parent,{...plan.metadata,updatedAt:serverTimestamp()});
  plan.exercises.forEach((exercise,i)=>tx.set(children[i],{...exercise,updatedAt:serverTimestamp()}));
  return {status:'migrated',sessionId,checks:plan.checks};
 });
}
