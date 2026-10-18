import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../session-ui.js',import.meta.url),'utf8');
test('V2 offline pilot prepares revision baselines after session hydration',()=>{
 assert.match(ui,/if\(session&&v2PilotEnabled\(\)\)primeV2OfflineBaselines\(accountUid,snapshot\.id\)/);
 assert.match(ui,/queueV2SetEdit\(\{uid:account[\s\S]*?baseRevision:baseline\.revision,baseCompletedAt:set\.completedAt/);
});
test('V2 offline pilot preserves queued preview during refresh',()=>{
 assert.match(ui,/if\(!navigator\.onLine&&v2ReadOnly&&session\?\.status==='active'/);
 assert.match(ui,/pending\.some\(item=>item\.sessionId===session\.id\)\)\{v2PendingCount=pending\.length;render\(\);return;/);
});
test('V2 async snapshot validates identity again after reading pending queue',()=>{
 assert.match(ui,/const pendingV2=await listPendingV2Edits\\(accountUid\\);\\s*if\\(token!==v2LoadToken/);
});
test('V2 pilot refuses conflicting online edits',()=>{
 assert.match(ui,/if\(pending\.some\(item=>item\.sessionId===id&&item\.exerciseIndex===exerciseIndex\)\)throw Error/);
 assert.match(ui,/Sincronize as alterações V2 pendentes antes de concluir/);
});
