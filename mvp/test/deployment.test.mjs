import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const password='deployment-test-password-123';

test('운영 원점의 경로·인증 정보 차단 및 저장 경로 누락 시 시작 거절',()=>{
 for(const publicOrigin of ['https://','https://site.example/path','https://user:secret@site.example','https://site.example?key=secret','https://site.example/#x'])assert.throws(()=>createApp({adminPassword:password,production:true,publicOrigin}));
 const env={...process.env,NODE_ENV:'production',PUBLIC_ORIGIN:'https://site.example',ADMIN_PASSWORD:password};delete env.DATA_DIR;
 const run=spawnSync(process.execPath,['server.mjs'],{cwd:root,env,encoding:'utf8',timeout:5000});assert.notEqual(run.status,0);assert.match(run.stderr,/DATA_DIR/);
});

test('실행 중 WAL 데이터를 일관된 스냅샷으로 백업·복원하고 기존 백업 덮어쓰기 차단',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ulim-backup-'));const source=path.join(dir,'live.sqlite'),dest=path.join(dir,"backup's.sqlite");let db;
 try{db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE records(value TEXT);');db.prepare('INSERT INTO records VALUES(?)').run('아직 WAL에 있는 등록 기록');
 const run=()=>spawnSync(process.execPath,['scripts/backup.mjs',source,dest],{cwd:root,encoding:'utf8',timeout:10000});
 const result=run();assert.equal(result.status,0,result.stderr);const snapshot=new DatabaseSync(dest,{readOnly:true});assert.equal(snapshot.prepare('SELECT value FROM records').get().value,'아직 WAL에 있는 등록 기록');snapshot.close();assert.equal(statSync(dest).mode&0o777,0o600);
 const bytes=readFileSync(dest);assert.notEqual(run().status,0);assert.deepEqual(readFileSync(dest),bytes);
 const restored=path.join(dir,'restored.sqlite');writeFileSync(restored,bytes,{mode:0o600});const recovered=new DatabaseSync(restored);assert.equal(recovered.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(recovered.prepare('SELECT count(*) n FROM records').get().n,1);recovered.close();
 }finally{db?.close();rmSync(dir,{recursive:true,force:true})}
});

test('재시작 후 전문가 계정·비공개 경력·이력서 보존',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ulim-member-persist-'));const dbPath=path.join(dir,'ulim.sqlite');let app;
 const start=async()=>{app=createApp({dbPath,adminPassword:password});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${app.server.address().port}`};
 const call=async(origin,route,data,auth={})=>{const r=await fetch(origin+route,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:auth.cookie||'','X-CSRF-Token':auth.csrf||''},body:data?JSON.stringify(data):undefined});return{status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()}};
 try{let origin=await start();const reg=await call(origin,'/api/members/register',{name:'격리 테스트',email:'persist@example.com',role:'expert',password,consent:true});assert.equal(reg.status,201);const auth={cookie:reg.cookie,csrf:reg.data.csrf};
 const pdf=await call(origin,'/api/expert-resume',{base64:Buffer.from('%PDF-1.4\nPRIVATE-QA').toString('base64')},auth);assert.equal(pdf.status,200);
 const data={displayName:'테스트',headline:'검증용 업무',bio:'실제 전문가가 아닌 격리된 영속성 테스트용 프로필입니다.',industries:['제조'],jobs:['운영'],topics:['업무가 어떤가요?'],years:5,availability:'평일',method:'온라인',price:null,showCompanies:false,careers:[{company:'비공개 회사',industry:'제조',role:'운영',years:'5년',work:'실제 업무를 설명하는 테스트'}]};
 const saved=await fetch(origin+'/api/expert-profile',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json',Cookie:auth.cookie,'X-CSRF-Token':auth.csrf},body:JSON.stringify({data,version:null,submit:true,participationConsent:true})});assert.equal(saved.status,200);
 await app.close();app=null;origin=await start();const login=await call(origin,'/api/members/login',{email:'persist@example.com',password});assert.equal(login.status,200);const after={cookie:login.cookie,csrf:login.data.csrf};const profile=await call(origin,'/api/expert-profile',null,after);assert.equal(profile.data.profile.status,'pending');assert.equal(profile.data.profile.data.careers[0].company,'비공개 회사');assert.equal(profile.data.hasResume,true);assert.equal((await call(origin,'/api/experts')).data.items.length,0);
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true})}
});
