import express from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';
import { logAdminActivity } from '../utils/adminLogs.js';
import { logCashierActivity } from '../utils/cashierLogs.js';
import { emitTableUpdate } from '../utils/websocket.js';
import { hashPassword, comparePassword } from '../utils/password.js';
const router = express.Router();
// Helper function to get admin username from request
// In production, this should extract from JWT token or session
function getAdminUsername(req) {
    // Try to get from header (if sent from frontend)
    const adminUsername = req.headers['x-admin-username'];
    if (adminUsername) {
        return adminUsername;
    }
    // Try to get from request body (for some operations)
    if (req.body && req.body.adminUsername) {
        return req.body.adminUsername;
    }
    // Default fallback
    return 'Admin';
}
// Cashier login endpoint
router.post('/cashier/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Get IP address and user agent from request
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'N/A';
        const userAgent = req.headers['user-agent'] || 'N/A';
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();
        // Find cashier by username (exact match, case-sensitive)
        const cashier = await cashiersCollection.findOne({ username: trimmedUsername });
        if (!cashier) {
            console.log(`[Cashier Login] User not found: ${trimmedUsername}`);
            // Log failed login attempt to cashier_logs
            await logCashierActivity(db, 'Login', trimmedUsername, 'Failed cashier login attempt - User not found', 'failed', typeof ip === 'string' ? ip : 'N/A', userAgent).catch(err => console.error('Error logging cashier activity:', err));
            // Also log to admin_logs for admin visibility
            await logAdminActivity(db, 'Login', 'Cashier Login', trimmedUsername, 'Failed cashier login attempt - User not found', 'failed').catch(err => console.error('Error logging admin activity:', err));
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Check if cashier is active
        if (!cashier.isActive) {
            console.log(`[Cashier Login] Account deactivated: ${trimmedUsername}`);
            // Log failed login attempt to cashier_logs
            await logCashierActivity(db, 'Login', trimmedUsername, 'Failed cashier login attempt - Account is deactivated', 'failed', typeof ip === 'string' ? ip : 'N/A', userAgent).catch(err => console.error('Error logging cashier activity:', err));
            // Also log to admin_logs
            await logAdminActivity(db, 'Login', 'Cashier Login', trimmedUsername, 'Failed cashier login attempt - Account is deactivated', 'failed').catch(err => console.error('Error logging admin activity:', err));
            return res.status(403).json({
                success: false,
                error: 'Your account has been deactivated. Please contact an administrator.'
            });
        }
        // Check if password field exists and is valid
        if (!cashier.password) {
            console.error(`[Cashier Login] Cashier found but password field is missing: ${trimmedUsername}`);
            return res.status(500).json({
                success: false,
                error: 'Account configuration error. Please contact an administrator.'
            });
        }
        // Verify password (plain text comparison)
        let isPasswordValid = false;
        try {
            // Debug logging (remove in production)
            console.log(`[Cashier Login] Comparing password for: ${trimmedUsername}`);
            console.log(`[Cashier Login] Input password length: ${trimmedPassword.length}, Stored password length: ${cashier.password?.length || 0}`);
            console.log(`[Cashier Login] Stored password starts with: ${cashier.password?.substring(0, 10) || 'N/A'}`);
            isPasswordValid = await comparePassword(trimmedPassword, cashier.password);
            console.log(`[Cashier Login] Password comparison result: ${isPasswordValid}`);
        }
        catch (compareError) {
            console.error(`[Cashier Login] Password comparison error for ${trimmedUsername}:`, compareError);
            return res.status(500).json({
                success: false,
                error: 'Internal server error during authentication'
            });
        }
        if (!isPasswordValid) {
            console.log(`[Cashier Login] Invalid password for: ${trimmedUsername}`);
            console.log(`[Cashier Login] Expected: "${cashier.password}", Got: "${trimmedPassword}"`);
            // Log failed login attempt to cashier_logs
            await logCashierActivity(db, 'Login', trimmedUsername, 'Failed cashier login attempt - Invalid password', 'failed', typeof ip === 'string' ? ip : 'N/A', userAgent).catch(err => console.error('Error logging cashier activity:', err));
            // Also log to admin_logs
            await logAdminActivity(db, 'Login', 'Cashier Login', trimmedUsername, 'Failed cashier login attempt - Invalid password', 'failed').catch(err => console.error('Error logging admin activity:', err));
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Update lastLogin timestamp
        await cashiersCollection.updateOne({ _id: cashier._id }, {
            $set: {
                lastLogin: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`[Cashier Login] Successful login: ${trimmedUsername}`);
        // Log successful login to cashier_logs
        await logCashierActivity(db, 'Login', trimmedUsername, 'Successful cashier login', 'success', typeof ip === 'string' ? ip : 'N/A', userAgent).catch(err => console.error('Error logging cashier activity:', err));
        // Also log to admin_logs for admin visibility
        await logAdminActivity(db, 'Login', 'Cashier Login', trimmedUsername, 'Successful cashier login', 'success').catch(err => console.error('Error logging admin activity:', err));
        // Check for active shift
        const shiftsCollection = db.collection('cashier_shift');
        const activeShift = await shiftsCollection.findOne({
            cashierId: cashier._id.toString(),
            status: 'active'
        });
        // Return success (in production, include JWT token)
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: cashier._id.toString(),
                username: cashier.username,
                fullName: cashier.fullName,
                email: cashier.email || '',
                phone: cashier.phone || '',
                role: 'cashier'
            },
            activeShift: activeShift ? {
                id: activeShift._id.toString(),
                cashInAmount: activeShift.cashInAmount,
                cashInTime: activeShift.cashInTime,
                shiftDate: activeShift.shiftDate,
                createdAt: activeShift.createdAt
            } : null
        });
    }
    catch (error) {
        console.error('Cashier login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Admin login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        const trimmedUsername = (typeof username === 'string' ? username : String(username)).trim();
        const trimmedPassword = (typeof password === 'string' ? password : String(password)).trim();
        const db = getDatabase();
        const usersCollection = db.collection('users');
        // Find user by username (exact match)
        const user = await usersCollection.findOne({ username: trimmedUsername });
        if (!user) {
            // Log failed login attempt
            await logAdminActivity(db, 'Login', 'Login', trimmedUsername, 'Failed login attempt - User not found', 'failed');
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Check password field exists
        if (!user.password || typeof user.password !== 'string') {
            console.error(`[Admin Login] User found but password field missing or invalid: ${trimmedUsername}`);
            return res.status(500).json({
                success: false,
                error: 'Account configuration error. Please contact an administrator.'
            });
        }
        // Verify password using bcrypt
        const isPasswordValid = await comparePassword(trimmedPassword, user.password);
        if (!isPasswordValid) {
            // Log failed login attempt
            await logAdminActivity(db, 'Login', 'Login', trimmedUsername, 'Failed login attempt - Invalid password', 'failed');
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Log successful login
        await logAdminActivity(db, 'Login', 'Login', trimmedUsername, 'Successful admin login', 'success');
        // Return success (in production, include JWT token)
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                username: user.username,
                role: user.role || 'admin'
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get admin profile endpoint
router.get('/profile', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        const db = getDatabase();
        const usersCollection = db.collection('users');
        // Find user by username
        const user = await usersCollection.findOne({ username: username.toString().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Return user profile (exclude password)
        const { password, ...profile } = user;
        res.json({
            success: true,
            profile: {
                username: profile.username,
                fullName: profile.fullName || profile.name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                role: profile.role || 'admin',
                ...profile
            }
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update admin profile endpoint
router.put('/profile', async (req, res) => {
    try {
        const { username, fullName, email, phone } = req.body;
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }
        // Validate email if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a valid email address'
            });
        }
        const db = getDatabase();
        const usersCollection = db.collection('users');
        // Find user by username
        const user = await usersCollection.findOne({ username: username.trim() });
        if (!user) {
            // Log failed profile update attempt
            await logAdminActivity(db, 'Profile', 'Profile Update', username.trim(), 'Failed profile update - User not found', 'failed');
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const updateData = {
            fullName: fullName.trim(),
            updatedAt: new Date()
        };
        if (email) {
            updateData.email = email.trim();
        }
        if (phone) {
            updateData.phone = phone.trim();
        }
        const result = await usersCollection.updateOne({ username: username.trim() }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Log successful profile update
        await logAdminActivity(db, 'Profile', 'Profile Update', username.trim(), `Profile updated: ${fullName.trim()}`, 'success');
        // Get updated user
        const updatedUser = await usersCollection.findOne({ username: username.trim() });
        const { password: _, ...profile } = updatedUser;
        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: {
                username: profile.username,
                fullName: profile.fullName || profile.name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                role: profile.role || 'admin',
                ...profile
            }
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Change password endpoint
router.post('/change-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        if (!username || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Username, current password, and new password are required'
            });
        }
        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }
        const db = getDatabase();
        const usersCollection = db.collection('users');
        // Find user by username
        const user = await usersCollection.findOne({ username: username.trim() });
        if (!user) {
            // Log failed password change attempt
            await logAdminActivity(db, 'Profile', 'Password Change', username.trim(), 'Failed password change - User not found', 'failed');
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Verify current password using bcrypt
        const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            // Log failed password change attempt
            await logAdminActivity(db, 'Profile', 'Password Change', username.trim(), 'Failed password change - Incorrect current password', 'failed');
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        // Check if new password is the same as current password
        const isSamePassword = await comparePassword(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                error: 'New password must be different from current password'
            });
        }
        // Hash the new password before storing
        const hashedPassword = await hashPassword(newPassword);
        // Update password in database
        const result = await usersCollection.updateOne({ username: username.trim() }, {
            $set: {
                password: hashedPassword,
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Log successful password change
        await logAdminActivity(db, 'Profile', 'Password Change', username.trim(), 'Password changed successfully', 'success');
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get admin activity logs
router.get('/logs', async (req, res) => {
    try {
        const db = getDatabase();
        const logsCollection = db.collection('admin_logs');
        const limit = parseInt(req.query.limit) || 100;
        const skip = parseInt(req.query.skip) || 0;
        const logs = await logsCollection
            .find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .toArray();
        res.json({
            success: true,
            logs,
            total: await logsCollection.countDocuments()
        });
    }
    catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get cashier login logs
router.get('/cashier/logs', async (req, res) => {
    try {
        const db = getDatabase();
        const logsCollection = db.collection('cashier_logs');
        const limit = parseInt(req.query.limit) || 100;
        const skip = parseInt(req.query.skip) || 0;
        const username = req.query.username;
        const query = {};
        if (username) {
            query.username = username.trim();
        }
        const logs = await logsCollection
            .find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .toArray();
        res.json({
            success: true,
            logs,
            total: await logsCollection.countDocuments(query)
        });
    }
    catch (error) {
        console.error('Get cashier logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Cashier password change endpoint
router.post('/cashier/change-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        if (!username || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Username, current password, and new password are required'
            });
        }
        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Find cashier by username
        const cashier = await cashiersCollection.findOne({ username: username.trim() });
        if (!cashier) {
            await logCashierActivity(db, 'Profile', username.trim(), 'Failed password change - User not found', 'failed');
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Verify current password using bcrypt
        const isCurrentPasswordValid = await comparePassword(currentPassword, cashier.password);
        if (!isCurrentPasswordValid) {
            await logCashierActivity(db, 'Profile', username.trim(), 'Failed password change - Incorrect current password', 'failed');
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        // Check if new password is the same as current password
        const isSamePassword = await comparePassword(newPassword, cashier.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                error: 'New password must be different from current password'
            });
        }
        // Hash the new password before storing
        const hashedPassword = await hashPassword(newPassword);
        // Update password in database
        const result = await cashiersCollection.updateOne({ username: username.trim() }, {
            $set: {
                password: hashedPassword,
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Log successful password change
        await logCashierActivity(db, 'Profile', username.trim(), 'Password changed successfully', 'success');
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Cashier change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get cashier profile endpoint
router.get('/cashier/profile', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        const cashier = await cashiersCollection.findOne({ username: username.trim() });
        if (!cashier) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        const { password: _, ...cashierWithoutPassword } = cashier;
        res.json({
            success: true,
            profile: {
                username: cashierWithoutPassword.username,
                fullName: cashierWithoutPassword.fullName,
                email: cashierWithoutPassword.email || '',
                phone: cashierWithoutPassword.phone || '',
                role: 'cashier'
            }
        });
    }
    catch (error) {
        console.error('Get cashier profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update cashier profile endpoint
router.put('/cashier/profile', async (req, res) => {
    try {
        const { username, fullName, email, phone } = req.body;
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Find cashier
        const cashier = await cashiersCollection.findOne({ username: username.trim() });
        if (!cashier) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Update profile
        const result = await cashiersCollection.updateOne({ username: username.trim() }, {
            $set: {
                fullName: fullName.trim(),
                email: email?.trim() || '',
                phone: phone?.trim() || '',
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Log activity
        await logCashierActivity(db, 'Profile', username.trim(), 'Profile updated successfully', 'success');
        // Get updated cashier
        const updatedCashier = await cashiersCollection.findOne({ username: username.trim() });
        const { password: _, ...cashierWithoutPassword } = updatedCashier;
        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: {
                username: cashierWithoutPassword.username,
                fullName: cashierWithoutPassword.fullName,
                email: cashierWithoutPassword.email || '',
                phone: cashierWithoutPassword.phone || '',
                role: 'cashier'
            }
        });
    }
    catch (error) {
        console.error('Update cashier profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get cashier printers endpoint
router.get('/cashier/printers', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        const db = getDatabase();
        const printersCollection = db.collection('cashier_printers');
        const printers = await printersCollection
            .find({ cashierUsername: username.trim() })
            .sort({ createdAt: -1 })
            .toArray();
        // Transform to match frontend format
        const printersWithId = printers.map((printer) => ({
            id: printer._id.toString(),
            _id: printer._id.toString(),
            cashierId: printer.cashierId,
            cashierUsername: printer.cashierUsername,
            name: printer.name,
            type: printer.type,
            enabled: printer.enabled || false,
            printerName: printer.printerName || '',
            paperSize: printer.paperSize || '58mm',
            copies: printer.copies || 1,
            createdAt: printer.createdAt,
            updatedAt: printer.updatedAt,
        }));
        res.json({
            success: true,
            printers: printersWithId.length > 0 ? printersWithId : []
        });
    }
    catch (error) {
        console.error('Get cashier printers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Save cashier printers endpoint
router.post('/cashier/printers', async (req, res) => {
    try {
        const { cashierUsername, printers } = req.body;
        if (!cashierUsername) {
            return res.status(400).json({
                success: false,
                error: 'Cashier username is required'
            });
        }
        if (!printers || !Array.isArray(printers)) {
            return res.status(400).json({
                success: false,
                error: 'Printers array is required'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        const printersCollection = db.collection('cashier_printers');
        // Verify cashier exists
        const cashier = await cashiersCollection.findOne({ username: cashierUsername.trim() });
        if (!cashier) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Delete existing printers for this cashier
        await printersCollection.deleteMany({ cashierUsername: cashierUsername.trim() });
        const printersToInsert = printers.map((printer) => ({
            cashierId: cashier._id.toString(),
            cashierUsername: cashierUsername.trim(),
            name: printer.name,
            type: printer.type,
            enabled: printer.enabled || false,
            printerName: printer.printerName || '',
            paperSize: printer.paperSize || '58mm',
            copies: printer.copies || 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));
        if (printersToInsert.length > 0) {
            await printersCollection.insertMany(printersToInsert);
        }
        // Log activity
        await logCashierActivity(db, 'Settings', cashierUsername.trim(), 'Printer configurations saved', 'success');
        res.json({
            success: true,
            message: 'Printer configurations saved successfully'
        });
    }
    catch (error) {
        console.error('Save cashier printers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Cashier Management Endpoints
// Get all cashiers
router.get('/cashiers', async (req, res) => {
    try {
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        const cashiers = await cashiersCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        // Remove passwords from response
        const cashiersWithoutPasswords = cashiers.map(({ password, ...cashier }) => ({
            ...cashier,
            id: cashier._id?.toString() || cashier.id,
            createdAt: cashier.createdAt,
            lastLogin: cashier.lastLogin || undefined,
        }));
        res.json({
            success: true,
            cashiers: cashiersWithoutPasswords
        });
    }
    catch (error) {
        console.error('Get cashiers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Create new cashier
router.post('/cashiers', async (req, res) => {
    try {
        const { username, fullName, email, phone, password, isActive } = req.body;
        // Validation
        if (!username || !username.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }
        if (!password || !password.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }
        // Validate username format (alphanumeric and underscore only, 3-20 characters)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username.trim())) {
            return res.status(400).json({
                success: false,
                error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
            });
        }
        // Validate password length
        if (password.trim().length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }
        // Validate email format if provided
        if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a valid email address'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Check if username already exists
        const existingCashier = await cashiersCollection.findOne({ username: username.trim() });
        if (existingCashier) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists. Please choose a different username'
            });
        }
        // Hash password before storing
        const hashedPassword = await hashPassword(password);
        // Create new cashier
        const newCashier = {
            username: username.trim(),
            fullName: fullName.trim(),
            email: email?.trim() || '',
            phone: phone?.trim() || '',
            password: hashedPassword,
            isActive: isActive !== undefined ? isActive : true,
            createdAt: new Date(),
            lastLogin: undefined,
        };
        const result = await cashiersCollection.insertOne(newCashier);
        // Log activity
        await logAdminActivity(db, 'Cashier', 'Added', fullName.trim(), `New cashier created: ${username.trim()}`, 'success');
        const { password: _, ...cashierWithoutPassword } = newCashier;
        res.json({
            success: true,
            message: 'Cashier created successfully',
            cashier: {
                ...cashierWithoutPassword,
                id: result.insertedId.toString(),
            }
        });
    }
    catch (error) {
        console.error('Create cashier error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update cashier
router.put('/cashiers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, password, isActive } = req.body;
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Find cashier
        const cashier = await cashiersCollection.findOne({ _id: new ObjectId(id) });
        if (!cashier) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        const updateData = {
            fullName: fullName.trim(),
            email: email?.trim() || '',
            phone: phone?.trim() || '',
            isActive: isActive !== undefined ? isActive : cashier.isActive,
            updatedAt: new Date(),
        };
        // Only update password if provided
        if (password && password.trim()) {
            // Hash password before storing
            updateData.password = await hashPassword(password.trim());
        }
        const result = await cashiersCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Cashier', 'Updated', fullName.trim(), `Cashier updated: ${cashier.username}`, 'success');
        // Get updated cashier
        const updatedCashier = await cashiersCollection.findOne({ _id: new ObjectId(id) });
        const { password: _, ...cashierWithoutPassword } = updatedCashier;
        res.json({
            success: true,
            message: 'Cashier updated successfully',
            cashier: {
                ...cashierWithoutPassword,
                id: cashierWithoutPassword._id.toString(),
            }
        });
    }
    catch (error) {
        console.error('Update cashier error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Delete cashier
router.delete('/cashiers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Find cashier before deletion
        const cashier = await cashiersCollection.findOne({ _id: new ObjectId(id) });
        if (!cashier) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        const result = await cashiersCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Cashier', 'Deleted', cashier.fullName, `Cashier deleted: ${cashier.username}`, 'success');
        res.json({
            success: true,
            message: 'Cashier deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete cashier error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Toggle cashier active status
router.patch('/cashiers/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'isActive must be a boolean value'
            });
        }
        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cashier ID format'
            });
        }
        const db = getDatabase();
        const cashiersCollection = db.collection('cashiers');
        // Find cashier
        let cashier;
        try {
            cashier = await cashiersCollection.findOne({ _id: new ObjectId(id) });
        }
        catch (error) {
            console.error('Error finding cashier:', error);
            return res.status(400).json({
                success: false,
                error: 'Invalid cashier ID'
            });
        }
        if (!cashier) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Update status
        let result;
        try {
            result = await cashiersCollection.updateOne({ _id: new ObjectId(id) }, {
                $set: {
                    isActive,
                    updatedAt: new Date()
                }
            });
        }
        catch (error) {
            console.error('Error updating cashier status:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update cashier status'
            });
        }
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cashier not found'
            });
        }
        // Log activity
        try {
            await logAdminActivity(db, 'Cashier', isActive ? 'Activated' : 'Deactivated', cashier.fullName || 'Unknown', `Cashier ${isActive ? 'activated' : 'deactivated'}: ${cashier.username || id}`, 'success');
        }
        catch (logError) {
            console.error('Error logging activity:', logError);
            // Don't fail the request if logging fails
        }
        res.json({
            success: true,
            message: `Cashier ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Toggle cashier status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
        });
    }
});
// Cashier Shift Management Endpoints
// Cash In - Start shift
router.post('/cashier/cash-in', async (req, res) => {
    try {
        const { cashierId, cashierUsername, cashInAmount } = req.body;
        if (!cashierId || !cashierUsername || !cashInAmount) {
            return res.status(400).json({
                success: false,
                error: 'Cashier ID, username, and cash in amount are required'
            });
        }
        const amount = parseFloat(cashInAmount);
        if (isNaN(amount) || amount < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cash in amount'
            });
        }
        const db = getDatabase();
        const shiftsCollection = db.collection('cashier_shift');
        // Check if cashier has an active shift
        const activeShift = await shiftsCollection.findOne({
            cashierId: cashierId.toString(),
            status: 'active'
        });
        if (activeShift) {
            return res.status(400).json({
                success: false,
                error: 'You already have an active shift. Please complete your current shift first.'
            });
        }
        // Create new shift
        const shift = {
            cashierId: cashierId.toString(),
            cashierUsername: cashierUsername.trim(),
            cashInAmount: amount,
            cashInTime: new Date(),
            cashOutAmount: null,
            cashOutTime: null,
            shiftDate: new Date(),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await shiftsCollection.insertOne(shift);
        // Log activity
        await logAdminActivity(db, 'Cashier', 'Cash In', cashierUsername.trim(), `Cash in: Rs. ${amount.toFixed(2)}`, 'success');
        res.json({
            success: true,
            message: 'Cash in recorded successfully',
            shift: {
                ...shift,
                id: result.insertedId.toString(),
            }
        });
    }
    catch (error) {
        console.error('Cash in error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Cash Out - End shift
router.post('/cashier/cash-out', async (req, res) => {
    try {
        const { cashierId, cashierUsername, cashOutAmount } = req.body;
        if (!cashierId || !cashierUsername || !cashOutAmount) {
            return res.status(400).json({
                success: false,
                error: 'Cashier ID, username, and cash out amount are required'
            });
        }
        const amount = parseFloat(cashOutAmount);
        if (isNaN(amount) || amount < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cash out amount'
            });
        }
        const db = getDatabase();
        const shiftsCollection = db.collection('cashier_shift');
        // Find active shift for this cashier
        const activeShift = await shiftsCollection.findOne({
            cashierId: cashierId.toString(),
            status: 'active'
        });
        if (!activeShift) {
            return res.status(404).json({
                success: false,
                error: 'No active shift found. Please contact an administrator.'
            });
        }
        // Calculate difference
        const cashInAmount = activeShift.cashInAmount;
        const difference = amount - cashInAmount;
        // Update shift with cash out
        const result = await shiftsCollection.updateOne({ _id: activeShift._id }, {
            $set: {
                cashOutAmount: amount,
                cashOutTime: new Date(),
                status: 'completed',
                updatedAt: new Date(),
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Shift not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Cashier', 'Cash Out', cashierUsername.trim(), `Cash out: Rs. ${amount.toFixed(2)} (Difference: Rs. ${difference.toFixed(2)})`, 'success');
        // Get updated shift
        const updatedShift = await shiftsCollection.findOne({ _id: activeShift._id });
        res.json({
            success: true,
            message: 'Cash out recorded successfully',
            shift: {
                ...updatedShift,
                id: updatedShift._id.toString(),
                difference: difference,
            }
        });
    }
    catch (error) {
        console.error('Cash out error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get active shift for cashier
router.get('/cashier/active-shift/:cashierId', async (req, res) => {
    try {
        const { cashierId } = req.params;
        const db = getDatabase();
        const shiftsCollection = db.collection('cashier_shift');
        const activeShift = await shiftsCollection.findOne({
            cashierId: cashierId.toString(),
            status: 'active'
        });
        if (!activeShift) {
            return res.json({
                success: true,
                activeShift: null
            });
        }
        res.json({
            success: true,
            activeShift: {
                id: activeShift._id.toString(),
                cashierId: activeShift.cashierId,
                cashierUsername: activeShift.cashierUsername,
                cashInAmount: activeShift.cashInAmount,
                cashInTime: activeShift.cashInTime,
                shiftDate: activeShift.shiftDate,
                status: activeShift.status,
                createdAt: activeShift.createdAt,
                updatedAt: activeShift.updatedAt,
            }
        });
    }
    catch (error) {
        console.error('Get active shift error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get cashier shift history
router.get('/cashier/shifts/:cashierId', async (req, res) => {
    try {
        const { cashierId } = req.params;
        const db = getDatabase();
        const shiftsCollection = db.collection('cashier_shift');
        const shifts = await shiftsCollection
            .find({ cashierId: cashierId.toString() })
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        const shiftsWithId = shifts.map((shift) => ({
            ...shift,
            id: shift._id.toString(),
            difference: shift.cashOutAmount && shift.cashInAmount
                ? shift.cashOutAmount - shift.cashInAmount
                : null,
        }));
        res.json({
            success: true,
            shifts: shiftsWithId
        });
    }
    catch (error) {
        console.error('Get shifts error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Table Management Endpoints
// Get all tables
router.get('/tables', async (req, res) => {
    try {
        const db = getDatabase();
        const tablesCollection = db.collection('tables');
        const tables = await tablesCollection
            .find({})
            .sort({ label: 1 })
            .toArray();
        // Transform to match frontend format
        const tablesWithId = tables.map((table) => ({
            id: table.tableNumber || parseInt(table._id.toString().slice(-6), 16) || table._id.toString(),
            label: table.label,
            capacity: table.capacity,
            available: table.available !== undefined ? table.available : true,
            _id: table._id.toString(),
        }));
        res.json({
            success: true,
            tables: tablesWithId
        });
    }
    catch (error) {
        console.error('Get tables error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Create new table
router.post('/tables', async (req, res) => {
    try {
        const { label, capacity } = req.body;
        if (!label || !label.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Table label is required'
            });
        }
        if (!capacity || isNaN(parseInt(capacity)) || parseInt(capacity) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Valid capacity is required (minimum 1)'
            });
        }
        const db = getDatabase();
        const tablesCollection = db.collection('tables');
        // Check if label already exists
        const existingTable = await tablesCollection.findOne({ label: label.trim() });
        if (existingTable) {
            return res.status(400).json({
                success: false,
                error: 'Table label already exists'
            });
        }
        // Get next table number
        const lastTable = await tablesCollection
            .findOne({}, { sort: { tableNumber: -1 } });
        const nextTableNumber = lastTable ? (lastTable.tableNumber || 0) + 1 : 1;
        // Create new table
        const newTable = {
            tableNumber: nextTableNumber,
            label: label.trim(),
            capacity: parseInt(capacity),
            available: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await tablesCollection.insertOne(newTable);
        // Log activity
        await logAdminActivity(db, 'Table', 'Added', getAdminUsername(req), `New table created: ${label.trim()} (Capacity: ${capacity})`, 'success');
        const createdTable = {
            ...newTable,
            id: newTable.tableNumber,
            _id: result.insertedId.toString(),
        };
        // Emit WebSocket event
        emitTableUpdate({
            type: 'table_created',
            table: {
                id: createdTable.id,
                _id: createdTable._id,
                tableNumber: createdTable.tableNumber,
                label: createdTable.label,
                capacity: createdTable.capacity,
                available: createdTable.available,
            },
            timestamp: Date.now(),
        });
        res.json({
            success: true,
            message: 'Table created successfully',
            table: createdTable
        });
    }
    catch (error) {
        console.error('Create table error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update table
router.put('/tables/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { label, capacity } = req.body;
        if (!label || !label.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Table label is required'
            });
        }
        if (!capacity || isNaN(parseInt(capacity)) || parseInt(capacity) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Valid capacity is required (minimum 1)'
            });
        }
        const db = getDatabase();
        const tablesCollection = db.collection('tables');
        // Find table by _id or tableNumber
        let table;
        if (ObjectId.isValid(id)) {
            table = await tablesCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            // Try to find by tableNumber if id is a number
            const tableNumber = parseInt(id);
            if (!isNaN(tableNumber)) {
                table = await tablesCollection.findOne({ tableNumber });
            }
        }
        if (!table) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        // Check if label already exists (excluding current table)
        const existingTable = await tablesCollection.findOne({
            label: label.trim(),
            _id: { $ne: table._id }
        });
        if (existingTable) {
            return res.status(400).json({
                success: false,
                error: 'Table label already exists'
            });
        }
        // Update table
        const updateData = {
            label: label.trim(),
            capacity: parseInt(capacity),
            updatedAt: new Date(),
        };
        const result = await tablesCollection.updateOne({ _id: table._id }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Table', 'Updated', getAdminUsername(req), `Table updated: ${label.trim()} (Capacity: ${capacity})`, 'success');
        // Get updated table
        const updatedTable = await tablesCollection.findOne({ _id: table._id });
        const tableResponse = {
            ...updatedTable,
            id: updatedTable.tableNumber || updatedTable._id.toString(),
            _id: updatedTable._id.toString(),
            label: updatedTable.label,
            capacity: updatedTable.capacity,
            available: updatedTable.available !== undefined ? updatedTable.available : true,
        };
        // Emit WebSocket event
        emitTableUpdate({
            type: 'table_updated',
            table: {
                id: tableResponse.id,
                _id: tableResponse._id,
                tableNumber: updatedTable.tableNumber,
                label: tableResponse.label,
                capacity: tableResponse.capacity,
                available: tableResponse.available,
            },
            timestamp: Date.now(),
        });
        res.json({
            success: true,
            message: 'Table updated successfully',
            table: tableResponse
        });
    }
    catch (error) {
        console.error('Update table error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Delete table
router.delete('/tables/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const tablesCollection = db.collection('tables');
        // Find table by _id or tableNumber
        let table;
        if (ObjectId.isValid(id)) {
            table = await tablesCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            // Try to find by tableNumber if id is a number
            const tableNumber = parseInt(id);
            if (!isNaN(tableNumber)) {
                table = await tablesCollection.findOne({ tableNumber });
            }
        }
        if (!table) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        const result = await tablesCollection.deleteOne({ _id: table._id });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Table', 'Deleted', getAdminUsername(req), `Table deleted: ${table.label}`, 'success');
        // Emit WebSocket event
        emitTableUpdate({
            type: 'table_deleted',
            tableId: table.tableNumber || table._id.toString(),
            timestamp: Date.now(),
        });
        res.json({
            success: true,
            message: 'Table deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete table error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Toggle table availability
router.patch('/tables/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { available } = req.body;
        if (typeof available !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'available must be a boolean value'
            });
        }
        const db = getDatabase();
        const tablesCollection = db.collection('tables');
        // Find table by _id or tableNumber
        let table;
        if (ObjectId.isValid(id)) {
            table = await tablesCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            // Try to find by tableNumber if id is a number
            const tableNumber = parseInt(id);
            if (!isNaN(tableNumber)) {
                table = await tablesCollection.findOne({ tableNumber });
            }
        }
        if (!table) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        const result = await tablesCollection.updateOne({ _id: table._id }, {
            $set: {
                available,
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Table', available ? 'Made Available' : 'Made Unavailable', getAdminUsername(req), `Table ${available ? 'made available' : 'made unavailable'}: ${table.label}`, 'success');
        // Get updated table
        const updatedTable = await tablesCollection.findOne({ _id: table._id });
        // Emit WebSocket event
        emitTableUpdate({
            type: 'table_availability_changed',
            table: {
                id: table.tableNumber || table._id.toString(),
                _id: table._id.toString(),
                tableNumber: table.tableNumber,
                label: table.label,
                capacity: table.capacity,
                available: available,
            },
            timestamp: Date.now(),
        });
        res.json({
            success: true,
            message: `Table ${available ? 'made available' : 'made unavailable'} successfully`
        });
    }
    catch (error) {
        console.error('Toggle table availability error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Category Management Endpoints
// Get all categories with item counts
router.get('/categories', async (req, res) => {
    try {
        const db = getDatabase();
        const categoriesCollection = db.collection('categories');
        const categories = await categoriesCollection
            .find({})
            .sort({ name: 1 })
            .toArray();
        // Transform to match frontend format (itemCount is stored in category document)
        const categoriesWithId = categories.map((category) => ({
            id: category.id || category._id.toString(),
            name: category.name,
            icon: category.icon || '',
            _id: category._id.toString(),
            itemCount: category.itemCount || 0,
        }));
        res.json({
            success: true,
            categories: categoriesWithId
        });
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Create new category
router.post('/categories', async (req, res) => {
    try {
        const { name, icon } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }
        if (!icon || !icon.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Category icon is required'
            });
        }
        const db = getDatabase();
        const categoriesCollection = db.collection('categories');
        // Generate ID from name (lowercase, replace spaces with hyphens)
        const categoryId = name.toLowerCase().trim().replace(/\s+/g, '-');
        // Check if ID already exists
        const existingCategory = await categoriesCollection.findOne({ id: categoryId });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Category with this name already exists'
            });
        }
        // Create new category
        const newCategory = {
            id: categoryId,
            name: name.trim(),
            icon: icon.trim(),
            itemCount: 0, // Initialize with 0 items
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await categoriesCollection.insertOne(newCategory);
        // Log activity
        await logAdminActivity(db, 'Category', 'Added', getAdminUsername(req), `New category created: ${name.trim()} (Icon: ${icon.trim()})`, 'success');
        const createdCategory = {
            ...newCategory,
            _id: result.insertedId.toString(),
        };
        // Emit WebSocket event (if we add category updates to websocket)
        // emitCategoryUpdate({ type: 'category_created', category: createdCategory, timestamp: Date.now() });
        res.json({
            success: true,
            message: 'Category created successfully',
            category: createdCategory
        });
    }
    catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Update category
router.put('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }
        if (!icon || !icon.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Category icon is required'
            });
        }
        const db = getDatabase();
        const categoriesCollection = db.collection('categories');
        // Find category by _id or id
        let category;
        if (ObjectId.isValid(id)) {
            category = await categoriesCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            category = await categoriesCollection.findOne({ id });
        }
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        // Generate new ID from name if name changed
        const newCategoryId = name.toLowerCase().trim().replace(/\s+/g, '-');
        // Check if new ID already exists (excluding current category)
        if (newCategoryId !== category.id) {
            const existingCategory = await categoriesCollection.findOne({
                id: newCategoryId,
                _id: { $ne: category._id }
            });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    error: 'Category with this name already exists'
                });
            }
        }
        // Update category
        const updateData = {
            id: newCategoryId,
            name: name.trim(),
            icon: icon.trim(),
            updatedAt: new Date(),
        };
        const result = await categoriesCollection.updateOne({ _id: category._id }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Category', 'Updated', getAdminUsername(req), `Category updated: ${name.trim()} (Icon: ${icon.trim()})`, 'success');
        // Get updated category
        const updatedCategory = await categoriesCollection.findOne({ _id: category._id });
        const categoryResponse = {
            ...updatedCategory,
            id: updatedCategory.id,
            _id: updatedCategory._id.toString(),
        };
        res.json({
            success: true,
            message: 'Category updated successfully',
            category: categoryResponse
        });
    }
    catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const categoriesCollection = db.collection('categories');
        // Find category by _id or id
        let category;
        if (ObjectId.isValid(id)) {
            category = await categoriesCollection.findOne({ _id: new ObjectId(id) });
        }
        else {
            category = await categoriesCollection.findOne({ id });
        }
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        // Check if category is being used by any menu items
        const menuItemsCollection = db.collection('menu_items');
        const itemsUsingCategory = await menuItemsCollection.countDocuments({ category: category.id });
        if (itemsUsingCategory > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete category. It is being used by ${itemsUsingCategory} menu item(s). Please remove or reassign those items first.`
            });
        }
        const result = await categoriesCollection.deleteOne({ _id: category._id });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        // Log activity
        await logAdminActivity(db, 'Category', 'Deleted', getAdminUsername(req), `Category deleted: ${category.name}`, 'success');
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Menu Items Management Endpoints - MOVED TO server/routes/menuItems.ts
// All menu item endpoints have been moved to the separate menuItems routes file
// Admin Overview Statistics Endpoint
router.get('/overview', async (req, res) => {
    try {
        const db = getDatabase();
        const ordersCollection = db.collection('orders');
        const menuItemsCollection = db.collection('menu_items');
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const last7DaysStart = new Date(now);
        last7DaysStart.setDate(now.getDate() - 6);
        last7DaysStart.setHours(0, 0, 0, 0);
        const last30DaysStart = new Date(now);
        last30DaysStart.setDate(now.getDate() - 29);
        last30DaysStart.setHours(0, 0, 0, 0);
        const previous7DaysStart = new Date(now);
        previous7DaysStart.setDate(now.getDate() - 13);
        previous7DaysStart.setHours(0, 0, 0, 0);
        const previous7DaysEnd = new Date(now);
        previous7DaysEnd.setDate(now.getDate() - 7);
        previous7DaysEnd.setHours(23, 59, 59, 999);
        // Get all completed and paid orders
        const allOrders = await ordersCollection
            .find({
            isPaid: true,
            status: 'completed'
        })
            .toArray();
        const ordersWithDates = allOrders.map((order) => {
            const orderData = order;
            return {
                ...orderData,
                createdAt: orderData.createdAt ? new Date(orderData.createdAt) : new Date(),
                completedAt: orderData.completedAt ? new Date(orderData.completedAt) : orderData.createdAt ? new Date(orderData.createdAt) : new Date(),
                total: orderData.total || 0,
                items: orderData.items || [],
                paymentMethod: orderData.paymentMethod,
                tableNumber: orderData.tableNumber,
            };
        });
        // Filter orders by date ranges
        const todayOrders = ordersWithDates.filter(o => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= todayStart && orderDate <= todayEnd;
        });
        const weekOrders = ordersWithDates.filter(o => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= weekStart && orderDate <= weekEnd;
        });
        const monthOrders = ordersWithDates.filter(o => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= monthStart && orderDate <= monthEnd;
        });
        const last7DaysOrders = ordersWithDates.filter(o => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= last7DaysStart && orderDate <= todayEnd;
        });
        const last30DaysOrders = ordersWithDates.filter(o => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= last30DaysStart && orderDate <= todayEnd;
        });
        const previous7DaysOrders = ordersWithDates.filter(o => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= previous7DaysStart && orderDate <= previous7DaysEnd;
        });
        // Calculate revenues
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const allTimeRevenue = ordersWithDates.reduce((sum, o) => sum + (o.total || 0), 0);
        const last7DaysRevenue = last7DaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const previous7DaysRevenue = previous7DaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        // Calculate trends
        const revenueTrend = previous7DaysRevenue > 0
            ? ((last7DaysRevenue - previous7DaysRevenue) / previous7DaysRevenue) * 100
            : 0;
        const ordersTrend = previous7DaysOrders.length > 0
            ? ((last7DaysOrders.length - previous7DaysOrders.length) / previous7DaysOrders.length) * 100
            : 0;
        // Top 3 items (last 7 days)
        const itemCounts = new Map();
        last7DaysOrders.forEach((order) => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((cartItem) => {
                    const cartItemData = cartItem;
                    const itemId = cartItemData.menuItem?.id || cartItemData.menuItem?._id || '';
                    if (!itemId)
                        return;
                    const existing = itemCounts.get(itemId);
                    const price = cartItemData.menuItem?.price || 0;
                    const quantity = cartItemData.quantity || 0;
                    if (existing) {
                        existing.quantity += quantity;
                        existing.revenue += price * quantity;
                    }
                    else {
                        itemCounts.set(itemId, {
                            item: cartItemData.menuItem,
                            quantity: quantity,
                            revenue: price * quantity,
                        });
                    }
                });
            }
        });
        const top3Items = Array.from(itemCounts.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 3);
        // Peak days (last 30 days)
        const dayCounts = new Map();
        last30DaysOrders.forEach((order) => {
            const orderDate = order.completedAt || order.createdAt;
            const dayNum = orderDate.getDay();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayKey = dayNames[dayNum];
            const existing = dayCounts.get(dayNum);
            if (existing) {
                existing.orders += 1;
                existing.revenue += order.total || 0;
            }
            else {
                dayCounts.set(dayNum, {
                    day: dayKey,
                    orders: 1,
                    revenue: order.total || 0,
                });
            }
        });
        const peakDays = Array.from(dayCounts.values())
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 3);
        // Peak hours (all time)
        const hourCounts = new Map();
        ordersWithDates.forEach((order) => {
            const orderDate = order.completedAt || order.createdAt;
            const hour = orderDate.getHours();
            const existing = hourCounts.get(hour);
            if (existing) {
                existing.orders += 1;
                existing.revenue += order.total || 0;
            }
            else {
                hourCounts.set(hour, {
                    hour,
                    orders: 1,
                    revenue: order.total || 0,
                });
            }
        });
        const peakHours = Array.from(hourCounts.values())
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 3);
        // Risky Items (Low/No Sales in Last 7 Days)
        const riskyItemsDays = 7;
        const riskyItemsStart = new Date(now);
        riskyItemsStart.setDate(now.getDate() - (riskyItemsDays - 1));
        riskyItemsStart.setHours(0, 0, 0, 0);
        const riskyItemsOrders = ordersWithDates.filter((o) => {
            const orderDate = o.completedAt || o.createdAt;
            return orderDate >= riskyItemsStart && orderDate <= todayEnd;
        });
        const allMenuItems = await menuItemsCollection.find({}).toArray();
        const menuItemsMap = new Map();
        allMenuItems.forEach((item) => {
            const itemData = item;
            const itemId = itemData.id || (itemData._id && typeof itemData._id === 'object' && 'toString' in itemData._id ? itemData._id.toString() : String(itemData._id)) || '';
            if (itemId && itemData.name && itemData.price !== undefined) {
                menuItemsMap.set(itemId, {
                    id: itemId,
                    name: itemData.name,
                    price: itemData.price,
                    image: itemData.image,
                });
            }
        });
        const itemSalesMap = new Map();
        // Initialize all items with zero sales
        allMenuItems.forEach((item) => {
            const itemData = item;
            const itemId = itemData.id || (itemData._id && typeof itemData._id === 'object' && 'toString' in itemData._id ? itemData._id.toString() : String(itemData._id)) || '';
            if (itemId) {
                itemSalesMap.set(itemId, { quantity: 0, lastSaleDate: null });
            }
        });
        // Calculate sales for each item in the last 7 days
        riskyItemsOrders.forEach((order) => {
            const orderDate = order.completedAt || order.createdAt;
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((cartItem) => {
                    const cartItemData = cartItem;
                    const menuItemId = cartItemData.menuItem?.id || cartItemData.menuItem?._id;
                    if (!menuItemId)
                        return;
                    const existing = itemSalesMap.get(menuItemId) || { quantity: 0, lastSaleDate: null };
                    itemSalesMap.set(menuItemId, {
                        quantity: existing.quantity + (cartItem.quantity || 0),
                        lastSaleDate: orderDate > (existing.lastSaleDate || new Date(0)) ? orderDate : existing.lastSaleDate,
                    });
                });
            }
        });
        // Find items with no sales or very low sales
        const riskyItems = Array.from(itemSalesMap.entries())
            .map(([id, data]) => {
            const menuItem = menuItemsMap.get(id);
            if (!menuItem)
                return null;
            const daysSinceLastSale = data.lastSaleDate
                ? Math.floor((now.getTime() - data.lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
                : riskyItemsDays;
            return {
                id,
                name: menuItem.name,
                quantity: data.quantity,
                daysSinceLastSale,
                image: menuItem.image,
                price: menuItem.price,
            };
        })
            .filter((item) => item !== null)
            .filter((item) => item.quantity === 0 || item.quantity < 3)
            .sort((a, b) => {
            if (a.quantity === 0 && b.quantity > 0)
                return -1;
            if (a.quantity > 0 && b.quantity === 0)
                return 1;
            if (a.quantity === 0 && b.quantity === 0)
                return b.daysSinceLastSale - a.daysSinceLastSale;
            return b.daysSinceLastSale - a.daysSinceLastSale;
        });
        // Revenue trend data (last 7 days)
        const dailyRevenue = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const dayOrders = last7DaysOrders.filter((o) => {
                const orderDate = o.completedAt || o.createdAt;
                return orderDate >= dayStart && orderDate <= dayEnd;
            });
            const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dailyRevenue.push({
                date: dayNames[date.getDay()],
                revenue,
                orders: dayOrders.length,
            });
        }
        // Payment methods
        const cardPayments = ordersWithDates
            .filter((o) => o.paymentMethod === 'card')
            .reduce((sum, o) => sum + (o.total || 0), 0);
        const cashPayments = ordersWithDates
            .filter((o) => o.paymentMethod === 'cash')
            .reduce((sum, o) => sum + (o.total || 0), 0);
        // Order types
        const tableOrders = ordersWithDates.filter((o) => o.tableNumber).length;
        const takeawayOrders = ordersWithDates.filter((o) => !o.tableNumber).length;
        res.json({
            success: true,
            data: {
                today: {
                    revenue: todayRevenue,
                    orders: todayOrders.length,
                },
                week: {
                    revenue: weekRevenue,
                    orders: weekOrders.length,
                },
                month: {
                    revenue: monthRevenue,
                    orders: monthOrders.length,
                },
                allTime: {
                    revenue: allTimeRevenue,
                    orders: ordersWithDates.length,
                },
                trends: {
                    revenue: revenueTrend,
                    orders: ordersTrend,
                },
                top3Items,
                peakDays,
                peakHours,
                dailyRevenue,
                riskyItems,
                paymentMethods: {
                    card: cardPayments,
                    cash: cashPayments,
                },
                orderTypes: {
                    table: tableOrders,
                    takeaway: takeawayOrders,
                },
            },
        });
    }
    catch (error) {
        console.error('Get admin overview error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
export default router;
//# sourceMappingURL=admin.js.map