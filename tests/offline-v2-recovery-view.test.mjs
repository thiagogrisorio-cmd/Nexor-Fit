import test from 'node:test';
import assert from 'node:assert/strict';
import {renderV2RecoveryStatus} from '../offline-v2-recovery-view.js';
test('hidden recovery UI reports signed-out status without network reads',async()=>{
 const target={textContent:''};
 const result=await renderV2RecoveryStatus({uid:null,target,readRemoteExercise:async()=>{throw Error('should not read');}});
 assert.equal(result,null);
 assert.match(target.textContent,/Entre na conta/);
});
