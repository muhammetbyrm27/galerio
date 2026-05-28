const { pool } = require('./db');

let ensured = false;

async function ensureMessagesSchema() {
  if (ensured) return;

  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));

  if (!names.has('is_read_by_admin')) {
    await pool.query(
      'ALTER TABLE messages ADD COLUMN is_read_by_admin BOOLEAN NOT NULL DEFAULT FALSE'
    );
    console.log('✅ messages.is_read_by_admin kolonu eklendi.');
  }
  if (!names.has('is_read_by_user')) {
    await pool.query(
      'ALTER TABLE messages ADD COLUMN is_read_by_user BOOLEAN NOT NULL DEFAULT FALSE'
    );
    console.log('✅ messages.is_read_by_user kolonu eklendi.');
  }

  ensured = true;
}

const ADMIN_CONV_REGEXP = '^user_[0-9]+_vehicle_[0-9]+_admin_[0-9]+$';

function adminConversationFilterSql(alias = 'm', adminId) {
  
  
  
  return {
    sql: `${alias}.conversation_id REGEXP ?`,
    params: [ADMIN_CONV_REGEXP],
  };
}

module.exports = {
  ensureMessagesSchema,
  ADMIN_CONV_REGEXP,
  adminConversationFilterSql,
};
