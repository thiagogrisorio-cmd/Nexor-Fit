/** Fail-closed policy for experimental audit report access. */
export function authorizeAuditReport({actor,allowedUids,environment}){
 if(environment!=='emulator')throw Error('Ambiente não autorizado');
 if(!actor||typeof actor.uid!=='string'||!actor.uid||actor.emailVerified!==true||actor.disabled===true)throw Error('Acesso negado');
 if(!Array.isArray(allowedUids)||!allowedUids.includes(actor.uid))throw Error('Acesso negado');
 return {authorized:true,readOnly:true,environment:'emulator'};
}
