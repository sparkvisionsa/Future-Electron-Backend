const bcrypt = require('bcryptjs');
const User = require('../../infrastructure/models/user');
const Company = require('../../infrastructure/models/company');
const Report = require('../../infrastructure/models/report');
const UrgentReport = require('../../infrastructure/models/UrgentReport');
const DuplicateReport = require('../../infrastructure/models/DuplicateReport');
const MultiApproachReport = require('../../infrastructure/models/MultiApproachReport');
const ElrajhiReport = require('../../infrastructure/models/ElrajhiReport');

const ensureCompanyHead = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const isHead = user.type === 'company' || user.role === 'company-head';
    if (!isHead) {
        throw new Error('Only company heads can manage members');
    }

    if (!user.company) {
        throw new Error('Company is not linked to this account');
    }

    return user;
};

const buildLast7Days = () => {
    const labels = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i -= 1) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        labels.push(day.toISOString().slice(0, 10));
    }
    return labels;
};

const aggregateDailyCounts = async (Model, match) => {
    if (!Model) return {};
    const rows = await Model.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        }
    ]);
    return rows.reduce((acc, row) => {
        acc[row._id] = row.count;
        return acc;
    }, {});
};

const mergeDailyCounts = (target, source) => {
    Object.entries(source || {}).forEach(([key, value]) => {
        target[key] = (target[key] || 0) + value;
    });
    return target;
};

exports.listMembers = async (req, res) => {
    try {
        const head = await ensureCompanyHead(req.user.id);
        const members = await User.find({ company: head.company, role: 'member' })
            .select('_id phone displayName permissions createdAt');

        res.json({ members });
    } catch (err) {
        const status = err.message.includes('Only company heads') ? 403 : 400;
        res.status(status).json({ message: err.message });
    }
};

exports.createMember = async (req, res) => {
    try {
        const head = await ensureCompanyHead(req.user.id);
        const { phone, password, displayName, permissions } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ message: 'Phone and password are required.' });
        }

        const existing = await User.findOne({ phone });
        if (existing) {
            return res.status(409).json({ message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const member = new User({
            phone,
            password: hashedPassword,
            type: 'individual',
            role: 'member',
            company: head.company,
            permissions: Array.isArray(permissions) ? permissions : [],
            displayName
        });

        await member.save();

        res.status(201).json({
            message: 'Member created',
            member: {
                _id: member._id,
                phone: member.phone,
                displayName: member.displayName,
                permissions: member.permissions
            }
        });
    } catch (err) {
        const status = err.message.includes('Only company heads') ? 403 : 400;
        res.status(status).json({ message: err.message });
    }
};

exports.updateMember = async (req, res) => {
    try {
        const head = await ensureCompanyHead(req.user.id);
        const { id } = req.params;
        const { phone, password, displayName, permissions } = req.body;

        const member = await User.findById(id);
        if (!member || String(member.company) !== String(head.company)) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        if (phone && phone !== member.phone) {
            const duplicate = await User.findOne({ phone, _id: { $ne: member._id } });
            if (duplicate) {
                return res.status(409).json({ message: 'Phone already in use.' });
            }
            member.phone = phone;
        }

        if (password) {
            member.password = await bcrypt.hash(password, 10);
        }

        if (displayName !== undefined) {
            member.displayName = displayName;
        }

        if (permissions !== undefined) {
            member.permissions = Array.isArray(permissions) ? permissions : [];
        }

        await member.save();

        res.json({
            message: 'Member updated',
            member: {
                _id: member._id,
                phone: member.phone,
                displayName: member.displayName,
                permissions: member.permissions
            }
        });
    } catch (err) {
        const status = err.message.includes('Only company heads') ? 403 : 400;
        res.status(status).json({ message: err.message });
    }
};

exports.deleteMember = async (req, res) => {
    try {
        const head = await ensureCompanyHead(req.user.id);
        const { id } = req.params;
        const member = await User.findById(id);

        if (!member || String(member.company) !== String(head.company)) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        await member.deleteOne();
        res.json({ message: 'Member removed' });
    } catch (err) {
        const status = err.message.includes('Only company heads') ? 403 : 400;
        res.status(status).json({ message: err.message });
    }
};

exports.getCompanyStats = async (req, res) => {
    try {
        const head = await ensureCompanyHead(req.user.id);
        const companyId = head.company;
        const companyDoc = await Company.findById(companyId).select('name headName phone');

        const [
            userCount,
            memberCount,
            reportCount,
            urgentCount,
            duplicateCount,
            multiApproachCount,
            elrajhiCount
        ] = await Promise.all([
            User.countDocuments({ company: companyId }),
            User.countDocuments({ company: companyId, role: 'member' }),
            Report.countDocuments({ company: companyId }),
            UrgentReport.countDocuments({ company: companyId }),
            DuplicateReport.countDocuments({ company: companyId }),
            MultiApproachReport.countDocuments({ company: companyId }),
            ElrajhiReport.countDocuments({ company: companyId })
        ]);

        const reportTypes = {
            standard: reportCount,
            urgent: urgentCount,
            duplicate: duplicateCount,
            multiApproach: multiApproachCount,
            elrajhi: elrajhiCount
        };

        const totals = {
            users: userCount,
            members: memberCount,
            reports: Object.values(reportTypes).reduce((sum, value) => sum + value, 0)
        };

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);
        const baseMatch = { company: companyId, createdAt: { $gte: start } };

        const [
            userDaily,
            standardDaily,
            urgentDaily,
            duplicateDaily,
            multiApproachDaily,
            elrajhiDaily
        ] = await Promise.all([
            aggregateDailyCounts(User, { company: companyId, createdAt: { $gte: start } }),
            aggregateDailyCounts(Report, baseMatch),
            aggregateDailyCounts(UrgentReport, baseMatch),
            aggregateDailyCounts(DuplicateReport, baseMatch),
            aggregateDailyCounts(MultiApproachReport, baseMatch),
            aggregateDailyCounts(ElrajhiReport, baseMatch)
        ]);

        const reportDaily = mergeDailyCounts(
            mergeDailyCounts(
                mergeDailyCounts(
                    mergeDailyCounts(
                        mergeDailyCounts({}, standardDaily),
                        urgentDaily
                    ),
                    duplicateDaily
                ),
                multiApproachDaily
            ),
            elrajhiDaily
        );

        const labels = buildLast7Days();
        const weekly = {
            labels,
            users: labels.map((label) => userDaily[label] || 0),
            reports: labels.map((label) => reportDaily[label] || 0)
        };

        const statusRows = await UrgentReport.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: '$report_status', count: { $sum: 1 } } }
        ]);
        const reportStatus = {
            incomplete: 0,
            complete: 0,
            sent: 0,
            confirmed: 0
        };
        statusRows.forEach((row) => {
            const key = String(row._id || '').toLowerCase();
            if (key === 'incomplete') reportStatus.incomplete = row.count;
            if (key === 'complete') reportStatus.complete = row.count;
            if (key === 'sent') reportStatus.sent = row.count;
            if (key === 'confirmed') reportStatus.confirmed = row.count;
        });

        res.json({
            generatedAt: new Date().toISOString(),
            company: {
                id: companyDoc?._id || companyId,
                name: companyDoc?.name || head.companyName || 'Company',
                headName: companyDoc?.headName || head.headName || 'Head'
            },
            totals,
            reportTypes,
            reportStatus,
            weekly
        });
    } catch (err) {
        const status = err.message.includes('Only company heads') ? 403 : 400;
        res.status(status).json({ message: err.message });
    }
};
