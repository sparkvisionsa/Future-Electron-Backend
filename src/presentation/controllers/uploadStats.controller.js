const mongoose = require('mongoose');
const UserUploadStat = require('../../infrastructure/models/userUploadStat');

const toObjectId = (userId) => {
    const s = String(userId || '').trim();
    if (!s || !mongoose.Types.ObjectId.isValid(s)) {
        return null;
    }
    return new mongoose.Types.ObjectId(s);
};

const normalizeOfficeKey = (officeId) => {
    const s = String(officeId ?? '').trim();
    return s || '_unknown';
};

const toMillis = (value) => {
    if (value == null) return null;
    if (value instanceof Date) return value.getTime();
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
};

const serializeDoc = (doc) => {
    const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
        officeId: o.officeId,
        companyNameHint: o.companyNameHint || '',
        quick: {
            submitted: o.quick?.submitted || 0,
            failed: o.quick?.failed || 0,
            batches: o.quick?.batches || 0,
            lastAt: toMillis(o.quick?.lastAt)
        },
        elrajhi: {
            submitted: o.elrajhi?.submitted || 0,
            failed: o.elrajhi?.failed || 0,
            batches: o.elrajhi?.batches || 0,
            lastAt: toMillis(o.elrajhi?.lastAt)
        }
    };
};

exports.listUploadStats = async (req, res) => {
    try {
        const userObjectId = toObjectId(req.userId);
        if (!userObjectId) {
            return res.status(400).json({ message: 'Invalid user' });
        }
        const rows = await UserUploadStat.find({ userId: userObjectId }).lean();
        return res.json({ items: rows.map(serializeDoc) });
    } catch (err) {
        console.error('[uploadStats] list', err);
        return res.status(500).json({ message: err.message || 'Failed to load stats' });
    }
};

exports.recordUploadStat = async (req, res) => {
    try {
        const userObjectId = toObjectId(req.userId);
        if (!userObjectId) {
            return res.status(400).json({ message: 'Invalid user' });
        }

        const channel = String(req.body?.channel || '').toLowerCase() === 'elrajhi' ? 'elrajhi' : 'quick';
        const inserted = Math.max(0, Math.trunc(Number(req.body?.inserted) || 0));
        const failed = Math.max(0, Math.trunc(Number(req.body?.failed) || 0));
        if (inserted === 0 && failed === 0) {
            return res.status(400).json({ message: 'Nothing to record' });
        }

        const officeId = normalizeOfficeKey(req.body?.officeId);
        const nameHint = typeof req.body?.nameHint === 'string' ? req.body.nameHint.trim().slice(0, 200) : '';

        const now = new Date();
        const setFields = {
            [`${channel}.lastAt`]: now
        };
        if (nameHint) {
            setFields.companyNameHint = nameHint;
        }

        const update = {
            $inc: {
                [`${channel}.submitted`]: inserted,
                [`${channel}.failed`]: failed,
                [`${channel}.batches`]: 1
            },
            $set: setFields,
            $setOnInsert: {
                userId: userObjectId,
                officeId,
                quick: { submitted: 0, failed: 0, batches: 0, lastAt: null },
                elrajhi: { submitted: 0, failed: 0, batches: 0, lastAt: null }
            }
        };

        const doc = await UserUploadStat.findOneAndUpdate({ userId: userObjectId, officeId }, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });

        return res.json({ ok: true, item: serializeDoc(doc) });
    } catch (err) {
        console.error('[uploadStats] record', err);
        return res.status(500).json({ message: err.message || 'Failed to record stats' });
    }
};

exports.clearUploadStats = async (req, res) => {
    try {
        const userObjectId = toObjectId(req.userId);
        if (!userObjectId) {
            return res.status(400).json({ message: 'Invalid user' });
        }
        await UserUploadStat.deleteMany({ userId: userObjectId });
        return res.json({ ok: true });
    } catch (err) {
        console.error('[uploadStats] clear', err);
        return res.status(500).json({ message: err.message || 'Failed to clear stats' });
    }
};
