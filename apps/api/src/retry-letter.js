import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const id=process.argv[2];
if(!id){console.error('Usage: npm run retry-letter -w @elf/api -- ORDER_ID');process.exit(1);}
const db=new DatabaseSync(process.env.DATABASE_PATH||fileURLToPath(new URL('../../../mailroom.sqlite',import.meta.url)));
db.exec('BEGIN IMMEDIATE');
const changed=db.prepare("UPDATE orders SET generation_status='queued',generation_attempts=0,generation_next=0,generation_lease=0,generation_token=NULL,generation_error=NULL WHERE id=? AND status='paid' AND child_details IS NOT NULL AND generation_status='failed'").run(id).changes;
if(changed)db.prepare("UPDATE rewrite_requests SET status='queued' WHERE id=(SELECT active_request_id FROM orders WHERE id=?)").run(id);
db.exec('COMMIT');
db.close();
if(!changed){console.error('No failed, paid letter matched that order. Existing letters were not changed.');process.exitCode=1;}
else console.log('The paid order is queued for another generation attempt.');
