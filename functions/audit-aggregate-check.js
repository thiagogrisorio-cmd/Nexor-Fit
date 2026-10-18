export function assertAggregateReport(report){
 if(!report||report.readOnly!==true||!report.counts||!Array.isArray(report.blockers))throw new Error('Invalid aggregate report');
 return report;
}
