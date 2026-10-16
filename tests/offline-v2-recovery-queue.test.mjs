import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectV2RecoveryQueue} from '../offline-v2-recovery-queue.js';
test('requires account scope',async()=>assert.rejects(inspectV2RecoveryQueue({uid:'',readRemoteExercise:async()=>({})}),/Diagnóstico incompleto/));
