import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const id=process.argv[2];
if(!id){console.error('Usage: npm run retry-email -w @elf/api -- ORDER_ID');process.exit(1);}
const db=new DatabaseSync(process.env.DATABASE_PATH||fileURLToPath(new URL('../../../mailroom.sqlite',import.meta.url)));
const changes=db.prepare("UPDATE orders SET email_status='queued',email_attempts=0,email_next=0,email_lease=0,email_token=NULL,email_error=NULL WHERE id=? AND status='paid' AND letter!='' AND buyer_email IS NOT NULL AND email_status='failed'").run(id).changes;
db.close();
if(changes)console.log('Email delivery queued for another attempt.');else{console.error('No failed email for a ready, paid letter matched that order.');process.exitCode=1;}
