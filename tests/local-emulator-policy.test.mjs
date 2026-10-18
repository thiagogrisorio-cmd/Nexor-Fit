import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldUseLocalEmulators} from '../local-emulator-policy.js';
test('local emulator mode requires explicit opt-in on loopback',()=>{
 for(const hostname of ['localhost','127.0.0.1','[::1]']){
  assert.equal(shouldUseLocalEmulators({hostname,search:'?nexorEmulators=1'}),true);
  assert.equal(shouldUseLocalEmulators({hostname,search:''}),false);
  assert.equal(shouldUseLocalEmulators({hostname,search:'?nexorEmulators=0'}),false);
 }
});
test('production and deceptive domains cannot activate emulator mode',()=>{
 for(const hostname of ['nexor-fit-app.web.app','nexor-fit-app.firebaseapp.com','localhost.example.com','127.0.0.1.attacker.com','example.com',''])
  assert.equal(shouldUseLocalEmulators({hostname,search:'?nexorEmulators=1'}),false);
});
