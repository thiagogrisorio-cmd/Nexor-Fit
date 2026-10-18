/** Central policy for the existing V2 development pilot. Not a production rollout flag. */
export function canUseV2WorkoutPilot({search='',uid=null,currentUid=null,online=false}={}){
 return new URLSearchParams(search).get('nexorV2StartPilot')==='1'
  && typeof uid==='string'&&uid.length>0
  && uid===currentUid
  && online===true;
}
