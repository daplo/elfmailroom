import {orderLanguage} from '../../../packages/shared/locales.js';
import {createLetterPdf} from './pdf.js';
export function migratePdfStore(db){db.exec('CREATE TABLE IF NOT EXISTS letter_pdfs(order_id TEXT NOT NULL,version INTEGER NOT NULL,pdf BLOB NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(order_id,version))');}
export async function storedPdf(db,order){
 const cached=db.prepare('SELECT pdf FROM letter_pdfs WHERE order_id=? AND version=?').get(order.id,order.letter_version);if(cached)return Buffer.from(cached.pdf);
 const pdf=await createLetterPdf(order.letter,order.design,orderLanguage(order));
 db.prepare('INSERT OR IGNORE INTO letter_pdfs VALUES(?,?,?,?)').run(order.id,order.letter_version,pdf,Date.now());
 return Buffer.from(db.prepare('SELECT pdf FROM letter_pdfs WHERE order_id=? AND version=?').get(order.id,order.letter_version).pdf);
}
