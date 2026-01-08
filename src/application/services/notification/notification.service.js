const Notification = require('../../../infrastructure/models/notification');
const { getSocketServer } = require('../../../presentation/sockets/socketRegistry');

const buildPayload = (doc) => ({
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    level: doc.level,
    title: doc.title,
    message: doc.message,
    data: doc.data || {},
    readAt: doc.readAt,
    createdAt: doc.createdAt
});

const emitNotification = (payload) => {
    const io = getSocketServer();
    if (!io || !payload?.userId) return;
    io.to(`user:${payload.userId}`).emit('notification:new', payload);
};

const createNotification = async ({ userId, title, message, type = 'system', level = 'info', data = {} }) => {
    if (!userId) return null;
    const doc = await Notification.create({
        userId,
        title: String(title || '').trim(),
        message: String(message || '').trim(),
        type,
        level,
        data
    });
    const payload = buildPayload(doc);
    emitNotification(payload);
    return payload;
};

const createNotifications = async ({ userIds = [], title, message, type = 'system', level = 'info', data = {} }) => {
    const unique = [...new Set(userIds.filter(Boolean).map((id) => id.toString()))];
    if (unique.length === 0) return [];
    const docs = await Notification.insertMany(
        unique.map((userId) => ({
            userId,
            title: String(title || '').trim(),
            message: String(message || '').trim(),
            type,
            level,
            data
        }))
    );
    const payloads = docs.map(buildPayload);
    payloads.forEach(emitNotification);
    return payloads;
};

module.exports = { createNotification, createNotifications };
