import {createProtectedAuditEndpoint} from './functions/audit-report-protected-endpoint.js';
import {assembleRetirementAudit} from './v1-retirement-audit-assembly.js';
import {assertAggregateReport} from './functions/audit-aggregate-check.js';
/** Test-only composition. Not a deployed Firebase Function. */
export function createLocalAuditEndpoint({adminAuth,db,allowedUids}){
 if(process.env.FIREBASE_AUTH_EMULATOR_HOST===undefined||process.env.FIRESTORE_EMULATOR_HOST===undefined)throw Error('Auditoria disponível somente com ambos emuladores ativos');
 return createProtectedAuditEndpoint({adminAuth,allowedUids,generateReport:async()=>assertAggregateReport(await assembleRetirementAudit(adminAuth,db))});
}
