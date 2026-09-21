import {randomUUID} from 'node:crypto';
export function migrateRevisions(db){
 const columns=[['terms_version','TEXT'],['terms_accepted_at','INTEGER'],['terms_language','TEXT'],['terms_snapshot','TEXT'],['link_token_hash','TEXT'],['created_at','INTEGER NOT NULL DEFAULT 0'],['amount_cents','INTEGER'],['letter_version','INTEGER NOT NULL DEFAULT 0'],['accepted_version','INTEGER'],['accepted_at','INTEGER'],['rewrite_count','INTEGER NOT NULL DEFAULT 0'],['active_request_id','TEXT'],['email_status',"TEXT NOT NULL DEFAULT 'not_requested'"]];
 const existing=new Set(db.prepare('PRAGMA table_info(orders)').all().map(c=>c.name));for(const [name,type] of columns)if(!existing.has(name))db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
 db.exec(`CREATE TABLE IF NOT EXISTS letter_versions(order_id TEXT NOT NULL,version INTEGER NOT NULL,letter TEXT NOT NULL,source TEXT NOT NULL,instructions TEXT,created_at INTEGER NOT NULL,model TEXT,response_id TEXT,body_hash TEXT,editor TEXT,PRIMARY KEY(order_id,version));
 CREATE UNIQUE INDEX IF NOT EXISTS unique_version_body ON letter_versions(body_hash) WHERE body_hash IS NOT NULL;
 CREATE TABLE IF NOT EXISTS rewrite_requests(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,instructions TEXT NOT NULL,avoid TEXT NOT NULL,base_version INTEGER NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL);
 UPDATE orders SET letter_version=1,accepted_version=1 WHERE letter_version=0 AND letter!='';
 INSERT OR IGNORE INTO letter_versions(order_id,version,letter,source,created_at) SELECT id,letter_version,letter,'legacy',created_at FROM orders WHERE letter!='';`);
}
export function transaction(db,work){db.exec('BEGIN IMMEDIATE');try{const value=work();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}}
export function conflict(message){return Object.assign(new Error(message),{status:409});}
export function maxRewrites(){const n=Number(process.env.MAX_REWRITES_PER_ORDER||5);return Number.isInteger(n)&&n>=0&&n<=50?n:5;}
export function isWorking(order){return ['queued','generating','retrying'].includes(order.generation_status);}
function editable(order,version){if(!order||order.status!=='paid')throw conflict('This purchase has not been paid.');if(order.letter_version!==version)throw conflict('The letter has changed. Refresh and review the latest version.');if(isWorking(order))throw conflict('A letter is already being written. Please wait for it to finish.');if(order.email_status==='sending')throw conflict('An email is being sent. Please try again in a moment.');}
export function queueRewrite(db,id,{version,instructions,avoid},limit=maxRewrites()){
 return transaction(db,()=>{
  const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);editable(order,version);
  if(!order.child_details)throw conflict('The original details are unavailable for this older order. Please contact support for an edit.');
  if(order.rewrite_count>=limit)throw conflict('You’ve used the included rewrites. Please contact support for further changes.');
  const requestId=randomUUID();db.prepare("INSERT INTO rewrite_requests VALUES(?,?,?,?,?,'queued',?)").run(requestId,id,instructions,JSON.stringify(avoid),version,Date.now());
  db.prepare("UPDATE orders SET active_request_id=?,rewrite_count=rewrite_count+1,generation_status='queued',generation_attempts=0,generation_next=0,generation_token=NULL,generation_lease=0,generation_error=NULL,accepted_version=NULL,accepted_at=NULL,email_attempts=0,email_next=0,email_error=NULL,email_status=CASE WHEN email_status='not_requested' THEN email_status ELSE 'waiting_review' END WHERE id=?").run(requestId,id);
  return requestId;
 });
}
export function acceptLetter(db,id,version){return transaction(db,()=>{const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);editable(order,version);if(!order.letter)throw conflict('Your letter is not ready yet.');if(order.accepted_version===version)return;db.prepare("UPDATE orders SET accepted_version=letter_version,accepted_at=?,generation_status='ready',email_status=CASE WHEN email_status='not_requested' THEN email_status ELSE 'queued' END,email_attempts=0,email_next=0,email_error=NULL WHERE id=?").run(Date.now(),id);});}
export function saveManualLetter(db,id,{version,letter,editor}){return transaction(db,()=>{
 const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);editable(order,version);if(order.letter===letter)throw conflict('No changes to save.');const next=version+1;
 db.prepare("INSERT INTO letter_versions(order_id,version,letter,source,created_at,editor) VALUES(?,?,?,'admin',?,?)").run(id,next,letter,Date.now(),editor);
 db.prepare("UPDATE orders SET letter=?,letter_version=?,letter_hash=NULL,generation_status='ready',generation_error=NULL,active_request_id=NULL,accepted_version=NULL,accepted_at=NULL,email_status=CASE WHEN email_status='not_requested' THEN email_status ELSE 'queued' END,email_attempts=0,email_next=0 WHERE id=?").run(letter,next,id);
 return next;
});}
export function generatedVersion(db,order,result,fingerprint,token){return transaction(db,()=>{
 const current=db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);if(current.generation_token!==token||current.generation_status!=='generating')return false;
 const next=current.letter_version+1;const request=current.active_request_id?db.prepare('SELECT * FROM rewrite_requests WHERE id=?').get(current.active_request_id):null;
 db.prepare('INSERT INTO letter_versions(order_id,version,letter,source,instructions,created_at,model,response_id,body_hash) VALUES(?,?,?,?,?,?,?,?,?)').run(order.id,next,result.letter,request?'rewrite':'generated',request?JSON.stringify({instructions:request.instructions,avoid:JSON.parse(request.avoid)}):null,Date.now(),result.model,result.responseId,fingerprint);
 db.prepare("UPDATE orders SET letter=?,letter_hash=?,letter_version=?,generation_status='ready',generation_error=NULL,generation_lease=0,generation_model=?,generation_response_id=?,accepted_version=NULL,accepted_at=NULL,email_status=CASE WHEN email_status='not_requested' THEN email_status ELSE 'queued' END WHERE id=? AND generation_token=?").run(result.letter,fingerprint,next,result.model,result.responseId,order.id,token);
 if(request)db.prepare("UPDATE rewrite_requests SET status='ready' WHERE id=?").run(request.id);return true;
});}
