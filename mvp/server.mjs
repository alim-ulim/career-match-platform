import http from 'node:http';
import {platform} from './platform.mjs';
import {privateSnapshot} from './backup.mjs';
import {pipeline} from 'node:stream/promises';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
const id=()=>randomBytes(24).toString('hex');
const statuses=['접수','검토 중','추가 확인 필요','조건 안내 준비','종료'];
const definitions={customer:['role','topic','question'],expert:['field','experience','topics','method'],company:['company','position','responsibility']};
const allowed={customer:['role','topic','question','attempt','timing'],expert:['field','experience','topics','method','availability'],company:['company','position','responsibility','difficulty','deadline']};
export function createApp({dbPath=':memory:',adminPassword,production=false,publicOrigin,secureCookie=production}={}){
 if(!adminPassword||adminPassword.length<12)throw Error('관리자 비밀번호는 12자 이상이어야 합니다.');
 if(production&&!publicOrigin)throw Error('운영 환경 PUBLIC_ORIGIN은 HTTPS 주소여야 합니다.');
 if(publicOrigin){let origin;try{origin=new URL(publicOrigin)}catch{throw Error('PUBLIC_ORIGIN 주소를 확인해주세요.')}
  if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!['http:','https:'].includes(origin.protocol)||(production&&origin.protocol!=='https:'))throw Error('PUBLIC_ORIGIN은 경로·인증 정보가 없는 서비스 원점 주소여야 합니다.');
  publicOrigin=origin.origin;
 }
 if(dbPath!==':memory:')fs.mkdirSync(path.dirname(dbPath),{recursive:true,mode:0o700});
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 db.exec(`CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY,type TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',reply TEXT NOT NULL DEFAULT '',checks TEXT NOT NULL DEFAULT '[]',version INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,consent_version TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), at TEXT NOT NULL, action TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS submissions(key TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,receipt TEXT NOT NULL);`);
 db.prepare('DELETE FROM sessions').run();
 let lastCleanup=0;
 function cleanup(){if(Date.now()-lastCleanup<3600000)return;lastCleanup=Date.now();const cutoff=new Date(Date.now()-90*86400000).toISOString();db.exec('BEGIN IMMEDIATE');try{db.prepare("DELETE FROM events WHERE inquiry_id IN (SELECT id FROM inquiries WHERE status='종료' AND updated_at<?)").run(cutoff);db.prepare("DELETE FROM submissions WHERE receipt IN (SELECT id FROM inquiries WHERE status='종료' AND updated_at<?)").run(cutoff);db.prepare("DELETE FROM inquiries WHERE status='종료' AND updated_at<?").run(cutoff);db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
 const salt=randomBytes(16),passwordHash=scryptSync(adminPassword,salt,64);const buckets=new Map();
 function limit(key,max,windowMs){const now=Date.now();let b=buckets.get(key);if(!b||b.until<now)b={n:0,until:now+windowMs};b.n++;buckets.set(key,b);if(buckets.size>10000)for(const[k,v]of buckets)if(v.until<now)buckets.delete(k);return b.n<=max;}
 function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
 async function body(req,maxBytes=16000){let text='';for await(const c of req){text+=c;if(Buffer.byteLength(text)>maxBytes)throw Object.assign(Error('입력 내용이 너무 큽니다.'),{status:413});}try{const parsed=JSON.parse(text||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed}catch{throw Object.assign(Error('올바른 JSON이 아닙니다.'),{status:400})}}
 function session(req){const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ulim_session='));if(!cookie)return null;const value=cookie.slice(13);const s=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(value),Date.now());return s||null;}
 function cookie(res,value,maxAge){res.setHeader('Set-Cookie',`ulim_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookie?'; Secure':''}`);}
 function row(r){return {...r,payload:JSON.parse(r.payload),checks:JSON.parse(r.checks),history:db.prepare('SELECT at,action FROM events WHERE inquiry_id=? ORDER BY id DESC').all(r.id)}}
 const platformRoute=platform({db,body,send,adminSession:session,limit,secureCookie});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{
   cleanup();
   const host=req.headers.host||'';const url=new URL(req.url,'http://'+(host||'localhost'));const route=url.pathname;const write=['POST','PUT','PATCH','DELETE'].includes(req.method);
   if(write){const origin=req.headers.origin;const expected=publicOrigin||`http://${host}`;if(origin!==expected)return send(res,403,{error:'요청 출처를 확인할 수 없습니다.'});if(!(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'JSON 요청이 필요합니다.'});}
   if(await platformRoute(req,res,url))return;
   if(route==='/api/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send(res,200,{ok:true});}
   if(route==='/api/inquiries'&&req.method==='POST'){
    const ip=req.socket.remoteAddress||'';if(!limit('submit:'+ip,20,3600000))return send(res,429,{error:'접수 요청이 많습니다. 잠시 후 다시 시도해주세요.'});
    const b=await body(req);if(b.website)return send(res,400,{error:'접수를 완료하지 못했습니다.'});
    if(!definitions[b.type])return send(res,400,{error:'문의 유형을 선택해주세요.'});
    const trim=x=>typeof x==='string'?x.trim():'';const name=trim(b.name),email=trim(b.email);
    if(!name||name.length>80||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'이름과 올바른 이메일을 확인해주세요.'});
    if(b.consent!==true||b.consentVersion!=='2026-10-23-v2'||b.overseasConsent!==true)return send(res,400,{error:'문의 처리 개인정보 안내를 확인하고 동의해주세요.'});
    const payload={};for(const k of allowed[b.type]){const value=trim(b.payload?.[k]);if(value.length>1000)return send(res,400,{error:'입력 항목은 각각 1,000자 이내로 작성해주세요.'});payload[k]=value;}
    if(definitions[b.type].some(k=>!payload[k]))return send(res,400,{error:'필수 항목을 입력해주세요.'});
    const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(key))return send(res,400,{error:'접수 확인 키가 필요합니다. 페이지를 새로 열어주세요.'});
    const fingerprint=hash(JSON.stringify({type:b.type,name,email,payload}));const old=db.prepare('SELECT * FROM submissions WHERE key=?').get(key);if(old){if(old.fingerprint!==fingerprint)return send(res,409,{error:'입력 내용이 변경되었습니다. 접수 키를 새로 생성해주세요.'});return send(res,200,{receipt:old.receipt});}
    const receipt='UL-'+randomBytes(8).toString('hex').toUpperCase();const now=new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO inquiries(id,type,name,email,payload,status,created_at,updated_at,consent_version) VALUES(?,?,?,?,?,?,?,?,?)').run(receipt,b.type,name,email,JSON.stringify(payload),'접수',now,now,b.consentVersion);db.prepare('INSERT INTO events(inquiry_id,at,action) VALUES(?,?,?)').run(receipt,now,'문의 접수');db.prepare('INSERT INTO submissions(key,fingerprint,receipt) VALUES(?,?,?)').run(key,fingerprint,receipt);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
    return send(res,201,{receipt});
   }
   if(route==='/api/admin/login'&&req.method==='POST'){
    if(!limit('login:'+req.socket.remoteAddress,10,900000))return send(res,429,{error:'로그인 시도가 많습니다. 15분 후 다시 시도해주세요.'});const b=await body(req);if(typeof b.password!=='string'||b.password.length>256)return send(res,401,{error:'로그인 정보를 확인해주세요.'});const candidate=scryptSync(b.password,salt,64);if(!timingSafeEqual(candidate,passwordHash))return send(res,401,{error:'로그인 정보를 확인해주세요.'});
    db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());const token=id(),csrf=id();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),csrf,Date.now()+8*3600000);cookie(res,token,28800);return send(res,200,{csrf});
   }
   if(route.startsWith('/api/admin/')){
    const s=session(req);if(!s)return send(res,401,{error:'관리자 로그인이 필요합니다.'});if(write&&req.headers['x-csrf-token']!==s.csrf)return send(res,403,{error:'인증 확인이 필요합니다. 다시 로그인해주세요.'});
    if(route==='/api/admin/backup'&&req.method==='POST'){
     const b=await body(req);if(b.confirmation!=='download-private-backup')return send(res,400,{error:'개인정보 포함 백업 다운로드 확인이 필요합니다.'});
     if(!limit('backup:'+s.token,2,600000)||!limit('backup-global',4,600000))return send(res,429,{error:'백업 요청이 많습니다. 10분 후 다시 시도해주세요.'});
     const snapshot=privateSnapshot(db);
     try{const name='ulim-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${name}"`,'Content-Length':fs.statSync(snapshot.file).size});await pipeline(fs.createReadStream(snapshot.file),res);}finally{snapshot.cleanup()}
     return;
    }
    if(route==='/api/admin/session'&&req.method==='GET')return send(res,200,{csrf:s.csrf});
    if(route==='/api/admin/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);cookie(res,'',0);return send(res,200,{ok:true});}
    if(route==='/api/admin/inquiries'&&req.method==='GET')return send(res,200,{items:db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all().map(row)});
    const match=route.match(/^\/api\/admin\/inquiries\/(UL-[A-F0-9]{16})$/);
    if(match&&req.method==='PATCH'){
     const r=db.prepare('SELECT * FROM inquiries WHERE id=?').get(match[1]);if(!r)return send(res,404,{error:'문의를 찾을 수 없습니다.'});const b=await body(req);
     if(!statuses.includes(b.status)||typeof b.note!=='string'||typeof b.reply!=='string'||b.note.length>4000||b.reply.length>4000||!Array.isArray(b.checks)||b.checks.length!==3||b.checks.some(x=>typeof x!=='boolean'))return send(res,400,{error:'상태와 입력 내용을 확인해주세요.'});
     if(b.version!==r.version)return send(res,409,{error:'다른 화면에서 변경되었습니다. 새로고침 후 다시 확인해주세요.'});
     if(b.status==='조건 안내 준비'&&!b.checks.every(Boolean))return send(res,400,{error:'검토 항목을 모두 확인해주세요.'});if(['추가 확인 필요','종료'].includes(b.status)&&!b.note.trim())return send(res,400,{error:'추가 확인 또는 종료 사유를 적어주세요.'});
     const now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{const result=db.prepare('UPDATE inquiries SET status=?,note=?,reply=?,checks=?,updated_at=?,version=version+1 WHERE id=? AND version=?').run(b.status,b.note.trim(),b.reply.trim(),JSON.stringify(b.checks),now,r.id,b.version);if(result.changes!==1)throw Error('동시 수정 충돌');db.prepare('INSERT INTO events(inquiry_id,at,action) VALUES(?,?,?)').run(r.id,now,`${r.status} → ${b.status} · 검토 내용 저장`);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return send(res,200,{item:row(db.prepare('SELECT * FROM inquiries WHERE id=?').get(r.id))});
    }
    return send(res,404,{error:'요청 경로가 없습니다.'});
   }
   if(route.startsWith('/api/'))return send(res,404,{error:'요청 경로가 없습니다.'});
   if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'허용하지 않는 요청입니다.'});
   if(route==='/fonts/PretendardVariable.woff2'){const data=fs.readFileSync(path.join(root,'public/fonts/PretendardVariable.woff2'));res.writeHead(200,{'Content-Type':'font/woff2'});return res.end(req.method==='HEAD'?undefined:data);}
   if(route==='/app.js'||route==='/platform.css'){const data=fs.readFileSync(path.join(root,'public',route.slice(1)));res.writeHead(200,{'Content-Type':route.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8'});return res.end(data);}
   const pages={'/':'index.html','/index.html':'index.html','/admin':'admin.html','/admin.html':'admin.html','/privacy':'privacy.html','/terms':'terms.html','/contact':'contact.html','/join':'account.html','/login':'account.html','/experts':'experts.html','/expert':'expert.html','/expert/register':'expert-register.html','/my':'my.html','/admin/platform':'admin-platform.html','/admin/backup':'backup.html'};const file=pages[route];if(!file)return send(res,404,{error:'페이지를 찾을 수 없습니다.'});const data=fs.readFileSync(path.join(root,'public',file));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(res.headersSent){res.destroy();return}send(res,e.status||500,{error:e.status?e.message:'처리를 완료하지 못했습니다. 잠시 후 다시 시도해주세요.'});}
 });const cleanupTimer=setInterval(()=>{try{cleanup()}catch{console.error('보관 기간 정리 실패: 저장소 상태 확인 필요')}},3600000);cleanupTimer.unref();server.on('close',()=>clearInterval(cleanupTimer));return {server,db,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve()}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 process.umask(0o077);
 const production=process.env.NODE_ENV==='production';if(production&&(!process.env.DATA_DIR||!path.isAbsolute(process.env.DATA_DIR)))throw Error('운영 환경 DATA_DIR은 영속 볼륨의 절대 경로여야 합니다.');const runtime=process.env.DATA_DIR||path.join(root,'.runtime');fs.mkdirSync(runtime,{recursive:true,mode:0o700});let pw=process.env.ADMIN_PASSWORD;
 if(!pw&&!production){const pwFile=path.join(runtime,'admin-password.txt');if(!fs.existsSync(pwFile))fs.writeFileSync(pwFile,id(),{mode:0o600});pw=fs.readFileSync(pwFile,'utf8').trim();console.log('로컬 관리자 비밀번호: DATA_DIR/admin-password.txt 파일에서 확인 (화면에는 출력하지 않음)');}
 const app=createApp({dbPath:path.join(runtime,'ulim.sqlite'),adminPassword:pw,production,publicOrigin:process.env.PUBLIC_ORIGIN});const port=Number(process.env.PORT||8766);app.server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`울림: http://127.0.0.1:${port} / 관리자: /admin`));
 process.on('SIGTERM',()=>app.server.close(()=>{app.db.close();process.exit(0)}));
}
