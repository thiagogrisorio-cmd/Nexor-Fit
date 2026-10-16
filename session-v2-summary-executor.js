import {planCompletedV2Summary} from './session-v2-summary-plan.js';
/** Run exclusively in a trusted server process with an Admin Firestore client. */
export async function executeV2Summary({store,uid,sessionId}){
 if(!store||typeof store.runTransaction!=='function'||typeof store.doc!=='function'||!uid||!sessionId)throw Error('Parâmetros ausentes');
 const parent=store.doc(`users/${uid}/sessions/${sessionId}`);
 const target=store.doc(`users/${uid}/sessionSummaries/${sessionId}`);
 const children=Array.from({length:12},(_,index)=>store.doc(`users/${uid}/sessions/${sessionId}/exercises/${index}`));
 return store.runTransaction(async tx=>{
  const [root,previous,...rows]=await Promise.all([tx.get(parent),tx.get(target),...children.map(ref=>tx.get(ref))]);
  if(!root.exists||rows.some(row=>!row.exists))throw Error('Sessão ou exercícios ausentes');
  const result=planCompletedV2Summary({metadata:root.data(),exercises:rows.map(row=>row.data()),existing:previous.exists?previous.data():null});
  if(result.action==='create')tx.create(target,result.summary);
  return result;
 });
}
