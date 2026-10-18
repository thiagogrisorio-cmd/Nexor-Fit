/** Pure read-only audit report. Never promotes readiness based on partial scans. */
export function buildV1RetirementAuditReport({inventory,orphans}){
 if(!inventory||!orphans||!inventory.counts||typeof inventory.counts!=='object')throw Error('Auditoria incompleta');
 const fields=['total','v1Active','v1Completed','v2Active','v2Completed','unknown'];
 const counts={};
 for(const field of fields){const value=inventory.counts[field];if(!Number.isSafeInteger(value)||value<0)throw Error('Contagem inválida');counts[field]=value;}
 if(fields.slice(1).reduce((sum,field)=>sum+counts[field],0)!==counts.total)throw Error('Total inconsistente');
 for(const field of ['ownersScanned','orphanOwners','sessionDocuments'])if(!Number.isSafeInteger(orphans[field])||orphans[field]<0)throw Error('Auditoria de órfãos inválida');
 if(orphans.orphanOwners>orphans.ownersScanned)throw Error('Órfãos inconsistentes');
 const complete=inventory.complete===true&&orphans.complete===true;
 const blockers=[];
 if(!inventory.complete)blockers.push('inventory-incomplete');
 if(!orphans.complete)blockers.push('orphan-audit-incomplete');
 if(counts.v1Active)blockers.push('v1-active-sessions');
 if(counts.unknown)blockers.push('unknown-session-schema');
 if(orphans.orphanOwners)blockers.push('orphan-session-owners');
 if(orphans.invalidPaths)blockers.push('invalid-session-paths');
 return {counts,orphanAudit:{ownersScanned:orphans.ownersScanned,orphanOwners:orphans.orphanOwners,sessionDocuments:orphans.sessionDocuments},complete,blockers,readyForReview:complete&&blockers.length===0,readOnly:true};
}
