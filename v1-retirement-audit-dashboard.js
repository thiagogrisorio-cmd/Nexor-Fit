/** Pure view model for an offline, read-only administrator audit dashboard. */
export function auditDashboardModel(report){
 if(!report||report.readOnly!==true||!report.counts||!Array.isArray(report.blockers))throw Error('Relatório inválido');
 const labels={total:'Sessões analisadas',v1Active:'V1 ativas',v1Completed:'V1 concluídas',v2Active:'V2 ativas',v2Completed:'V2 concluídas',unknown:'Esquema desconhecido'};
 const metrics=Object.entries(labels).map(([key,label])=>{
  const value=report.counts[key];
  if(!Number.isSafeInteger(value)||value<0)throw Error('Indicador inválido');
  return {key,label,value};
 });
 const blockers={ 'inventory-incomplete':'Inventário incompleto','orphan-audit-incomplete':'Auditoria de órfãos incompleta','v1-active-sessions':'Existem sessões V1 ativas','unknown-session-schema':'Existem esquemas desconhecidos','orphan-session-owners':'Existem proprietários ausentes','invalid-session-paths':'Existem caminhos de sessões inválidos'};
 if(report.blockers.some(code=>!Object.hasOwn(blockers,code)))throw Error('Bloqueio desconhecido');
 const orphanOwners=report.orphanAudit?.orphanOwners;
 if(!Number.isSafeInteger(orphanOwners)||orphanOwners<0)throw Error('Órfãos inválidos');
 return {metrics,orphanOwners,blockers:report.blockers.map(code=>({code,label:blockers[code]})),complete:report.complete===true,reviewOnly:report.readyForReview===true&&report.complete===true&&report.blockers.length===0};
}
