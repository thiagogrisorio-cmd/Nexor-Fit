export function makeAuditProvider({scanSessions,scanOwners,combine}){
 return async function report(){
  const sessions=await scanSessions();
  const owners=await scanOwners();
  return combine({inventory:sessions,orphans:owners});
 };
}
