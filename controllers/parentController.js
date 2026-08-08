const StudentProfile = require('../models/StudentProfile');
const ParentProfile = require('../models/ParentProfile');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const QuizAttempt = require('../models/QuizAttempt');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');

/**
 * Controller to handle Parent Dashboard data fetching
 */
exports.getDashboard = async (req, res, next) => {
    try {
        const parentId = req.user._id;

        // 1. Fetch children connected to this parent securely
        const studentProfiles = await StudentProfile.find({ parents: parentId })
            .populate('user', 'name profilePicture')
            .populate('earnedBadges.badge')
            .lean();

        if (!studentProfiles || studentProfiles.length === 0) {
            // No children linked
            return res.render('parent/dashboard', {
                title: 'Parent Dashboard | EduSmart',
                children: [],
                selectedChild: null
            });
        }

        // Map children for the selector
        const children = studentProfiles.map(sp => ({
            id: sp.user._id.toString(),
            name: sp.user.name,
            profilePicture: sp.user.profilePicture,
            badges: sp.earnedBadges || []
        }));

        // 2. Determine selected child (Verify parent-child relationship implicitly)
        let selectedChildId = req.query.childId;
        let selectedChild = children.find(c => c.id === selectedChildId);

        // If childId is manipulated or not provided, fallback to the first verified child
        if (!selectedChild) {
            selectedChild = children[0];
        }

        const studentUserId = selectedChild.id;

        // 3. Fetch Enrollments & Courses for the selected child
        const enrollments = await Enrollment.find({ student: studentUserId })
            .populate({
                path: 'course',
                populate: [
                    { path: 'teacher', select: 'name' },
                    { path: 'subject', select: 'name' }
                ]
            })
            .lean();

        // 4. Fetch Progress Records
        const progressRecords = await Progress.find({ student: studentUserId }).lean();
        const completedLessonsCount = progressRecords.filter(p => p.status === 'completed').length;

        // We use progressRecords.length as a naive proxy for total unlocked lessons
        const overallProgress = progressRecords.length === 0
            ? 0
            : Math.round((completedLessonsCount / progressRecords.length) * 100);

        // Enhance enrollments with localized progress data
        const courses = enrollments.map(e => {
            if (!e.course) return null; // Safe check
            const courseProgressRecords = progressRecords.filter(p => p.course && p.course.toString() === e.course._id.toString());
            const courseCompleted = courseProgressRecords.filter(p => p.status === 'completed').length;
            const courseProgressPercent = courseProgressRecords.length === 0
                ? 0
                : Math.round((courseCompleted / courseProgressRecords.length) * 100);

            return {
                ...e.course,
                progressPercent: courseProgressPercent,
                completedLessons: courseCompleted
            };
        }).filter(Boolean);

        // 5. Fetch Quiz Attempts
        const quizAttempts = await QuizAttempt.find({ student: studentUserId })
            .populate('quiz', 'title')
            .sort({ createdAt: -1 })
            .lean()
            .catch(() => []);

        let averageQuizScore = 0;
        if (quizAttempts.length > 0) {
            const totalScore = quizAttempts.reduce((acc, curr) => acc + curr.score, 0);
            averageQuizScore = Math.round(totalScore / quizAttempts.length);
        }

        // 6. Fetch Submissions & Assignments
        const submissions = await Submission.find({ student: studentUserId })
            .populate({
                path: 'assignment',
                populate: { path: 'course', select: 'title' }
            })
            .sort({ submittedAt: -1 })
            .lean()
            .catch(() => []);

        // 7. Recent Activity feed (Aggregate quizzes and submissions)
        const activities = [];
        quizAttempts.slice(0, 5).forEach(qa => {
            activities.push({
                type: 'quiz',
                title: qa.quiz?.title || 'Quiz',
                description: `Scored ${qa.score}%`,
                date: qa.createdAt
            });
        });
        submissions.slice(0, 5).forEach(sub => {
            activities.push({
                type: 'assignment',
                title: sub.assignment?.title || 'Assignment',
                description: `Status: ${sub.status}`,
                date: sub.submittedAt || sub.createdAt
            });
        });
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 8. Render Dashboard
        res.render('parent/dashboard', {
            title: 'Parent Dashboard | EduSmart',
            children,
            selectedChild,
            courses,
            overallProgress,
            completedLessonsCount,
            averageQuizScore,
            quizAttempts: quizAttempts.slice(0, 4),
            submissions: submissions.slice(0, 4),
            activities: activities.slice(0, 5),
            learningStreak: 3 // Static placeholder for streak as per instructions
        });

    } catch (error) {
        console.error('Parent Dashboard Error:', error);
        next(error);
    }
};

/**
 * Controller to link a student account by email
 */
exports.linkStudentAccount = async (req, res) => {
    try {
        const parentId = req.user._id;

        // Parent role check
        if (req.user.role !== 'parent') {
            return res.status(403).json({ success: false, message: 'Only parents can link student accounts.' });
        }

        let { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please enter your child\'s email address.' });
        }

        email = email.trim().toLowerCase();

        // Find User
        const studentUser = await User.findOne({ email });
        if (!studentUser) {
            return res.status(404).json({ success: false, message: 'No EduSmart student account was found with this email address.' });
        }

        if (studentUser.role !== 'student' && studentUser.role !== 'child') {
            return res.status(403).json({ success: false, message: 'This email is not registered as a student account.' });
        }

        // Find parent User
        const parentUser = await User.findById(parentId);
        if (!parentUser) {
            return res.status(404).json({ success: false, message: 'Parent account not found.' });
        }

        // Check if already linked directly in User models
        if (parentUser.children && parentUser.children.includes(studentUser._id) || 
            studentUser.parentId && studentUser.parentId.toString() === parentId.toString()) {
            return res.status(400).json({ success: false, message: 'This student is already linked to your account.' });
        }

        // Also check if child is already linked to a different parent
        if (studentUser.parentId && studentUser.parentId.toString() !== parentId.toString()) {
            return res.status(400).json({ success: false, message: 'This student is already linked to another parent.' });
        }

        // Create relationships natively on User model
        if (!parentUser.children) parentUser.children = [];
        parentUser.children.push(studentUser._id);
        studentUser.parentId = parentId;

        // Also maintain backwards compatibility with existing StudentProfile/ParentProfile
        const studentProfile = await StudentProfile.findOne({ user: studentUser._id });
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        
        if (parentProfile && !parentProfile.children.includes(studentUser._id)) {
            parentProfile.children.push(studentUser._id);
            await parentProfile.save();
        }
        if (studentProfile && !studentProfile.parents.includes(parentId)) {
            studentProfile.parents.push(parentId);
            await studentProfile.save();
        }

        await Promise.all([
            parentUser.save(),
            studentUser.save()
        ]);

        return res.status(200).json({ success: true, message: 'Child added successfully.' });
    } catch (error) {
        console.error('Link Student Error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred while linking the account.' });
    }
};
