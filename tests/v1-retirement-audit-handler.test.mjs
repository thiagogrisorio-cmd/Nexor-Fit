import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuditReportHandler} from '../functions/audit-report-handler.js';
const response=()=>({status(code){this.code=code;return this;},json(value){this.body=value;return this;}});
const authorized={uid:'admin',emailVerified:true};
test('handler requires bearer token and refuses unauthorized actor',async()=>{
 let reports=0;
 const handler=createAuditReportHandler({verifyToken:async token=>token==='valid'?authorized:Promise.reject(Error('invalid')),authorize:({actor})=>{if(actor.uid!=='admin')throw Error('denied');},makeReport:async()=>{reports++;return {readOnly:true};}});
 const noToken=response();await handler({method:'POST',headers:{}},noToken);assert.equal(noToken.code,401);
 const invalid=response();await handler({method:'POST',headers:{authorization:'Bearer bad'}},invalid);assert.equal(invalid.code,401);
 const method=response();await handler({method:'GET',headers:{authorization:'Bearer valid'}},method);assert.equal(method.code,405);
 assert.equal(reports,0);
 const ok=response();await handler({method:'POST',headers:{authorization:'Bearer valid'}},ok);assert.equal(ok.code,200);assert.equal(reports,1);
});
test('handler refuses denied actor without reading report',async()=>{
 let calls=0;
 const handler=createAuditReportHandler({verifyToken:async()=>({uid:'other'}),authorize:()=>{throw Error('denied');},makeReport:async()=>{calls++;}});
 const result=response();await handler({method:'POST',headers:{authorization:'Bearer token'}},result);
 assert.equal(result.code,403);assert.equal(calls,0);
});
