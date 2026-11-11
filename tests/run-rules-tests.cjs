const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
(async()=>{
 const host=process.env.FIRESTORE_EMULATOR_HOST;
 if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host||''))throw Error('A local Firestore emulator is required');
 const files=JSON.parse(fs.readFileSync(path.join(__dirname,'rules-suite.json'),'utf8'));
 const projects=new Set();
 for(const file of files){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  for(const match of source.matchAll(/['"](demo-nexor-[a-z0-9-]+)['"]/g))projects.add(match[1]);
 }
 for(const project of projects){
  const response=await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'});
  if(!response.ok)throw Error('Could not reset disposable emulator project: '+project);
 }
 console.log(`Reset ${projects.size} disposable emulator projects; executing rules tests serially.`);
 const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{stdio:'inherit',cwd:path.join(__dirname,'..'),env:process.env});
 if(result.error)throw result.error;process.exitCode=result.status??1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
