export function inspectV2PendingEdits(operations){
 if(!Array.isArray(operations))throw Error('Fila inválida');
 const groups=new Map();
 const issues=[];
 for(const item of operations){
  if(!item||item.kind!=='v2-mark-set'||!item.id||!item.sessionId) {issues.push('invalid');continue;}
  const key=item.sessionId+':'+item.exerciseIndex;
  groups.set(key,(groups.get(key)||0)+1);
 }
 for(const [key,count] of groups)if(count>1)issues.push('multiple-edits:'+key);
 return {safeToReplay:issues.length===0,issues};
}
