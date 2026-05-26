const { unhideConversationForUser } = require('./inbox');

/**
 * Mesajı veritabanına yazar (RabbitMQ worker veya doğrudan API).
 */
async function processIncomingMessage(db, data) {
  const {
    conversation_id,
    sender_id,
    vehicle_id,
    message,
  } = data;

  const [senderResult] = await db.query(
    'SELECT name, role FROM users WHERE id = ?',
    [sender_id]
  );
  if (senderResult.length === 0) {
    throw new Error(`Gönderici bulunamadı: ${sender_id}`);
  }
  const sender = senderResult[0];

  const userIdMatch = conversation_id.match(/user_(\d+)_/);
  const adminIdMatch = conversation_id.match(/admin_(\d+)$/);
  const adminIdFromConv = adminIdMatch ? parseInt(adminIdMatch[1], 10) : null;
  const userIdFromConv = userIdMatch ? parseInt(userIdMatch[1], 10) : null;

  // receiver_id'yi istemciden değil, veritabanından belirle:
  // Kullanıcı gönderiyorsa -> gerçek admin'i bul
  // Admin gönderiyorsa -> conversation'daki kullanıcıyı hedefle
  let actualReceiverId = data.receiver_id;

  if (sender.role !== 'admin') {
    // Kullanıcı mesaj atıyor: veritabanındaki ilk admin'i bul
    const [adminRows] = await db.query(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
    );
    if (adminRows.length === 0) {
      throw new Error('Sistemde admin bulunamadı.');
    }
    actualReceiverId = adminRows[0].id;
  } else if (userIdFromConv) {
    // Admin mesaj atıyor: conversation'dan kullanıcıyı bul
    actualReceiverId = userIdFromConv;
  }

  const isReadByAdmin = sender.role === 'admin';
  const isReadByUser = sender.role === 'user';

  const sql =
    'INSERT INTO messages (conversation_id, sender_id, receiver_id, vehicle_id, message, created_at, is_read_by_admin, is_read_by_user) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)';

  const [result] = await db.query(sql, [
    conversation_id,
    sender_id,
    actualReceiverId,
    vehicle_id,
    message,
    isReadByAdmin,
    isReadByUser,
  ]);

  await unhideConversationForUser(sender_id, conversation_id);
  await unhideConversationForUser(actualReceiverId, conversation_id);
  if (adminIdFromConv && adminIdFromConv !== actualReceiverId) {
    await unhideConversationForUser(adminIdFromConv, conversation_id);
  }
  await db.query(
    'DELETE FROM hidden_conversations WHERE conversation_id = ?',
    [conversation_id]
  );

  const newMessage = {
    id: result.insertId,
    conversation_id,
    sender_id,
    receiver_id: actualReceiverId,
    vehicle_id,
    message,
    sender_name: sender.name,
    created_at: new Date().toISOString(),
  };

  return { newMessage, sender };
}

module.exports = { processIncomingMessage };
