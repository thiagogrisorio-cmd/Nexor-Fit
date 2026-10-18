import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canUseV2WorkoutPilot} from '../workout-v2-rollout-policy.js';
const base={search:'?nexorV2StartPilot=1',uid:'member',currentUid:'member',online:true};
test('V2 pilot requires explicit flag, matching authenticated owner and connectivity',()=>{
 assert.equal(canUseV2WorkoutPilot(base),true);
 for(const overrides of [{search:''},{search:'?nexorV2StartPilot=0'},{uid:null},{uid:''},{currentUid:null},{currentUid:'other'},{online:false}]){
  assert.equal(canUseV2WorkoutPilot({...base,...overrides}),false);
 }
 assert.equal(canUseV2WorkoutPilot(),false);
});

test('pilot start never silently falls back to V1 when offline or signed out',()=>{
 const source=readFileSync(new URL('../session-ui.js',import.meta.url),'utf8');
 assert.match(source,/pilotRequested&&!pilot/);
 assert.match(source,/Nenhuma sessão V1 será criada/);
 assert.match(source,/if\(pilotRequested&&!pilot\)[\s\S]*?return;[\s\S]*?if\(pilot&&uid/);
});
