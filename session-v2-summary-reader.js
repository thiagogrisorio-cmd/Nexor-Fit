/** Read-only client adapter for privileged V2 workout summaries. */
export async function loadV2Summary({db,uid,sessionId,doc,getDoc}){
 if(!db||!uid||!sessionId||!doc||!getDoc)throw Error('Parâmetros de resumo ausentes');
 const snapshot=await getDoc(doc(db,'users',uid,'sessionSummaries',sessionId));
 if(!snapshot.exists())return null;
 const data=snapshot.data();
 if(data.sessionId!==sessionId||!Number.isInteger(data.completedSets)||data.completedSets<0||data.completedSets>24||data.totalSets!==24)throw Error('Resumo V2 inválido');
 return {completedSets:data.completedSets,totalSets:24};
}
