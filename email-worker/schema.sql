CREATE TABLE IF NOT EXISTS mail_messages (
 id TEXT PRIMARY KEY,
 message_id TEXT NOT NULL UNIQUE,
 sender TEXT NOT NULL,
 recipient TEXT NOT NULL,
 subject TEXT NOT NULL DEFAULT '',
 raw_message TEXT NOT NULL,
 received_at TEXT NOT NULL DEFAULT (datetime('now')),
 status TEXT NOT NULL DEFAULT 'received',
 linked_contract_id TEXT,
 linked_lead_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_mail_messages_received ON mail_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_sender ON mail_messages(sender);
