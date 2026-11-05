import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {INTAKE_CONSENT_VERSION} from '../expert-intake.mjs';
const password='intake-test-password-only';
const pdf=Buffer.from('%PDF-1.4\nISOLATED INTAKE TEST');
const input=()=>({name:'테스트 경험자',phone:'010-0000-0000',topics:'구매 직무 상담',base64:pdf.toString('base64'),consent:true,consentVersion:INTAKE_CONSENT_VERSION,version:null});
const data=()=>({displayName:'테스트 경험자',headline:'제조업 구매 경험',bio:'공급업체 관리와 구매 계획 실무 경험입니다.',industries:['제조'],jobs:['구매'],topics:['구매 직무는 어떤 일을 하나요?'],years:4,price:null,availability:'협의',method:'온라인',showCompanies:false,careers:[{company:'비공개 테스트 소속',industry:'제조',role:'구매',years:'2020~2024',work:'구매 계획과 공급업체 관리'}]});
async function setup(){
 const app=createApp({adminPassword:password,resumeDraftService:{available:false}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${app.server.address().port}`;
 const call=async(path,method='GET',data,session={})=>{const r=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:session.cookie||'','X-CSRF-Token':session.csrf||''},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer()),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const reg=async(role,email)=>{const r=await call('/api/members/register','POST',{name:'QA',email,role,password,consent:true,overseasConsent:true});assert.equal(r.status,201);return {cookie:r.cookie,csrf:r.data.csrf,id:r.data.user.id}};
 const login=await call('/api/admin/login','POST',{password});return {app,call,reg,admin:{cookie:login.cookie,csrf:login.data.csrf},stop:()=>app.close()};
}
test('이력서만 접수→운영자 초안→본인 확인→승인, 확인 없이 공개 불가',async()=>{
 const t=await setup();try{
  const ex=await t.reg('expert','e@example.com');let r=await t.call('/api/expert-intake','POST',input(),ex);assert.equal(r.status,200);assert.match(r.data.intake.receipt,/^EX-/);assert.equal(r.data.intake.status,'received');
  assert.equal(t.app.db.prepare('SELECT count(*) n FROM profiles').get().n,0);assert.equal((await t.call('/api/experts')).data.items.length,0);
  let listing=await t.call('/api/admin/expert-intakes','GET',undefined,t.admin);assert.equal(listing.data.items[0].email,'e@example.com');assert.equal(listing.data.items[0].hasResume,true);
  assert.deepEqual((await t.call('/api/admin/expert-intakes/'+ex.id+'/resume','GET',undefined,t.admin)).data,pdf);
  const draftPath='/api/admin/expert-intakes/'+ex.id+'/draft';
  r=await t.call(draftPath,'PUT',{data:{...data(),showCompanies:true},version:0,profileVersion:null},t.admin);assert.equal(r.status,200);assert.equal(r.data.profile.status,'awaiting_expert');assert.equal(r.data.profile.data.showCompanies,false);
  const review='/api/admin/experts/'+ex.id;assert.equal((await t.call(review,'PATCH',{status:'approved',version:0,reviewConfirmed:true},t.admin)).status,400);
  // Even forcing the legacy review state cannot bypass the expert's confirmation.
  assert.equal((await t.call(review,'PATCH',{status:'pending',version:0},t.admin)).status,200);
  assert.equal((await t.call(review,'PATCH',{status:'approved',version:1,reviewConfirmed:true},t.admin)).status,400);
  r=await t.call('/api/expert-profile','PUT',{data:data(),version:1,submit:true,participationConsent:true},ex);assert.equal(r.status,200);
  assert.equal((await t.call('/api/expert-intake','GET',undefined,ex)).data.intake.status,'confirmed');
  assert.equal((await t.call(review,'PATCH',{status:'approved',version:r.data.profile.version,reviewConfirmed:true},t.admin)).status,200);
  const publicList=(await t.call('/api/experts')).data.items;assert.equal(publicList.length,1);assert.ok(!JSON.stringify(publicList).includes('비공개 테스트 소속'));assert.ok(!JSON.stringify(publicList).includes('010-0000'));
  assert.equal((await t.call('/api/expert-intake','POST',{...input(),version:2},ex)).status,409);
  assert.equal((await t.call(draftPath,'PUT',{data:data(),version:2,profileVersion:3},t.admin)).status,409);
 }finally{await t.stop()}
});
test('인증·CSRF·역할·동의·PDF·접수 버전 확인, 타인 신청/PDF 비공개',async()=>{
 const t=await setup();try{
  const ex=await t.reg('expert','e@example.com'),other=await t.reg('expert','o@example.com'),customer=await t.reg('customer','c@example.com');const path='/api/expert-intake';
  assert.equal((await t.call(path,'POST',input())).status,401);assert.equal((await t.call(path,'POST',input(),customer)).status,403);assert.equal((await t.call(path,'POST',input(),{cookie:ex.cookie})).status,403);
  for(const change of [{consent:false},{consentVersion:'old'},{base64:''},{base64:Buffer.from('bad pdf').toString('base64')},{name:''}])assert.equal((await t.call(path,'POST',{...input(),...change},ex)).status,400);
  assert.equal((await t.call(path,'POST',input(),ex)).status,200);assert.equal((await t.call(path,'POST',input(),ex)).status,409);
  assert.equal((await t.call(path,'GET',undefined,other)).data.intake,null);assert.equal((await t.call('/api/expert-resume','GET',undefined,other)).status,404);
  assert.equal((await t.call('/api/admin/expert-intakes','GET',undefined,ex)).status,401);assert.equal((await t.call('/api/admin/expert-intakes/'+ex.id+'/resume','GET',undefined,other)).status,401);
  assert.equal((await t.call('/api/expert-resume','DELETE',{},ex)).status,409);
  assert.equal((await t.call('/api/expert-resume','POST',{base64:pdf.toString('base64')},ex)).status,409);
 }finally{await t.stop()}
});
test('운영자 재수정·이력서 교체는 확인 무효화, 철회·재신청 및 경합 보호',async()=>{
 const t=await setup();try{
  const ex=await t.reg('expert','e@example.com'),draftPath='/api/admin/expert-intakes/'+ex.id+'/draft';await t.call('/api/expert-intake','POST',input(),ex);
  await t.call(draftPath,'PUT',{data:data(),version:0,profileVersion:null},t.admin);
  let r=await t.call('/api/expert-profile','PUT',{data:data(),version:0,submit:true,participationConsent:true},ex);assert.equal(r.status,200);
  r=await t.call(draftPath,'PUT',{data:{...data(),headline:'수정한 소개'},version:2,profileVersion:1},t.admin);assert.equal(r.status,200);assert.equal(r.data.intake.status,'awaiting_confirmation');
  assert.equal((await t.call('/api/admin/experts/'+ex.id,'PATCH',{status:'approved',version:2,reviewConfirmed:true},t.admin)).status,400);
  r=await t.call('/api/expert-intake','POST',{...input(),version:3},ex);assert.equal(r.status,200);assert.equal(r.data.intake.status,'received');
  assert.equal((await t.call(draftPath,'PUT',{data:data(),version:3,profileVersion:2},t.admin)).status,409);
  assert.equal((await t.call('/api/expert-intake','DELETE',{version:4},ex)).status,200);
  assert.equal((await t.call('/api/expert-resume','GET',undefined,ex)).status,404);assert.equal(t.app.db.prepare('SELECT count(*) n FROM profiles').get().n,0);
  assert.equal((await t.call('/api/expert-profile','PUT',{data:data(),submit:true,participationConsent:true,version:null},ex)).status,409);
  const withdrawn=(await t.call('/api/expert-intake','GET',undefined,ex)).data.intake;assert.equal(withdrawn.phone,'');assert.equal(withdrawn.status,'withdrawn');
  r=await t.call('/api/expert-intake','POST',{...input(),version:withdrawn.version},ex);assert.equal(r.status,200);assert.equal(r.data.intake.status,'received');
 }finally{await t.stop()}
});
