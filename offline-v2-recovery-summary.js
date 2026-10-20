export function summarizeV2Recovery(report){
 const rows=report?.results||[];
 const counts={retry:0,review:0,applied:0,conflict:0,unavailable:0};
 for(const item of rows){
  if(item.status==='safe-to-retry')counts.retry++;
  else if(item.status==='candidate-already-applied')counts.applied++;
  else if(item.status==='conflict')counts.conflict++;
  else if(item.status==='unavailable')counts.unavailable++;
  else counts.review++;
 }
 return {total:rows.length,counts,requiresAttention:counts.review+counts.applied+counts.conflict+counts.unavailable};
}
