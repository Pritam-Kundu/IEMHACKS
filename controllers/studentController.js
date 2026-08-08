const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProfile = require('../models/StudentProfile');
const Course = require('../models/Course');
const Badge = require('../models/Badge');

/**
 * Controller to handle Student Dashboard data fetching
 */
exports.getDashboard = async (req, res, next) => {
    try {
        const studentId = req.user._id;

        // 1. Fetch Enrolled Courses with Course details
        const enrollments = await Enrollment.find({ student: studentId, status: { $ne: 'dropped' } })
            .populate({
                path: 'course',
                populate: [
                    { path: 'teacher', select: 'name profilePicture' },
                    { path: 'subject', select: 'name' }
                ]
            })
            .lean();

        // 2. Fetch Progress (Lessons completed)
        const progressRecords = await Progress.find({ student: studentId })
            .populate({
                path: 'lesson',
                populate: { path: 'course', select: 'title' }
            })
            .sort({ lastAccessed: -1 })
            .lean();

        const lessonsCompleted = progressRecords.filter(p => p.status === 'completed').length;
        
        // 3. Quiz Performance
        const quizAttempts = await QuizAttempt.find({ student: studentId })
            .sort({ createdAt: -1 })
            .lean();
            
        let averageQuizScore = 0;
        if (quizAttempts.length > 0) {
            const totalScore = quizAttempts.reduce((acc, curr) => acc + curr.score, 0);
            averageQuizScore = Math.round(totalScore / quizAttempts.length);
        }

        // 4. Badges (from StudentProfile)
        const profile = await StudentProfile.findOne({ user: studentId })
            .populate({
                path: 'earnedBadges.badge'
            })
            .lean();
        
        const badges = profile ? profile.earnedBadges.map(eb => ({ ...eb.badge, earnedAt: eb.earnedAt })) : [];

        // 5. Recent Activity
        const activities = [];
        progressRecords.slice(0, 5).forEach(p => {
            if (p.status === 'completed') {
                activities.push({
                    type: 'lesson_completed',
                    description: `Completed lesson: ${p.lesson.title}`,
                    date: p.updatedAt
                });
            }
        });
        quizAttempts.slice(0, 5).forEach(q => {
            activities.push({
                type: 'quiz_completed',
                description: `Completed a quiz with score ${q.score}%`,
                date: q.createdAt
            });
        });
        
        // Sort activities by date descending
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 6. Continue Learning (most recent progress)
        let continueLearning = null;
        if (progressRecords.length > 0) {
            const latestProgress = progressRecords[0];
            continueLearning = {
                lessonTitle: latestProgress.lesson.title,
                courseTitle: latestProgress.lesson.course ? latestProgress.lesson.course.title : 'Course',
                lastAccessed: latestProgress.lastAccessed,
                progressPercentage: latestProgress.status === 'completed' ? 100 : 50
            };
        }

        // Render dashboard View
        res.render('student/dashboard', {
            title: 'Student Dashboard | EduSmart',
            coursesEnrolled: enrollments.length,
            lessonsCompleted,
            averageQuizScore,
            currentStreak: 5, // Static for now
            enrollments,
            continueLearning,
            activities: activities.slice(0, 5),
            badges: badges.slice(0, 4),
            quizAttemptsCount: quizAttempts.length
        });
    } catch (error) {
        next(error);
    }
};
