/** Explicit readiness gates for disabling legacy V1 writes. No automatic deployment. */
export function assessV1Retirement(gates){
 const required=['inventoryComplete','backupsVerified','v1ActiveSessionsResolved','v2BrowserPilotVerified','v2OfflineStrategyVerified','v2RulesVerified','rollbackRehearsed'];
 if(!gates||typeof gates!=='object'||Array.isArray(gates))throw Error('Checklist inválido');
 const missing=required.filter(key=>gates[key]!==true);
 return {ready:missing.length===0,missing,required};
}
