const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const parentController = require('../controllers/parentController');

// Dashboard Route
router.get('/dashboard', requireAuth, requireRole('parent'), parentController.getDashboard);

// Progress Route
router.get('/progress', requireAuth, requireRole('parent'), parentController.getProgress);

// Children List Route
router.get('/children', requireAuth, requireRole('parent'), parentController.getChildren);

// Assignments Route
router.get('/assignments', requireAuth, requireRole('parent'), parentController.getAssignments);

// POST /api/children/link - Add a child to parent's profile
router.post('/api/children/link', requireAuth, requireRole('parent'), parentController.linkStudentAccount);

// POST /api/children/unlink - Remove a child from parent's profile
router.post('/api/children/unlink', requireAuth, requireRole('parent'), parentController.unlinkStudentAccount);

// Achievements Route
router.get('/achievements', requireAuth, requireRole('parent'), parentController.getAchievements);

// Notifications Routes
router.get('/api/notifications', requireAuth, requireRole('parent'), parentController.getNotifications);
router.patch('/api/notifications/read-all', requireAuth, requireRole('parent'), parentController.markAllNotificationsRead);
router.patch('/api/notifications/:id/read', requireAuth, requireRole('parent'), parentController.markNotificationRead);

// Settings Routes
router.get('/settings', requireAuth, requireRole('parent'), parentController.getSettingsPage);
router.get('/api/settings', requireAuth, requireRole('parent'), parentController.getSettingsData);
router.put('/api/settings/profile', requireAuth, requireRole('parent'), parentController.updateProfile);
router.put('/api/settings/password', requireAuth, requireRole('parent'), parentController.updatePassword);
router.put('/api/settings/notifications', requireAuth, requireRole('parent'), parentController.updateNotifications);

module.exports = router;
