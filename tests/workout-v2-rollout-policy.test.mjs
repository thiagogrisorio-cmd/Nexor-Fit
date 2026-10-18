import test from 'node:test';
import assert from 'node:assert/strict';
import {canUseV2WorkoutPilot} from '../workout-v2-rollout-policy.js';
const base={search:'?nexorV2StartPilot=1',uid:'member',currentUid:'member',online:true};
test('V2 pilot requires explicit flag, matching authenticated owner and connectivity',()=>{
 assert.equal(canUseV2WorkoutPilot(base),true);
 for(const overrides of [{search:''},{search:'?nexorV2StartPilot=0'},{uid:null},{uid:''},{currentUid:null},{currentUid:'other'},{online:false}]){
  assert.equal(canUseV2WorkoutPilot({...base,...overrides}),false);
 }
 assert.equal(canUseV2WorkoutPilot(),false);
});
