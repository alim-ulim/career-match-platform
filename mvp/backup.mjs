import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function privateSnapshot(db){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ulim-private-backup-'));
 fs.chmodSync(dir,0o700);
 const file=path.join(dir,'ulim.sqlite');
 const cleanup=()=>fs.rmSync(dir,{recursive:true,force:true});
 let copy;
 try{
  fs.closeSync(fs.openSync(file,'wx',0o600));
  db.exec(`VACUUM INTO '${file.replaceAll("'","''")}'`);
  copy=new DatabaseSync(file);
  // Restore requires a fresh login; never export live authentication sessions.
  for(const table of ['sessions','member_sessions']){
   if(copy.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))copy.exec(`DELETE FROM ${table}`);
  }
  copy.exec('VACUUM');
  if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup integrity check failed.');
  copy.close();copy=null;
  return {file,cleanup};
 }catch(e){copy?.close();cleanup();throw e}
}
