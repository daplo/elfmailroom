#!/usr/bin/env python3
"""Encrypted restic backups. Credentials are supplied through the environment."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile

TAG = 'elfmailroom-production'

def restic(*args, capture=False):
    return subprocess.run(['restic', '--no-cache', *args], check=True,
                          stdout=subprocess.PIPE if capture else None,
                          text=capture).stdout

def expired_ids(snapshots, now):
    cutoff = now - dt.timedelta(days=30)
    return [s['id'] for s in snapshots if TAG in s.get('tags', []) and
            dt.datetime.fromisoformat(s['time'].replace('Z', '+00:00')) <= cutoff]

def prune(now=None):
    snapshots = json.loads(restic('snapshots', '--json', '--tag', TAG, capture=True))
    ids = expired_ids(snapshots, now or dt.datetime.now(dt.timezone.utc))
    for snapshot in ids:
        restic('forget', snapshot)
    # Also remove unreachable data left by an interrupted previous prune.
    restic('prune')

def check_database(path):
    with sqlite3.connect(path.as_uri()+'?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise RuntimeError('Backup database integrity check failed')
        db.execute('SELECT COUNT(*) FROM orders').fetchone()

def sqlite_snapshot(source, target):
    with sqlite3.connect(source.as_uri()+'?mode=ro', uri=True) as live:
        with sqlite3.connect(target) as copy:
            live.backup(copy, pages=256)
            copy.execute("PRAGMA journal_mode=DELETE")
    check_database(target)

def verify(snapshot):
    with tempfile.TemporaryDirectory(prefix='elf-restore-') as tmp:
        root = Path(tmp)
        restic('restore', snapshot, '--target', str(root))
        check_database(root/'mailroom.sqlite')
        if not (root/'.env').is_file():
            raise RuntimeError('Backup is missing the application configuration')
    print('Isolated restore and SQLite integrity check passed.')

def backup(root):
    with tempfile.TemporaryDirectory(prefix='elf-backup-') as tmp:
        staging = Path(tmp)
        sqlite_snapshot(root/'data/mailroom.sqlite', staging/'mailroom.sqlite')
        for name in ['.env', 'compose.prod.yaml', 'Caddyfile']:
            shutil.copy2(root/name, staging/name)
        # Back up relative paths so isolated restoration has a stable layout.
        result = subprocess.run(['restic', '--no-cache', 'backup', '--json', '--tag', TAG,
                                 '--host', TAG, '.'], cwd=staging, check=True,
                                capture_output=True, text=True)
        summaries = [json.loads(line) for line in result.stdout.splitlines()]
        snapshot = next(row['snapshot_id'] for row in summaries if row.get('message_type') == 'summary')
    verify(snapshot)
    print('Encrypted backup and restore verification complete.')

def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['backup', 'prune', 'verify'])
    parser.add_argument('--root', type=Path, default=Path('/var/www/elfmailroom'))
    parser.add_argument('--snapshot', default='latest')
    args = parser.parse_args()
    if not os.environ.get('RESTIC_REPOSITORY') or not os.environ.get('RESTIC_PASSWORD_FILE'):
        parser.error('Set RESTIC_REPOSITORY and RESTIC_PASSWORD_FILE')
    if args.command == 'backup':
        prune()  # Absolute age, even if the new backup fails.
        backup(args.root.resolve())
    elif args.command == 'prune':
        prune()
    else:
        verify(args.snapshot)

if __name__ == '__main__':
    main()
