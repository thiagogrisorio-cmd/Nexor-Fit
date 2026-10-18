import {createProtectedAuditEndpoint} from './audit-report-protected-endpoint.js';
import {assertAggregateReport} from './audit-aggregate-check.js';
/** Isolated dependency-injected audit factory. Not exported from Functions entrypoint. */
export function createAuditEmulatorBundle({adminAuth,allowedUids,generateReport}){
 if(!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Emulators required');
 if(typeof generateReport!=='function')throw Error('Read-only generator required');
 return createProtectedAuditEndpoint({
  adminAuth,allowedUids,
  generateReport:async()=>assertAggregateReport(await generateReport())
 });
}
