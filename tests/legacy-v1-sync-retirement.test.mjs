import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../offline-sync-worker.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../session-ui.js',import.meta.url),'utf8');
test('retired V1 offline replay preserves pending operations without Firestore writes',()=>{
 assert.match(worker,/legacy-v1-writes-retired/);
 assert.match(worker,/synced:0/);
 assert.doesNotMatch(worker,/runTransaction|removeOfflineOperation|tx\.set/);
});
test('V1 editing remains blocked at the session UI boundary',()=>{
 assert.match(ui,/const v2PilotRequested=\(\)=>true/);
 assert.match(ui,/if\(v2ReadOnly\|\|v2PilotRequested\(\)\)throw Error\('Gravação V1 bloqueada/);
});

test('legacy queue recovery requirement is visible without deleting local edits',()=>{
 const status=readFileSync(new URL('../offline-status.js',import.meta.url),'utf8');
 assert.match(status,/legacy-v1-writes-retired/);
 assert.match(status,/Alterações antigas preservadas no dispositivo/);
 assert.match(ui,/Reenvio V1 desativado por segurança; dados locais preservados para recuperação/);
});
