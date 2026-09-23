// Six calendar months in UTC, clamped to the last day of the target month.
export function retentionDeadline(timestamp){
 const date=new Date(timestamp),day=date.getUTCDate();
 date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+6);
 const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
 date.setUTCDate(Math.min(day,last));return date.getTime();
}
export function expiredOrder(order,now=Date.now()){return Boolean(order&&(order.expired_at!=null||(order.expires_at!=null&&order.expires_at<=now)));}
export function migrateRetention(db,now=Date.now()){
 const columns=new Set(db.prepare('PRAGMA table_info(orders)').all().map(c=>c.name));
 for(const name of ['paid_at','expires_at','expired_at'])if(!columns.has(name))db.exec(`ALTER TABLE orders ADD COLUMN ${name} INTEGER`);
 for(const order of db.prepare('SELECT id,created_at FROM orders WHERE expires_at IS NULL').all())db.prepare('UPDATE orders SET expires_at=? WHERE id=?').run(retentionDeadline(order.created_at>0?order.created_at:now),order.id);
 db.exec('CREATE INDEX IF NOT EXISTS retention_due ON orders(expires_at) WHERE expired_at IS NULL; PRAGMA secure_delete=ON;');
}
export function markOrderPaid(db,id,checkoutId,paidAt=Date.now()){
 db.prepare("UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?),expires_at=CASE WHEN paid_at IS NULL THEN ? ELSE expires_at END WHERE id=? AND checkout_id=? AND expired_at IS NULL").run(paidAt,retentionDeadline(paidAt),id,checkoutId);
}
export function purgeExpiredLetters(db,now=Date.now()){
 db.exec('BEGIN IMMEDIATE');
 try{
  const orders=db.prepare('SELECT id FROM orders WHERE expires_at<=? AND expired_at IS NULL').all(now);
  for(const {id} of orders){
   for(const table of ['letter_pdfs','letter_versions','rewrite_requests'])db.prepare(`DELETE FROM ${table} WHERE order_id=?`).run(id);
   db.prepare(`UPDATE orders SET letter='',child_details=NULL,access_token=NULL,link_token_hash=NULL,letter_hash=NULL,
    generation_status='expired',generation_token=NULL,generation_lease=0,generation_error=NULL,generation_model=NULL,generation_response_id=NULL,
    active_request_id=NULL,accepted_version=NULL,email_status='not_requested',email_token=NULL,email_lease=0,email_error=NULL,expired_at=? WHERE id=?`).run(now,id);
  }
  db.exec('COMMIT');return orders.length;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
