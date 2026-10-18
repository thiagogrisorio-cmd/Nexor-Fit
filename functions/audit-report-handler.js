/** Emulator-only administrative report handler with server-side token verification. */
export function createAuditReportHandler({verifyToken,authorize,makeReport}){
 if(typeof verifyToken!=='function'||typeof authorize!=='function'||typeof makeReport!=='function')throw Error('Dependências inválidas');
 return async function handle(request,response){
  const fail=(status,message)=>response.status(status).json({error:message});
  if(request.method!=='POST')return fail(405,'Método não permitido');
  const header=request.headers?.authorization;
  if(typeof header!=='string'||!header.startsWith('Bearer ')||!header.slice(7).trim())return fail(401,'Token ausente');
  let actor;
  try{actor=await verifyToken(header.slice(7));}catch{return fail(401,'Token inválido');}
  try{authorize({actor,environment:'emulator'});}catch{return fail(403,'Acesso negado');}
  try{const report=await makeReport();return response.status(200).json(report);}catch{return fail(503,'Relatório indisponível');}
 };
}
