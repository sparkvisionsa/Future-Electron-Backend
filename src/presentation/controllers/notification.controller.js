const Notification = require('../../infrastructure/models/notification');

const sanitizeLimit = (value, fallback = 20) => {
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit <= 0) return fallback;
    return Math.min(limit, 200);
};

exports.listNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const limit = sanitizeLimit(req.query.limit);
        const unreadOnly = String(req.query.unread || '').toLowerCase() === 'true';
        const before = req.query.before ? new Date(req.query.before) : null;

        const query = { userId };
        if (unreadOnly) {
            query.readAt = null;
        }
        if (before && !Number.isNaN(before.getTime())) {
            query.createdAt = { $lt: before };
        }

        const [notifications, unreadCount] = await Promise.all([
            Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
            Notification.countDocuments({ userId, readAt: null })
        ]);

        return res.json({ notifications, unreadCount });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load notifications', error: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const unreadCount = await Notification.countDocuments({ userId, readAt: null });
        return res.json({ unreadCount });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load unread count', error: err.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { $set: { readAt: new Date() } },
            { new: true }
        ).lean();

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        return res.json({ notification });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to mark notification read', error: err.message });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const result = await Notification.updateMany(
            { userId, readAt: null },
            { $set: { readAt: new Date() } }
        );

        return res.json({ updated: result.modifiedCount || 0 });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to mark notifications read', error: err.message });
    }
};
