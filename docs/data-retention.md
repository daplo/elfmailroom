# Letter retention

Letter content expires six calendar months after the first confirmed payment, using UTC and clamping month-end dates. Unpaid orders expire six months after creation. Existing dated purchases use their creation date as the best available historical timestamp; legacy records with no date receive six months from migration rather than immediate deletion. Replayed payment events cannot extend access or restore expired content.

The API runs cleanup at startup, every minute, and before API requests. It removes child details, current letters, version history, rewrite instructions, PDF BLOBs, private-link and guest-access hashes, and generation references. It preserves separate order/payment and terms-acceptance records for accounting and support. Expired content is unavailable to customers and admins, and background generation cannot restore it. PDF creation checks expiry again before persistence. Queue workers skip expired purchases. SQLite secure deletion is enabled for freed database content.

The privacy policy and purchase terms explain the same period in all five languages. Downloaded and emailed copies, provider retention, filesystem snapshots, backups and logs are outside active database cleanup. The operator must separately configure and disclose their retention schedules; no claim is made that this worker deletes external copies. Restore a backup only with this cleanup running before exposing API traffic. Delete or age out migration backups, including the old VPS, according to the chosen backup policy.

Implementation: `apps/api/src/retention.js`. Regression checks: `tests/retention.test.js` and the expired access checks in `tests/api.test.js`.
