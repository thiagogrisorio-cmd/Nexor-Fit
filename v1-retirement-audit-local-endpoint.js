import {createProtectedAuditEndpoint} from './functions/audit-report-protected-endpoint.js';
import {assembleRetirementAudit} from './v1-retirement-audit-assembly.js';
import {assertAggregateReport} from './functions/audit-aggregate-check.js';
/** Test-only composition. Not a deployed Firebase Function. */
export function createLocalAuditEndpoint({adminAuth,db,allowedUids}){
 return createProtectedAuditEndpoint({adminAuth,allowedUids,generateReport:async()=>assertAggregateReport(await assembleRetirementAudit(adminAuth,db))});
}
