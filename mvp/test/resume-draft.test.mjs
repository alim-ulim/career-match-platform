import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {createResumeDraftService,decodeResume,validateDraft,RESUME_AI_CONSENT_VERSION} from '../resume-draft.mjs';
const sample=()=>({headline:'제조업 구매 실무 경험',bio:'구매와 공급망 업무 경험을 나눕니다.',industries:['제조'],jobs:['구매'],topics:['구매 직무를 어떻게 준비할까요?'],years:null,careers:[{company:'QA 회사',industry:'제조',role:'구매 담당',years:'2020~2024',work:'구매 계획 및 공급업체 관리'}],reviewNotes:['총 관련 경력 연수를 확인해주세요.']});
const pdf=Buffer.from('%PDF-1.4\nQA-ONLY'),password='resume-test-password-123';
const input=()=>({base64:pdf.toString('base64'),aiConsent:true,consentVersion:RESUME_AI_CONSENT_VERSION});
async function setup(service){
 const a=createApp({adminPassword:password,resumeDraftService:service});await new Promise(r=>a.server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${a.server.address().port}`;
 const call=async(path,method='GET',data,session={})=>{const r=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:session.cookie||'','X-CSRF-Token':session.csrf||''},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const register=async role=>{const r=await call('/api/members/register','POST',{name:'QA',email:role+'@example.com',role,password,consent:true,overseasConsent:true});assert.equal(r.status,201);return {cookie:r.cookie,csrf:r.data.csrf,id:r.data.user.id}};
 return {a,call,register,stop:()=>a.close()};
}
test('생성은 인증·역할·CSRF·동의가 필요하고 프로필/PDF를 저장하지 않는다',async()=>{
 let calls=0;const t=await setup({available:true,generate:async bytes=>{calls++;assert.deepEqual(bytes,pdf);return sample()}});
 try{
  const ex=await t.register('expert'),customer=await t.register('customer');const route='/api/expert-profile/draft';
  assert.equal((await t.call(route,'POST',input())).status,401);
  assert.equal((await t.call(route,'POST',input(),customer)).status,403);
  assert.equal((await t.call(route,'POST',input(),{cookie:ex.cookie})).status,403);
  assert.equal((await t.call(route,'POST',{...input(),aiConsent:false},ex)).status,400);
  assert.equal((await t.call(route,'POST',{...input(),consentVersion:'old'},ex)).status,400);
  assert.equal((await t.call(route,'POST',{...input(),base64:'not a pdf'},ex)).status,400);assert.equal(calls,0);
  const r=await t.call(route,'POST',input(),ex);assert.equal(r.status,200);assert.equal(r.data.draft.years,null);assert.equal(calls,1);
  const before=(await t.call('/api/expert-profile','GET',undefined,ex)).data;assert.equal(before.profile,null);assert.equal(before.hasResume,false);
  assert.equal((await t.call('/api/experts')).data.items.length,0);
  assert.equal(t.a.db.prepare("SELECT count(*) n FROM member_consents WHERE kind='resume-ai'").get().n,1);
  // Existing approved profiles are not replaced or unpublished by generation.
  const d={...sample(),displayName:'기존 전문가',availability:'금요일',method:'온라인',price:50000,years:4,showCompanies:false};
  await t.call('/api/expert-profile','PUT',{data:d,submit:true,participationConsent:true,version:null},ex);
  t.a.db.prepare("UPDATE profiles SET status='approved' WHERE member_id=?").run(ex.id);
  const stored=t.a.db.prepare('SELECT * FROM profiles WHERE member_id=?').get(ex.id);
  await t.call(route,'POST',input(),ex);assert.deepEqual(t.a.db.prepare('SELECT * FROM profiles WHERE member_id=?').get(ex.id),stored);
  for(let i=0;i<3;i++)assert.equal((await t.call(route,'POST',input(),ex)).status,200);
  assert.equal((await t.call(route,'POST',input(),ex)).status,429);assert.equal(calls,5);
 }finally{await t.stop()}
});
test('API 미설정과 분석 실패 시 수동 등록 유지, 민감한 오류 미노출',async()=>{
 const disabled=createResumeDraftService({enabled:false});const t=await setup(disabled);
 try{const ex=await t.register('expert');assert.equal((await t.call('/api/expert-profile/draft','GET',undefined,ex)).data.available,false);assert.equal((await t.call('/api/expert-profile/draft','POST',input(),ex)).status,503);assert.equal((await t.call('/api/expert-profile','GET',undefined,ex)).status,200)}finally{await t.stop()}
 const service=createResumeDraftService({enabled:true,apiKey:'TEST-ONLY',model:'test-model',fetchImpl:async()=>{throw Error('sensitive upstream details')}});
 await assert.rejects(service.generate(pdf),e=>e.status===502&&!e.message.includes('sensitive'));
});
test('서버 전용 PDF 요청·응답 저장 끔·허용된 초안 필드만 반환',async()=>{
 let sent;const service=createResumeDraftService({enabled:true,apiKey:'TEST-ONLY',model:'test-model',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...sample(),price:999,showCompanies:true})}]}]})}}});
 const d=await service.generate(pdf);assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.match(sent.input[0].content[0].file_data,/^data:application\/pdf;base64,/);assert.equal(d.price,undefined);assert.equal(d.showCompanies,undefined);
 assert.throws(()=>decodeResume(Buffer.alloc(3*1024*1024+1).toString('base64')),e=>e.status===400);
 assert.throws(()=>validateDraft({...sample(),years:100}),e=>e.status===502);
 assert.throws(()=>validateDraft({...sample(),headline:'x'.repeat(121)}),e=>e.status===502);
 assert.throws(()=>validateDraft({...sample(),bio:'',headline:'',careers:[]}),e=>e.status===422);
});
test('거절·잘린 응답·잘못된 JSON·요청 제한을 정상 초안으로 처리하지 않는다',async()=>{
 for(const [result,status] of [[{status:'incomplete'},502],[{status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]},422],[{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'invalid JSON'}]}]},502]]){
  const service=createResumeDraftService({enabled:true,apiKey:'TEST',model:'test-model',fetchImpl:async()=>({ok:true,json:async()=>result})});
  await assert.rejects(service.generate(pdf),e=>e.status===status);
 }
 const limited=createResumeDraftService({enabled:true,apiKey:'TEST',model:'test-model',fetchImpl:async()=>({ok:false,status:429})});
 await assert.rejects(limited.generate(pdf),e=>e.status===429);
});
