const Report = require('../../../infrastructure/models/report');

const getAllReportsUC = async (page = 1, limit = 10, filters = {}) => {
    try {
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Build query with filters
        let query = {};

        // Apply filters if provided
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.reportType) {
            query.reportType = filters.reportType;
        }
        if (filters.priority) {
            query.priority = filters.priority;
        }
        if (filters.startDate && filters.endDate) {
            query.createdAt = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        // Execute query with pagination
        const reports = await Report.find(query)
            .sort({ createdAt: -1 }) // Sort by most recent first
            .skip(skip)
            .limit(limit);

        // Get total count for pagination metadata
        const totalReports = await Report.countDocuments(query);
        const totalPages = Math.ceil(totalReports / limit);

        return {
            success: true,
            message: 'Reports fetched successfully',
            data: reports,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalReports,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    } catch (error) {
        console.error('Error fetching reports:', error);
        throw new Error(`Failed to fetch reports: ${error.message}`);
    }
};

module.exports = { getAllReportsUC };