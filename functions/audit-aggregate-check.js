const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key))&&keys.every(key=>Object.hasOwn(value,key));
const countKeys=['total','v1Active','v1Completed','v2Active','v2Completed','unknown'];
const orphanKeys=['ownersScanned','orphanOwners','sessionDocuments'];
export function assertAggregateReport(report){
 const fields=['counts','orphanAudit','complete','blockers','readyForReview','readOnly'];
 if(!exact(report,fields)||report.readOnly!==true||typeof report.complete!=='boolean'||typeof report.readyForReview!=='boolean'||!Array.isArray(report.blockers))throw Error('Invalid aggregate report');
 if(!exact(report.counts,countKeys)||!exact(report.orphanAudit,orphanKeys))throw Error('Invalid aggregate fields');
 for(const value of [...Object.values(report.counts),...Object.values(report.orphanAudit)])if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid aggregate count');
 if(countKeys.slice(1).reduce((sum,key)=>sum+report.counts[key],0)!==report.counts.total)throw Error('Invalid aggregate total');
 if(report.orphanAudit.orphanOwners>report.orphanAudit.ownersScanned)throw Error('Invalid orphan count');
 const allowed=['inventory-incomplete','orphan-audit-incomplete','v1-active-sessions','unknown-session-schema','orphan-session-owners','invalid-session-paths'];
 if(report.blockers.some(item=>!allowed.includes(item))||new Set(report.blockers).size!==report.blockers.length)throw Error('Invalid blockers');
 if(report.readyForReview&&(!report.complete||report.blockers.length))throw Error('Invalid readiness');
 return report;
}
