import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../session-ui.js',import.meta.url),'utf8');
test('V2 offline pilot prepares revision baselines after session hydration',()=>{
 assert.match(ui,/if\(session&&v2PilotEnabled\(\)\)primeV2OfflineBaselines\(accountUid,snapshot\.id\)/);
 assert.match(ui,/queueV2SetEdit\(\{uid:account[\s\S]*?baseRevision:baseline\.revision,baseCompletedAt:set\.completedAt/);
});
test('V2 offline pilot preserves queued preview during reconnect',()=>{
 assert.match(ui,/if\(v2ReadOnly&&session\?\.status==='active'/);
 assert.match(ui,/pending\.some\(item=>item\.sessionId===session\.id\)/);
 assert.match(ui,/Alterações V2 aguardando sincronização/);
});
test('V2 async snapshot validates identity again after reading pending queue',()=>{
 assert.match(ui,/const pendingV2=await listPendingV2Edits\(accountUid\);\s*if\(token!==v2LoadToken/);
});
test('V2 pilot refuses conflicting online edits',()=>{
 assert.match(ui,/if\(pending\.some\(item=>item\.sessionId===id&&item\.exerciseIndex===exerciseIndex\)\)throw Error/);
 assert.match(ui,/Sincronize as alterações V2 pendentes antes de concluir/);
});

test('V2 pilot blocks all legacy V1 write paths but retains legacy reads',()=>{
 assert.match(ui,/if\(v2ReadOnly\|\|v2PilotRequested\(\)\)throw Error\('Gravação V1 bloqueada/g);
 assert.match(ui,/const legacyBlocked=!v2ReadOnly&&v2PilotRequested\(\)/);
 assert.match(ui,/Treino V1 preservado para leitura/);
 assert.match(ui,/loadedHistory=rows\.docs\.filter\(row=>row\.data\(\)\.schemaVersion!==2\)/);
});

test('V2 offline edit rechecks owner and session after pending lookup',()=>{
 assert.match(ui,/if\(uid!==account\|\|auth\.currentUser\?\.uid!==account\|\|session\?\.id!==id\|\|navigator\.onLine\)throw Error/);
});

test('V2 sessions cannot be replaced by V1 offline cache during hydration',()=>{
 assert.match(ui,/if\(accountUid&&!v2ReadOnly\)\{\s*const cachedId/);
 assert.match(ui,/if\(accountUid&&session\?\.status==='active'&&!v2ReadOnly\)await cacheOnlineWorkout/);
});

test('V2 editing notice reflects pilot and offline readiness',()=>{
 assert.match(ui,/Treino V2 pronto para edição/);
 assert.match(ui,/Treino V2 offline: edições exigem revisões previamente carregadas/);
 assert.match(ui,/Edição requer piloto autorizado/);
 assert.doesNotMatch(ui,/Edição ainda indisponível/);
});

test('completed V2 workouts appear in history without the pilot flag',()=>{
 assert.match(ui,/V2 history remains visible without the pilot flag/);
 assert.match(ui,/for\(const row of rows\.docs\.filter\(item=>item\.data\(\)\.schemaVersion===2&&item\.data\(\)\.status==='completed'\)\)/);
 assert.match(ui,/const summary=await loadV2Summary/);
});
