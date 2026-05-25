const { pool } = require('./db');

const ensureHiddenInboxTable = async () => {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS hidden_conversations (
            user_id INT NOT NULL,
            conversation_id VARCHAR(255) NOT NULL,
            hidden_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, conversation_id),
            INDEX idx_hidden_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
};

const hideConversationForUser = async (userId, conversationId) => {
  await ensureHiddenInboxTable();
  await pool.query(
    `INSERT INTO hidden_conversations (user_id, conversation_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE hidden_at = CURRENT_TIMESTAMP`,
    [userId, conversationId]
  );
};

const unhideConversationForUser = async (userId, conversationId) => {
  await ensureHiddenInboxTable();
  await pool.query(
    'DELETE FROM hidden_conversations WHERE user_id = ? AND conversation_id = ?',
    [userId, conversationId]
  );
};

const HIDDEN_INBOX_SQL = `AND NOT EXISTS (
    SELECT 1 FROM hidden_conversations hc
    WHERE hc.user_id = ? AND hc.conversation_id = m.conversation_id
)`;

module.exports = {
  ensureHiddenInboxTable,
  hideConversationForUser,
  unhideConversationForUser,
  HIDDEN_INBOX_SQL,
};
