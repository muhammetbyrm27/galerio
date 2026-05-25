/**
 * İşlenmiş mesajı Socket.io ile istemcilere dağıtır.
 */
function emitMessageProcessed(io, { newMessage, sender }) {
  const { conversation_id, sender_id, receiver_id } = newMessage;

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
      (s) => s.userRole === 'user' && s.userId === receiver_id
    );

    console.log(`🎯 ${userSockets.length} user socket bulundu`);

    userSockets.forEach((userSocket) => {
      userSocket.emit('update_notification_count');
    });
  }
}

module.exports = { emitMessageProcessed };
