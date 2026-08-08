const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Reusable service to create notifications based on real application events.
 * 
 * @param {Object} data 
 * @param {string} data.type - Notification type (e.g., 'quiz_completed', 'achievement_earned')
 * @param {string} data.title - Title of the notification
 * @param {string} data.message - Detailed message
 * @param {string} [data.childId] - Optional. The child user ID associated with this event
 * @param {string} [data.relatedId] - Optional. The related entity ID (quiz ID, achievement ID, etc.)
 * @param {string} [data.link] - Optional. The URL to navigate to when clicked
 * @param {string} [data.recipientId] - Optional. Specific recipient (if not provided, defaults to all parents of the child)
 */
exports.createNotification = async ({ type, title, message, childId, relatedId, link, recipientId }) => {
    try {
        let parentIds = [];

        if (recipientId) {
            parentIds.push(recipientId);
        } else if (childId) {
            // Find parents connected to this child
            const parents = await User.find({ role: 'parent', children: childId }).select('_id');
            parentIds = parents.map(p => p._id);
            
            if (parentIds.length === 0) {
                // Backward compatibility if using StudentProfile
                const StudentProfile = require('../models/StudentProfile');
                const profile = await StudentProfile.findOne({ user: childId }).select('parents');
                if (profile && profile.parents) {
                    parentIds = profile.parents;
                }
            }
        }

        if (parentIds.length === 0) {
            console.log(`Notification not sent: No parents found for child ${childId}`);
            return;
        }

        // De-duplicate parent IDs
        parentIds = [...new Set(parentIds.map(id => id.toString()))];

        const notificationPromises = parentIds.map(async (parentId) => {
            // Check Parent's Notification Preferences
            const parentUser = await User.findById(parentId).select('notificationPreferences').lean();
            if (parentUser && parentUser.notificationPreferences) {
                const prefs = parentUser.notificationPreferences;
                
                // Map event types to preference keys
                if (type.includes('assignment') && prefs.assignments === false) return null;
                if (type.includes('quiz') && prefs.quizzes === false) return null;
                if (type.includes('achievement') && prefs.achievements === false) return null;
                if (type.includes('course') && prefs.courseUpdates === false) return null;
            }

            // Prevent duplicate notifications for the same event type and relatedId for this recipient
            if (relatedId) {
                const existing = await Notification.findOne({
                    recipientId: parentId,
                    type,
                    relatedId
                });
                
                if (existing) {
                    return null; // Skip duplicate
                }
            }

            return Notification.create({
                recipientId: parentId,
                type,
                title,
                message,
                childId: childId || null,
                relatedId: relatedId || null,
                link: link || null
            });
        });

        await Promise.all(notificationPromises);

    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
