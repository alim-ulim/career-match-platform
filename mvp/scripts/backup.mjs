import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Run from a trusted host/container. The destination must be outside the source
// DB location for disaster recovery; transfer snapshots to protected storage.
const [sourceArg,destinationArg]=process.argv.slice(2);
if(!sourceArg||!destinationArg){console.error('Usage: node scripts/backup.mjs SOURCE.sqlite NEW_BACKUP.sqlite');process.exit(1)}
const source=path.resolve(sourceArg),destination=path.resolve(destinationArg);
let db,reserved=false;
try{
 if(!fs.statSync(source).isFile())throw Error('Source is not a file.');
 if(source===destination)throw Error('Source and destination must differ.');
 const fd=fs.openSync(destination,'wx',0o600);fs.closeSync(fd);reserved=true;
 db=new DatabaseSync(source,{readOnly:true});
 db.exec(`VACUUM INTO '${destination.replaceAll("'","''")}'`);
 const snapshot=new DatabaseSync(destination,{readOnly:true});
 try{if(snapshot.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Snapshot integrity check failed.')}finally{snapshot.close()}
 console.log('SQLite snapshot created; integrity check: ok. Store it in protected backup storage.');
}catch(e){if(reserved)fs.rmSync(destination,{force:true});console.error('Backup failed:',e.message);process.exitCode=1}finally{db?.close()}
