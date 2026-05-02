const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
    {
        submitted: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        batches: { type: Number, default: 0 },
        lastAt: { type: Date, default: null }
    },
    { _id: false }
);

const userUploadStatSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        officeId: { type: String, required: true },
        companyNameHint: { type: String, default: '' },
        quick: { type: channelSchema, default: () => ({}) },
        elrajhi: { type: channelSchema, default: () => ({}) }
    },
    { timestamps: true }
);

userUploadStatSchema.index({ userId: 1, officeId: 1 }, { unique: true });

const UserUploadStat = mongoose.model('UserUploadStat', userUploadStatSchema);
module.exports = UserUploadStat;
