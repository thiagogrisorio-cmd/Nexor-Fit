import {inventoryAuthUsers} from './v1-retirement-inventory-auth.js';
import {auditFirestoreSessionOrphans} from './v1-retirement-orphan-firestore.js';
import {buildV1RetirementAuditReport} from './v1-retirement-audit-report.js';

export async function assembleRetirementAudit(auth,db){
 const inventory=await inventoryAuthUsers({auth,db});
 const orphans=await auditFirestoreSessionOrphans({auth,db});
 return buildV1RetirementAuditReport({inventory,orphans});
}
