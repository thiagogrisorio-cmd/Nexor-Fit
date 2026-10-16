import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectV2PendingEdits} from '../offline-v2-queue-preflight.js';
const op=(id,exerciseIndex)=>({id,kind:'v2-mark-set',sessionId:'s',exerciseIndex,setIndex:0,baseRevision:0});
test('independent exercise edits may replay',()=>assert.equal(inspectV2PendingEdits([op('a',0),op('b',1)]).safeToReplay,true));
test('two offline edits to same exercise require rebase',()=>assert.equal(inspectV2PendingEdits([op('a',0),op('b',0)]).safeToReplay,false));
test('invalid offline operations cannot pass preflight',()=>assert.equal(inspectV2PendingEdits([null]).safeToReplay,false));
