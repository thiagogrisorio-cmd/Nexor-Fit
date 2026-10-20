/**
 * Firestore-safe dynamic session codec.
 * Firestore rejects nested arrays; each exercise row is wrapped in a map.
 * This is an opt-in codec and never migrates legacy session documents.
 */
export function encodeDynamicSession(session){
 if(!session||!Array.isArray(session.sets)||!Array.isArray(session.prescription?.exercises))throw Error('Sessão inválida');
 if(session.sets.length!==session.prescription.exercises.length)throw Error('Quantidade de exercícios incompatível');
 const sets=session.sets.map((row,i)=>{
  if(!Array.isArray(row)||row.length!==session.prescription.exercises[i].sets)throw Error('Séries incompatíveis');
  return {items:row.map(set=>{
   if(typeof set?.done!=='boolean'||!(set.completedAt===null||typeof set.completedAt==='string'))throw Error('Série inválida');
   const value={done:set.done,completedAt:set.completedAt};
   if(set.weightKg!==undefined){
    if(typeof set.weightKg!=='number'||!Number.isFinite(set.weightKg)||set.weightKg<0||set.weightKg>2000)throw Error('Carga inválida');
    value.weightKg=set.weightKg;
   }
   return value;
  })};
 });
 return {...structuredClone(session),sets};
}
export function decodeDynamicSession(document){
 if(!document||!Array.isArray(document.sets)||!Array.isArray(document.prescription?.exercises))throw Error('Sessão inválida');
 const decoded={...structuredClone(document),sets:document.sets.map(row=>{
  if(!row||!Array.isArray(row.items))throw Error('Séries inválidas');
  return structuredClone(row.items);
 })};
 // Reuse encoder validation for symmetric bounds and shape.
 encodeDynamicSession(decoded);
 return decoded;
}
