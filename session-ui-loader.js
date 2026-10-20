import {decodeWorkoutForUI} from './session-ui-compatibility.js';
export async function loadWorkoutForUI({db,uid,sessionId,doc,getDoc}){
 if(!db||!uid||!sessionId||!doc||!getDoc)throw Error('Parâmetros ausentes');
 const root=await getDoc(doc(db,'users',uid,'sessions',sessionId));
 if(!root.exists())return {status:'missing'};
 const metadata=root.data();
 if(metadata.schemaVersion!==2)return {status:'ready',...decodeWorkoutForUI({metadata})};
 const children=await Promise.all(Array.from({length:12},(_,i)=>
  getDoc(doc(db,'users',uid,'sessions',sessionId,'exercises',String(i)))));
 if(children.some(s=>!s.exists()))return {status:'incomplete',readOnly:true};
 return {status:'ready',...decodeWorkoutForUI({metadata,exerciseDocuments:children.map(s=>s.data())})};
}
