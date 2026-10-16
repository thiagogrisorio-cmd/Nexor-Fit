// Firestore does not support arrays nested directly inside arrays.
// Keep the application's [exercise][set] model, and wrap each exercise row
// in a map when crossing the Firestore document boundary.
export function encodeSessionForFirestore(session){
 if(!session||!Array.isArray(session.sets))throw Error('Sessão inválida');
 return {...session,sets:session.sets.map(row=>({items:row}))};
}
export function decodeSessionFromFirestore(session){
 if(!session||!Array.isArray(session.sets))throw Error('Sessão inválida');
 return {...session,sets:session.sets.map(row=>{
  if(!row||!Array.isArray(row.items))throw Error('Séries remotas inválidas');
  return row.items;
 })};
}
