export async function logAdminActivity(db, category, action, username, description, status) {
    try {
        const logsCollection = db.collection('admin_logs');
        await logsCollection.insertOne({
            category,
            action,
            username,
            description,
            status,
            timestamp: new Date(),
            ip: 'N/A', // In production, extract from request
            userAgent: 'N/A' // In production, extract from request
        });
    }
    catch (error) {
        console.error('Error logging admin activity:', error);
        // Don't throw - logging failures shouldn't break the app
    }
}
//# sourceMappingURL=adminLogs.js.map