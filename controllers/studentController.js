const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProfile = require('../models/StudentProfile');
const Course = require('../models/Course');
const Badge = require('../models/Badge');
const Subject = require('../models/Subject');

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

exports.getCourses = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        
        // Enrolled courses
        const enrollments = await Enrollment.find({ student: studentId, status: { $ne: 'dropped' } })
            .populate({
                path: 'course',
                populate: [
                    { path: 'teacher', select: 'name profilePicture' },
                    { path: 'subject', select: 'name' }
                ]
            }).lean();

        res.render('student/courses', {
            title: 'My Courses | EduSmart',
            enrollments,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getExploreCourses = async (req, res, next) => {
    try {
        const studentId = req.user._id;

        // Enrolled courses (to filter them out)
        const enrollments = await Enrollment.find({ student: studentId, status: { $ne: 'dropped' } }).lean();

        // All courses (published)
        const allCourses = await Course.find({ isPublished: true })
            .populate('teacher', 'name profilePicture')
            .populate('subject', 'name')
            .lean();

        // Fetch all subjects for the filter dropdown
        const subjects = await Subject.find().sort({ name: 1 }).lean();

        // Filter out courses already enrolled in
        const enrolledCourseIds = enrollments.map(e => e.course.toString());
        const availableCourses = allCourses.filter(c => !enrolledCourseIds.includes(c._id.toString()));

        res.render('student/explore', {
            title: 'Explore Courses | EduSmart',
            availableCourses,
            subjects,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getQuizzes = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        
        const quizAttempts = await QuizAttempt.find({ student: studentId })
            .populate({
                path: 'quiz',
                populate: { path: 'course', select: 'title' }
            })
            .sort({ createdAt: -1 })
            .lean();
            
        res.render('student/quizzes', {
            title: 'Quizzes | EduSmart',
            quizAttempts,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getAITutor = async (req, res, next) => {
    try {
        res.render('student/ai-tutor', {
            title: 'AI Tutor | EduSmart',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getProgress = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const progressRecords = await Progress.find({ student: studentId })
            .populate({
                path: 'lesson',
                populate: { path: 'course', select: 'title' }
            })
            .sort({ lastAccessed: -1 })
            .lean();

        res.render('student/progress', {
            title: 'Progress | EduSmart',
            progressRecords,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getLeaderboard = async (req, res, next) => {
    try {
        res.render('student/leaderboard', {
            title: 'Leaderboard | EduSmart',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getBadges = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const profile = await StudentProfile.findOne({ user: studentId })
            .populate('earnedBadges.badge')
            .lean();
            
        const earnedBadges = profile && profile.earnedBadges ? profile.earnedBadges : [];
        const allBadges = await Badge.find({ role: 'student' }).lean();
        
        // Find which badges are locked
        const earnedBadgeIds = earnedBadges.map(eb => eb.badge._id.toString());
        const lockedBadges = allBadges.filter(b => !earnedBadgeIds.includes(b._id.toString()));

        res.render('student/badges', {
            title: 'Badges | EduSmart',
            earnedBadges,
            lockedBadges,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getSettings = async (req, res, next) => {
    try {
        res.render('student/settings', {
            title: 'Settings | EduSmart',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};
