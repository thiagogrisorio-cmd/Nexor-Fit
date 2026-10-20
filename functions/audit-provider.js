import {assertAggregateReport} from './audit-aggregate-check.js';
export function makeAuditProvider({scanSessions,scanOwners,combine}){
 return async function report(){
  const sessions=await scanSessions();
  const owners=await scanOwners();
  return assertAggregateReport(combine({inventory:sessions,orphans:owners}));
 };
}
