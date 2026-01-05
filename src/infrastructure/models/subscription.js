const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    subscriptionDate: { type: Date, default: Date.now },
    remainingPoints: { type: Number, required: true },
    consumedPoints: { type: Number, default: 0 },
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
