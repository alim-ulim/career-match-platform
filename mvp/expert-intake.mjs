import {randomBytes,createHash} from 'node:crypto';
import {decodeResume} from './resume-draft.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status})};
const text=(value,max)=>{if(typeof value!=='string'||value.trim().length>max)fail(400,'입력 내용과 길이를 확인해주세요.');return value.trim()};
const now=()=>new Date().toISOString();
export const profileFingerprint=data=>createHash('sha256').update(typeof data==='string'?data:JSON.stringify(data)).digest('hex');
export const INTAKE_CONSENT_VERSION='resume-intake-2026-11-04-v1';
export function expertIntake({db,auth,admin,body,send,limit,validateProfile}){
 db.exec(`CREATE TABLE IF NOT EXISTS expert_intakes(
  member_id TEXT PRIMARY KEY REFERENCES members(id),receipt TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',topics TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',confirmation_hash TEXT,
  version INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`);
 const get=id=>db.prepare('SELECT * FROM expert_intakes WHERE member_id=?').get(id);
 const view=row=>row?{memberId:row.member_id,receipt:row.receipt,name:row.name,phone:row.phone,topics:row.topics,status:row.status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}:null;
 const profile=id=>{const p=db.prepare('SELECT * FROM profiles WHERE member_id=?').get(id);return p?{...p,data:JSON.parse(p.data)}:null};
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
 return async(req,res,url)=>{
  const path=url.pathname,write=req.method!=='GET';
  if(path==='/api/expert-intake'&&['GET','POST','DELETE'].includes(req.method)){
   const s=auth(req,write);if(s.role!=='expert')fail(403,'전문가 계정이 필요합니다.');
   const old=get(s.member_id),p=profile(s.member_id);
   if(req.method==='GET'){send(res,200,{intake:view(old),profile:p,hasResume:!!db.prepare('SELECT member_id FROM resumes WHERE member_id=?').get(s.member_id),consentVersion:INTAKE_CONSENT_VERSION});return true;}
   if(req.method==='DELETE'){
    const b=await body(req);if(!old)fail(404,'신청 내역이 없습니다.');if(b.version!==old.version)fail(409,'신청 내용이 변경되었습니다. 새로고침해주세요.');
    if(p?.status==='approved'||db.prepare('SELECT id FROM appointments WHERE expert_id=? LIMIT 1').get(s.member_id))fail(409,'공개 또는 상담 이력이 있는 전문가는 운영자에게 철회를 요청해주세요.');
    transaction(()=>{db.prepare('DELETE FROM resumes WHERE member_id=?').run(s.member_id);db.prepare('DELETE FROM profiles WHERE member_id=?').run(s.member_id);db.prepare("UPDATE expert_intakes SET phone='',topics='',status='withdrawn',confirmation_hash=NULL,version=version+1,updated_at=? WHERE member_id=?").run(now(),s.member_id)});
    send(res,200,{intake:view(get(s.member_id))});return true;
   }
   const b=await body(req,4500000);
   if(b.consent!==true||b.consentVersion!==INTAKE_CONSENT_VERSION)fail(400,'이력서 검토 및 연락 안내에 동의해주세요.');
   if((old?old.version:null)!==b.version)fail(409,'신청 내용이 변경되었습니다. 새로고침해주세요.');
   if(p?.status==='approved')fail(409,'공개 중인 전문가는 기존 프로필에서 변경해주세요.');
   if(!old&&p)fail(409,'이미 작성한 프로필이 있습니다. 기존 프로필에서 이어서 진행해주세요.');
   const name=text(b.name,60),phone=text(b.phone||'',40),topics=text(b.topics||'',500);
   if(!name||(phone&&!/^[+0-9 ()-]{7,40}$/.test(phone)))fail(400,'이름과 연락처 형식을 확인해주세요.');
   const pdf=b.base64?decodeResume(b.base64):null;
   if(!pdf&&!db.prepare('SELECT member_id FROM resumes WHERE member_id=?').get(s.member_id))fail(400,'참여 신청에 사용할 PDF 이력서를 첨부해주세요.');
   if(!limit('expert-intake:'+s.member_id,10,3600000))fail(429,'신청 변경이 많습니다. 잠시 후 다시 시도해주세요.');
   const receipt=old?.receipt||'EX-'+randomBytes(8).toString('hex').toUpperCase();
   transaction(()=>{
    if(pdf)db.prepare('INSERT INTO resumes VALUES(?,?,?) ON CONFLICT(member_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at').run(s.member_id,pdf,now());
    db.prepare(`INSERT INTO expert_intakes(member_id,receipt,name,phone,topics,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET name=excluded.name,phone=excluded.phone,topics=excluded.topics,status='received',confirmation_hash=NULL,version=expert_intakes.version+1,updated_at=excluded.updated_at`).run(s.member_id,receipt,name,phone,topics,now(),now());
    if(p)db.prepare("UPDATE profiles SET status='intake_received',version=version+1,updated_at=? WHERE member_id=?").run(now(),s.member_id);
    db.prepare('INSERT INTO member_consents VALUES(?,?,?,?)').run(s.member_id,'resume-intake',INTAKE_CONSENT_VERSION,now());
   });
   send(res,200,{intake:view(get(s.member_id))});return true;
  }
  if(path==='/api/admin/expert-intakes'&&req.method==='GET'){
   admin(req);send(res,200,{items:db.prepare('SELECT i.*,m.email FROM expert_intakes i JOIN members m ON m.id=i.member_id ORDER BY i.updated_at DESC').all().map(row=>({...view(row),email:row.email,profile:profile(row.member_id),hasResume:!!db.prepare('SELECT member_id FROM resumes WHERE member_id=?').get(row.member_id)}))});return true;
  }
  const download=path.match(/^\/api\/admin\/expert-intakes\/(M-[a-f0-9]{24})\/resume$/);
  if(download&&req.method==='GET'){
   admin(req);const intake=get(download[1]);if(!intake||intake.status==='withdrawn')fail(404,'신청 내역이 없습니다.');
   const file=db.prepare('SELECT content FROM resumes WHERE member_id=?').get(download[1]);if(!file)fail(404,'등록된 이력서가 없습니다.');
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="resume.pdf"'});res.end(Buffer.from(file.content));return true;
  }
  const match=path.match(/^\/api\/admin\/expert-intakes\/(M-[a-f0-9]{24})\/draft$/);
  if(match&&req.method==='PUT'){
   admin(req,true);const old=get(match[1]);if(!old||old.status==='withdrawn')fail(404,'진행 중인 이력서 신청이 없습니다.');
   const b=await body(req,50000),p=profile(match[1]);
   if(b.version!==old.version||b.profileVersion!==(p?.version??null))fail(409,'신청 또는 소개가 변경되었습니다. 새로고침해주세요.');
   if(p?.status==='approved')fail(409,'공개 중인 소개는 전문가가 직접 수정해야 합니다.');
   const d=validateProfile({...b.data,showCompanies:false});
   transaction(()=>{
    db.prepare(`INSERT INTO profiles(member_id,data,status,updated_at) VALUES(?,?,'awaiting_expert',?) ON CONFLICT(member_id) DO UPDATE SET data=excluded.data,status='awaiting_expert',review_note='',updated_at=excluded.updated_at,version=profiles.version+1`).run(match[1],JSON.stringify(d),now());
    db.prepare("UPDATE expert_intakes SET status='awaiting_confirmation',confirmation_hash=NULL,version=version+1,updated_at=? WHERE member_id=?").run(now(),match[1]);
   });
   send(res,200,{intake:view(get(match[1])),profile:profile(match[1])});return true;
  }
  return false;
 };
}
