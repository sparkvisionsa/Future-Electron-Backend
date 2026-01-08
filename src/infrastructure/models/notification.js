const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, default: 'system' },
        level: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
        title: { type: String, default: '' },
        message: { type: String, default: '' },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
        readAt: { type: Date, default: null }
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
