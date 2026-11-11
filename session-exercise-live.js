/** Subscribe to child revisions; ignore initial snapshots and coalesce remote bursts. */
export function watchExerciseRevisions({db,uid,sessionId,doc,onSnapshot,onChange,onError=()=>{},schedule=setTimeout,cancel=clearTimeout}){
 let stopped=false,timer=null;const revisions=new Map();
 const stops=Array.from({length:12},(_,index)=>onSnapshot(doc(db,'users',uid,'sessions',sessionId,'exercises',String(index)),snapshot=>{
  if(stopped||snapshot.metadata?.hasPendingWrites)return;
  const revision=snapshot.exists()?snapshot.data().revision:'missing';
  const initialized=revisions.has(index),previous=revisions.get(index);revisions.set(index,revision);
  if(!initialized||previous===revision)return;
  if(timer!==null)cancel(timer);
  timer=schedule(()=>{timer=null;if(!stopped)onChange();},80);
 },error=>{if(!stopped)onError(error)}));
 return ()=>{stopped=true;if(timer!==null)cancel(timer);stops.forEach(stop=>stop());};
}
