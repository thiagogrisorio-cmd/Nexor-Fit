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

test('V2 is the default session write path, without a pilot query flag',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(ui,/const v2PilotRequested=\(\)=>true/);
 assert.match(ui,/const pilotRequested=v2PilotRequested\(\)/);
 assert.match(ui,/else throw Error\('Início V1 desativado/);
 assert.match(html,/startV2OfflineIntegration\(\{/);
 assert.doesNotMatch(html,/if\(new URLSearchParams\(location\.search\)\.get\('nexorV2StartPilot'\)===/);
});

test('active V1 sessions migrate atomically before V2 editing is enabled',()=>{
 assert.match(ui,/import \{migrateLegacySessionAtomically\} from '\.\/session-v2-migration-transaction\.js'/);
 assert.match(ui,/result\.format==='v1'&&result\.status==='ready'&&result\.session\?\.status==='active'&&navigator\.onLine/);
 assert.match(ui,/pendingLegacy\.some\(item=>item\.sessionId===id\)/);
 assert.match(ui,/migrateLegacySessionAtomically\(\{db,uid:accountUid,sessionId:id,doc,runTransaction,serverTimestamp\}\)/);
 assert.match(ui,/migration\.status==='migrated'\|\|migration\.status==='already-v2'/);
});

test('live legacy snapshots cannot bypass the guarded V1 to V2 migration',()=>{
 assert.match(ui,/if\(snapshot\.exists\(\)&&snapshot\.data\(\)\.schemaVersion!==2\)\{/);
 assert.match(ui,/Treino legado detectado\. Migração V2 necessária antes de editar/);
 assert.match(ui,/if\(navigator\.onLine&&!legacySnapshotReloadInFlight\)/);
 assert.match(ui,/legacySnapshotReloadInFlight=true/);
 assert.match(ui,/\.finally\(\(\)=>\{legacySnapshotReloadInFlight=false;\}\)/);
});

test('failed V1 migration preserves the legacy workout read path',()=>{
 assert.match(ui,/try\{\s*const migration=await migrateLegacySessionAtomically/);
 assert.match(ui,/catch\(error\)\{\s*console\.warn\('Nexor V1 migration:'/);
 assert.match(ui,/Treino legado preservado\. Não foi possível migrar/);
 assert.match(ui,/loadedSession=result\.status==='ready'\?result\.session:null/);
});

test('live snapshot ignores stale account or session after asynchronous queue lookup',()=>{
 assert.match(ui,/pendingOfflineOperations\(accountUid\)\.then\(pending=>\{\s*if\(uid!==accountUid\|\|auth\.currentUser\?\.uid!==accountUid\|\|observedSessionId!==id\|\|saving\)return;/);
 assert.match(ui,/if\(pending\.some\(item=>item\.sessionId===id\)\)return;\s*listPendingV2Edits\(accountUid\)\.then\(v2Pending=>\{/);
 assert.match(ui,/if\(v2Pending\.some\(item=>item\.sessionId===id\)\)return;\s*applyRemoteSession\(snapshot,accountUid\)/);
});

const cloudSync=readFileSync(new URL('../sync.js',import.meta.url),'utf8');
test('offline mode keeps V2 workout controls reachable but prevents legacy cloud writes',()=>{
 assert.match(cloudSync,/el\('workoutApp'\)\.inert = !!user && \(!ready \|\| busy \|\| failed\)/);
 assert.match(cloudSync,/if\(busy \|\| !ready \|\| failed \|\| !navigator\.onLine\)/);
 assert.doesNotMatch(cloudSync,/\.inert = [^;]*!navigator\.onLine/);
});

test('offline focus reload preserves authenticated hydrated V2 workout',()=>{
 assert.match(ui,/async function load\(\)\{[\s\S]*?if\(!navigator\.onLine&&v2ReadOnly&&session\?\.status==='active'&&uid&&uid===auth\.currentUser\?\.uid\)\{/);
 assert.match(ui,/Treino V2 offline\. Edições exigem revisões previamente carregadas/);
});

test('offline V2 controls require a baseline for the active session and exercise',()=>{
 assert.match(ui,/session\.sets\.some\(\(_,i\)=>v2ExerciseBaselines\.has\(v2BaselineKey\(uid,session\.id,i\)\)\)/);
 assert.match(ui,/!navigator\.onLine&&!v2ExerciseBaselines\.has\(v2BaselineKey\(uid,session\.id,i\)\)/);
 assert.doesNotMatch(ui,/navigator\.onLine\|\|v2ExerciseBaselines\.size>0/);
});

test('V2 set render cache invalidates on connectivity and per-exercise baseline changes',()=>{
 assert.match(ui,/const offlineBaselineIndexes=v2ReadOnly&&uid\?session\.sets\.map\(\(_,i\)=>v2ExerciseBaselines\.has\(v2BaselineKey\(uid,session\.id,i\)\)\):\[\]/);
 assert.match(ui,/const setKey=JSON\.stringify\(\[session\.id,session\.sets,saving,offlineSaving,v2ReadOnly,pilotEdit,legacyBlocked,v2PendingCount,navigator\.onLine,offlineBaselineIndexes\]\)/);
});

test('successful online V2 edit invalidates the prior offline revision baseline',()=>{
 assert.match(ui,/await updateV2Set\(\{db,uid:account,sessionId:id,exerciseIndex,setIndex[\s\S]*?\}\);\s*\/\/ The old revision cannot authorize an offline edit after this online write\.\s*v2ExerciseBaselines\.delete\(v2BaselineKey\(account,id,exerciseIndex\)\)/);
});

test('V2 baseline refresh discards stale rows before accepting new revisions',()=>{
 assert.match(ui,/if\(uid!==account\|\|auth\.currentUser\?\.uid!==account\|\|session\?\.id!==id\)return;\s*\/\/ Replace the entire snapshot:[^\n]*\n\s*for\(let index=0;index<12;index\+\+\)v2ExerciseBaselines\.delete\(v2BaselineKey\(account,id,index\)\);\s*for\(let index=0;index<12;index\+\+\)\{/);
});

test('live V2 snapshot hides stale workout controls until complete hydration',()=>{
 assert.match(ui,/if\(snapshot\.exists\(\)&&snapshot\.data\(\)\.schemaVersion===2\)\{\s*v2ReadOnly=true;\s*\/\/ Fail closed until the complete V2 exercise snapshot has been validated\.\s*session=null;/);
 assert.match(ui,/session=result\.status==='ready'&&result\.session\.status==='active'\?result\.session:null/);
});

test('queued V2 edits preserve local preview but lock additional edits and finish',()=>{
 assert.match(ui,/session=previousV2Session;\s*render\(\);return;/);
 assert.match(ui,/const pilotEdit=v2ReadOnly&&v2PendingCount===0&&v2PilotEnabledOffline\(\)/);
 assert.match(ui,/v2PilotEnabled\(\)&&!!uid&&navigator\.onLine&&v2PendingCount===0/);
});
