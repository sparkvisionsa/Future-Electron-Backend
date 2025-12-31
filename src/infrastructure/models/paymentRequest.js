const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    packageName: { type: String, required: true },
    packagePoints: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
    transferImagePath: { type: String, default: '' },
    transferImageOriginalName: { type: String, default: '' },
    userNotified: { type: Boolean, default: true },
    decisionAt: { type: Date, default: null }
}, { timestamps: true });

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
module.exports = PaymentRequest;
