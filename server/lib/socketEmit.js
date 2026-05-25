/**
 * İşlenmiş mesajı Socket.io ile istemcilere dağıtır.
 */
async function emitMessageProcessed(io, db, { newMessage, sender }) {
  const { conversation_id, sender_id, receiver_id, vehicle_id } = newMessage;

  let vehicle = null;
  if (vehicle_id) {
    try {
      const [rows] = await db.query(
        `SELECT v.id, v.brand, v.model, v.year, v.color, v.mileage, v.gear, v.fuel, v.sale_price,
                (SELECT photo_url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id ASC LIMIT 1) AS photo_url
         FROM vehicles v WHERE v.id = ?`,
        [vehicle_id]
      );
      vehicle = rows[0] || null;
    } catch (err) {
      console.warn('Araç özeti alınamadı:', err.message);
    }
  }

  console.log(`📤 Mesaj odaya gönderiliyor: ${conversation_id}`);
  io.to(conversation_id).emit('receive_message', newMessage);

  if (sender.role === 'user') {
    console.log(`📨 User ${sender_id} mesaj gönderdi — tüm adminlere bildirim`);

    const adminSockets = Array.from(io.sockets.sockets.values()).filter(
      (s) => s.userRole === 'admin'
    );

    console.log(`🎯 ${adminSockets.length} bağlı admin socket`);

    adminSockets.forEach((adminSocket) => {
      adminSocket.emit('admin_new_unread_message', {
        conversationId: conversation_id,
        message: newMessage,
        vehicle,
      });
      adminSocket.emit('receive_message', newMessage);
    });

    io.emit('admin_refresh_conversations');
    io.emit('conversation_read_status_updated', {
      conversationId: conversation_id,
    });
  } else if (sender.role === 'admin') {
    console.log(
      `📨 Admin ${sender_id} mesaj gönderdi, user ${receiver_id}'e bildirim gönderiliyor`
    );

    const userSockets = Array.from(io.sockets.sockets.values()).filter(
      (s) => s.userRole === 'user' && Number(s.userId) === Number(receiver_id)
    );

    console.log(`🎯 ${userSockets.length} user socket bulundu`);

    userSockets.forEach((userSocket) => {
      userSocket.emit('update_notification_count');
    });
  }
}

module.exports = { emitMessageProcessed };
