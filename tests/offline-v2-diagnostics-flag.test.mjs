import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('V2 diagnostics opt-in does not activate automatic V2 sync',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/nexorV2Diagnostics/);
 assert.match(html,/installV2RecoveryDiagnostics/);
 assert.match(html,/get\('nexorV2StartPilot'\)===\x271\x27/);
 assert.match(html,/startV2OfflineIntegration\(/);
 assert.doesNotMatch(html,/if\(new URLSearchParams\(location.search\).get\('nexorV2Diagnostics'\)===\x271\x27\)\s*\{[^}]*startV2OfflineIntegration\(/);
});
