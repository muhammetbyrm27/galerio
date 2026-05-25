export const buildUserConversationId = (userId, vehicleId, adminId) =>
  `user_${userId}_vehicle_${vehicleId}_admin_${adminId}`;

export const parseConversationId = (conversationId) => {
  const userIdMatch = conversationId?.match(/user_(\d+)_/);
  const vehicleIdMatch = conversationId?.match(/vehicle_(\d+)_/);
  const adminIdMatch = conversationId?.match(/admin_(\d+)$/);
  return {
    userId: userIdMatch ? parseInt(userIdMatch[1], 10) : null,
    vehicleId: vehicleIdMatch ? parseInt(vehicleIdMatch[1], 10) : null,
    adminId: adminIdMatch ? parseInt(adminIdMatch[1], 10) : null,
  };
};
