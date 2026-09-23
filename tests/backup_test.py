import datetime as dt
import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('backup',Path(__file__).resolve().parents[1]/'scripts/backup.py')
backup=importlib.util.module_from_spec(spec);spec.loader.exec_module(backup)
class BackupTests(unittest.TestCase):
 def test_absolute_retention_even_if_backups_stop(self):
  now=dt.datetime(2026,9,23,tzinfo=dt.timezone.utc)
  snapshots=[{'id':name,'time':time,'tags':tags} for name,time,tags in [('old','2026-08-01T00:00:00Z',[backup.TAG]),('boundary','2026-08-24T00:00:00Z',[backup.TAG]),('recent','2026-09-22T00:00:00Z',[backup.TAG]),('unrelated','2026-01-01T00:00:00Z',['other'])]]
  self.assertEqual(backup.expired_ids(snapshots,now),['old','boundary'])
 def test_snapshot_includes_committed_wal_and_pdf_bytes(self):
  with tempfile.TemporaryDirectory() as tmp:
   source=Path(tmp)/'live.sqlite';target=Path(tmp)/'copy.sqlite'
   with sqlite3.connect(source) as db:
    db.execute('PRAGMA journal_mode=WAL');db.execute('CREATE TABLE orders(id TEXT, pdf BLOB)');db.execute('INSERT INTO orders VALUES(?,?)',('purchase',b'PDF bytes'));db.commit()
    backup.sqlite_snapshot(source,target)
    with sqlite3.connect(target) as restored:self.assertEqual(restored.execute('SELECT * FROM orders').fetchone(),('purchase',b'PDF bytes'))
if __name__=='__main__':unittest.main()
