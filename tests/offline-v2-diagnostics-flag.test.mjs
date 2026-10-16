import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('V2 diagnostics opt-in does not activate automatic V2 sync',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/nexorV2Diagnostics/);
 assert.match(html,/installV2RecoveryDiagnostics/);
 assert.doesNotMatch(html,/startV2OfflineIntegration\(/);
});
