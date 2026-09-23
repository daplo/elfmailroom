# Encrypted off-server backups (pending activation)

The scripts and systemd units are prepared, but no repository or credentials have been configured. Do not publish a promise that encrypted off-server backups are active yet.

## Configuration

Use a dedicated off-server Restic repository (S3-compatible storage or a separate SFTP backup account), with read/write/delete access. Install Restic, Python 3 and util-linux on the VPS. Copy `scripts/backup.py` to `/var/www/elfmailroom/scripts/backup.py`; deployment currently transfers only Compose/Caddy runtime files, so this is a separate installation step.

Create `/etc/elfmailroom/backup.env` with restricted permissions and configure:

```
RESTIC_REPOSITORY=<dedicated remote repository>
RESTIC_PASSWORD_FILE=/etc/elfmailroom/restic-password
# Provider credentials as required by Restic's backend.
```

Store a strong, unique repository password in that password file, readable by `deploy` only. Keep an independent recovery copy of the password and provider credentials in a password manager, not solely on this VPS. Never commit credentials. Disable bucket versioning or explicitly expire noncurrent versions and delete markers; storage retention locks, snapshots and replicas must also match the retention policy. Do not apply an object-age lifecycle blindly to a deduplicated Restic repository: old pack objects may still hold current backups.

Initialize the dedicated repository with `restic init` under the configured environment. Install `ops/elfmailroom-backup*` units in `/etc/systemd/system/`. First run the backup service manually and confirm the isolated restore check passes, then enable both timers. Monitor failed units and last successful backup independently; a failed backup must be investigated, not silently treated as protection.

## Behavior

Daily backups at 03:00 UTC contain a consistent SQLite snapshot (including letter/PDF data), `.env`, Compose and Caddy configuration. Restic encrypts repository contents. Plaintext staging and verification files use private temporary directories and are removed after the job. A hard termination may require system temporary-file cleanup; inspect failed jobs.

Every successful backup is restored to an isolated directory and checked with SQLite integrity validation. The check never replaces production data or starts email/generation workers. Caddy certificates are not included; Caddy can obtain new certificates during recovery.

A separate hourly job forgets snapshots aged 30 days or older according to the current UTC clock, then prunes unreachable repository data. It also runs before each backup, so retention does not depend on a new backup succeeding. Only snapshots tagged `elfmailroom-production` are forgotten; use a dedicated repository. A missed/failed job or an offline server can delay deletion, so monitor retention failures. This is a 30-day schedule, not a guarantee of deletion at the exact second.

## Disaster recovery

Stop production before any manual replacement. Restore the chosen snapshot to an isolated directory with `restic restore <id> --target <directory>` and run `python3 scripts/backup.py verify --snapshot <id>`. Use the current application version, including the retention migration. Its startup cleanup must run before HTTP traffic or background workers start, ensuring expired letters cannot become accessible after restore. Restore the signing secret from the protected configuration to preserve unexpired purchase links. Verify permissions, health and HTTPS before opening traffic.

Schedule a full operational recovery drill periodically in a separate environment, with outgoing payments/emails disabled. The daily isolated test validates decryption and database integrity, but does not replace this drill.

The old VPS and any one-off migration copies are separate backups. Remove them only after the new off-server backup and a recovery check succeed; no old server data has been deleted by this setup.

## Draft policy wording — publish after activation

Children’s details, letters and PDFs are deleted from our active database six months after purchase. Encrypted recovery backups follow a 30-day retention schedule, with expiry checked hourly. Deletion may be delayed during outages or failed cleanup jobs. Backups are used only for recovery, and expired letter content is removed before restored data becomes available. Downloaded or emailed copies and providers’ own records follow separate retention rules.
