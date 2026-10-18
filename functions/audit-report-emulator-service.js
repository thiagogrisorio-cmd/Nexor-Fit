import {createAuditReportHandler} from './audit-report-handler.js';
/** Wiring for local Firebase emulators only; never export as a deployed Function. */
export function createEmulatorAuditService({adminAuth,allowedUids,buildReport}){
 if(!adminAuth||typeof adminAuth.verifyIdToken!=='function'||typeof adminAuth.getUser!=='function'||!Array.isArray(allowedUids)||typeof buildReport!=='function')throw Error('Dependências inválidas');
 return createAuditReportHandler({
  verifyToken:async token=>{
   const decoded=await adminAuth.verifyIdToken(token,true);
   const user=await adminAuth.getUser(decoded.uid);
   return {uid:user.uid,emailVerified:user.emailVerified===true,disabled:user.disabled===true};
  },
  authorize:({actor,environment})=>{
   if(environment!=='emulator'||actor.disabled||!actor.emailVerified||!allowedUids.includes(actor.uid))throw Error('Acesso negado');
  },
  makeReport:buildReport
 });
}
