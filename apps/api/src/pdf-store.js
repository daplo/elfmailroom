import {expiredOrder} from './retention.js';
import {orderLanguage} from '../../../packages/shared/locales.js';
import {createLetterPdf} from './pdf.js';
const rendererVersion=4;
export function migratePdfStore(db){db.exec('CREATE TABLE IF NOT EXISTS letter_pdfs(order_id TEXT NOT NULL,version INTEGER NOT NULL,pdf BLOB NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(order_id,version))');if(!db.prepare('PRAGMA table_info(letter_pdfs)').all().some(c=>c.name==='renderer_version'))db.exec('ALTER TABLE letter_pdfs ADD COLUMN renderer_version INTEGER NOT NULL DEFAULT 0');}
export async function storedPdf(db,order){
 const current=()=>db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);
 const check=()=>{const row=current();if(!row||expiredOrder(row))throw Object.assign(new Error('This letter has expired.'),{status:410});};
 check();
 const cached=db.prepare('SELECT pdf FROM letter_pdfs WHERE order_id=? AND version=? AND renderer_version=?').get(order.id,order.letter_version,rendererVersion);if(cached)return Buffer.from(cached.pdf);
 const pdf=await createLetterPdf(order.letter,order.design,orderLanguage(order));
 check();
 db.prepare('INSERT OR REPLACE INTO letter_pdfs(order_id,version,pdf,created_at,renderer_version) VALUES(?,?,?,?,?)').run(order.id,order.letter_version,pdf,Date.now(),rendererVersion);
 return Buffer.from(db.prepare('SELECT pdf FROM letter_pdfs WHERE order_id=? AND version=?').get(order.id,order.letter_version).pdf);
}
