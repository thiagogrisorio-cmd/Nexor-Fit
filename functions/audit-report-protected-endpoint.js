import {createEmulatorAuditService} from './audit-report-emulator-service.js';
/** Compose authenticated audit endpoint with an injected read-only report generator. */
export function createProtectedAuditEndpoint({adminAuth,allowedUids,generateReport}){
 if(typeof generateReport!=='function')throw Error('Gerador inválido');
 return createEmulatorAuditService({adminAuth,allowedUids,buildReport:generateReport});
}
