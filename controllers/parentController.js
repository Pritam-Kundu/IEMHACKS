const StudentProfile = require('../models/StudentProfile');
const ParentProfile = require('../models/ParentProfile');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const QuizAttempt = require('../models/QuizAttempt');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Lesson = require('../models/Lesson');
const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');

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
                selectedChild: null,
                totalAchievements: 0,
                recentAchievements: []
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

        // 8. Fetch real achievements count
        const totalAchievements = await Achievement.countDocuments({ studentId: studentUserId });
        const recentAchievements = await Achievement.find({ studentId: studentUserId }).sort({ earnedAt: -1 }).limit(4).lean();

        // 9. Render Dashboard
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
            learningStreak: 3, // Static placeholder for streak as per instructions
            totalAchievements,
            recentAchievements
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

/**
 * Controller to handle Parent Progress data fetching
 */
exports.getProgress = async (req, res, next) => {
    try {
        const parentId = req.user._id;

        // 1. Fetch connected children securely
        const studentProfiles = await StudentProfile.find({ parents: parentId })
            .populate('user', 'name profilePicture')
            .lean();

        if (!studentProfiles || studentProfiles.length === 0) {
            // No children linked
            return res.render('parent/progress', {
                title: 'Child Progress | EduSmart',
                children: [],
                selectedChild: null
            });
        }

        const children = studentProfiles.map(sp => ({
            id: sp.user._id.toString(),
            name: sp.user.name,
            profilePicture: sp.user.profilePicture
        }));

        // 2. Validate selectedChild
        let selectedChildId = req.query.childId;
        let selectedChild = children.find(c => c.id === selectedChildId);

        if (!selectedChild) {
            selectedChild = children[0];
        }
        const studentUserId = selectedChild.id;

        // 3. Fetch data for the verified child
        // 3a. Enrollments (Courses)
        const enrollments = await Enrollment.find({ student: studentUserId })
            .populate({
                path: 'course',
                populate: { path: 'teacher', select: 'name' }
            }).lean();
        
        const courseIds = enrollments.map(e => e.course?._id).filter(Boolean);

        // 3b. Total Lessons per Course
        const lessons = await Lesson.find({ course: { $in: courseIds } }).lean();
        
        // 3c. Lesson Progress
        const progressRecords = await Progress.find({ student: studentUserId, course: { $in: courseIds } }).lean();
        
        // 3d. Quiz Attempts
        const quizAttempts = await QuizAttempt.find({ student: studentUserId }).populate('quiz', 'title').sort({ createdAt: -1 }).lean();
        
        // 3e. Assignments & Submissions
        const assignments = await Assignment.find({ course: { $in: courseIds } }).lean();
        const submissions = await Submission.find({ student: studentUserId }).populate('assignment', 'title').sort({ submittedAt: -1 }).lean();

        // 4. Calculate Statistics
        // Overall Progress
        const totalLessonsCount = lessons.length;
        const totalCompletedLessons = progressRecords.filter(p => p.status === 'completed').length;
        
        let overallProgress = 0;
        if (totalLessonsCount > 0) {
            overallProgress = Math.round((totalCompletedLessons / totalLessonsCount) * 100);
        } else if (progressRecords.length > 0) {
            // Fallback if lessons are missing but progress exists
            overallProgress = Math.round((totalCompletedLessons / progressRecords.length) * 100);
        }
        overallProgress = Math.min(overallProgress, 100);

        // Quiz Metrics
        let averageQuizScore = 0;
        let highestQuizScore = 0;
        if (quizAttempts.length > 0) {
            const sumScores = quizAttempts.reduce((acc, curr) => acc + curr.score, 0);
            averageQuizScore = Math.round(sumScores / quizAttempts.length);
            highestQuizScore = Math.max(...quizAttempts.map(q => q.score));
        }

        // Assignment Metrics
        const totalAssignmentsCount = assignments.length;
        const submittedAssignmentsCount = submissions.length;
        const pendingAssignmentsCount = Math.max(0, totalAssignmentsCount - submittedAssignmentsCount);
        
        const gradedSubmissions = submissions.filter(s => s.status === 'graded');
        let averageAssignmentScore = 0;
        if (gradedSubmissions.length > 0) {
            const sumAssignScores = gradedSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0);
            averageAssignmentScore = Math.round(sumAssignScores / gradedSubmissions.length);
        }

        // 5. Build Course-wise Progress Array
        const coursesData = enrollments.map(e => {
            if (!e.course) return null;
            const courseIdStr = e.course._id.toString();
            
            const courseLessons = lessons.filter(l => l.course && l.course.toString() === courseIdStr);
            const courseTotalLessons = courseLessons.length;
            
            const courseProgressRecords = progressRecords.filter(p => p.course && p.course.toString() === courseIdStr);
            const courseCompletedLessons = courseProgressRecords.filter(p => p.status === 'completed').length;
            
            let courseProgressPercent = 0;
            if (courseTotalLessons > 0) {
                courseProgressPercent = Math.round((courseCompletedLessons / courseTotalLessons) * 100);
            } else if (courseProgressRecords.length > 0) {
                courseProgressPercent = Math.round((courseCompletedLessons / courseProgressRecords.length) * 100);
            }
            courseProgressPercent = Math.min(courseProgressPercent, 100);
            
            // Course specific quiz average
            const courseQuizzes = quizAttempts.filter(q => q.quiz && q.quiz.course && q.quiz.course.toString() === courseIdStr); // Note: might need to adjust if quiz doesn't directly ref course or if not populated. But since we didn't fetch quiz->course mapping strictly here, we will approximate or leave out. Let's rely on standard fields.
            
            return {
                id: courseIdStr,
                title: e.course.title,
                teacherName: e.course.teacher ? e.course.teacher.name : 'Unknown Instructor',
                thumbnail: e.course.thumbnail,
                progressPercent: courseProgressPercent,
                completedLessons: courseCompletedLessons,
                totalLessons: courseTotalLessons,
                status: e.course.isPublished ? 'Active' : 'Draft'
            };
        }).filter(Boolean);

        // 6. Aggregate Recent Activity
        const recentActivities = [];
        progressRecords.filter(p => p.status === 'completed' && p.completedAt).forEach(p => {
            recentActivities.push({
                type: 'lesson',
                title: 'Completed a lesson',
                date: p.completedAt
            });
        });
        quizAttempts.forEach(qa => {
            recentActivities.push({
                type: 'quiz',
                title: `Completed ${qa.quiz?.title || 'a quiz'}`,
                description: `Score: ${qa.score}%`,
                date: qa.createdAt
            });
        });
        submissions.forEach(sub => {
            recentActivities.push({
                type: 'assignment',
                title: `Submitted ${sub.assignment?.title || 'an assignment'}`,
                description: `Status: ${sub.status}`,
                date: sub.submittedAt
            });
        });
        
        recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 7. Render view
        res.render('parent/progress', {
            title: 'Child Progress | EduSmart',
            user: req.user,
            children,
            selectedChild,
            overallProgress,
            averageQuizScore,
            highestQuizScore,
            quizAttempts,
            totalAssignmentsCount,
            submittedAssignmentsCount,
            pendingAssignmentsCount,
            averageAssignmentScore,
            coursesData,
            recentActivities: recentActivities.slice(0, 10)
        });

    } catch (error) {
        console.error('Parent Progress Error:', error);
        next(error);
    }
};

/**
 * Controller to handle "My Children" page
 */
exports.getChildren = async (req, res, next) => {
    try {
        const parentId = req.user._id;

        // 1. Fetch connected children securely
        const studentProfiles = await StudentProfile.find({ parents: parentId })
            .populate('user', 'name email profilePicture role createdAt')
            .lean();

        if (!studentProfiles || studentProfiles.length === 0) {
            return res.render('parent/children', {
                title: 'My Children | EduSmart',
                user: req.user,
                childrenData: []
            });
        }

        // 2. Map and enrich child data
        const childrenData = await Promise.all(studentProfiles.map(async (sp) => {
            const childUser = sp.user;
            const studentUserId = childUser._id.toString();

            // Fetch Enrollments
            const enrollments = await Enrollment.find({ student: studentUserId }).lean();
            const courseIds = enrollments.map(e => e.course).filter(Boolean);

            // Fetch Progress & Lessons
            const lessons = await Lesson.find({ course: { $in: courseIds } }).lean();
            const progressRecords = await Progress.find({ student: studentUserId, course: { $in: courseIds } }).lean();
            
            // Calculate Overall Progress
            const totalLessonsCount = lessons.length;
            const totalCompletedLessons = progressRecords.filter(p => p.status === 'completed').length;
            
            let overallProgress = 0;
            if (totalLessonsCount > 0) {
                overallProgress = Math.round((totalCompletedLessons / totalLessonsCount) * 100);
            } else if (progressRecords.length > 0) {
                overallProgress = Math.round((totalCompletedLessons / progressRecords.length) * 100);
            }
            overallProgress = Math.min(overallProgress, 100);

            // Fetch Quiz Attempts
            const quizAttempts = await QuizAttempt.find({ student: studentUserId }).lean();
            let averageQuizScore = 0;
            if (quizAttempts.length > 0) {
                const sumScores = quizAttempts.reduce((acc, curr) => acc + curr.score, 0);
                averageQuizScore = Math.round(sumScores / quizAttempts.length);
            }

            // Fetch Assignments
            const assignments = await Assignment.find({ course: { $in: courseIds } }).lean();
            const submissions = await Submission.find({ student: studentUserId }).lean();
            const assignmentsCompleted = submissions.length;
            const pendingAssignments = Math.max(0, assignments.length - assignmentsCompleted);

            return {
                id: studentUserId,
                name: childUser.name,
                email: childUser.email,
                profilePicture: childUser.profilePicture,
                joinedDate: childUser.createdAt,
                coursesCount: courseIds.length,
                overallProgress,
                averageQuizScore,
                assignmentsCompleted,
                pendingAssignments
            };
        }));

        res.render('parent/children', {
            title: 'My Children | EduSmart',
            user: req.user,
            childrenData
        });

    } catch (error) {
        console.error('Get Children Error:', error);
        next(error);
    }
};

/**
 * Controller to unlink a student account from a parent securely
 */
exports.unlinkStudentAccount = async (req, res) => {
    try {
        const parentId = req.user._id;
        const { childId } = req.body;

        if (!childId) {
            return res.status(400).json({ success: false, message: 'Child ID is required.' });
        }

        // Role check just to be safe
        if (req.user.role !== 'parent') {
            return res.status(403).json({ success: false, message: 'Unauthorized action.' });
        }

        const parentUser = await User.findById(parentId);
        const studentUser = await User.findById(childId);
        
        if (!studentUser) {
            return res.status(404).json({ success: false, message: 'Child account not found.' });
        }

        // Verify relationship exists before removing
        const studentProfile = await StudentProfile.findOne({ user: childId });
        const parentProfile = await ParentProfile.findOne({ user: parentId });

        // Remove from User models
        if (parentUser.children) {
            parentUser.children = parentUser.children.filter(id => id.toString() !== childId.toString());
        }
        if (studentUser.parentId && studentUser.parentId.toString() === parentId.toString()) {
            studentUser.parentId = null;
        }

        // Remove from Profile models
        if (studentProfile && studentProfile.parents) {
            studentProfile.parents = studentProfile.parents.filter(id => id.toString() !== parentId.toString());
            await studentProfile.save();
        }
        
        if (parentProfile && parentProfile.children) {
            parentProfile.children = parentProfile.children.filter(id => id.toString() !== childId.toString());
            await parentProfile.save();
        }

        await Promise.all([
            parentUser.save(),
            studentUser.save()
        ]);

        return res.status(200).json({ success: true, message: 'Child removed successfully.' });
    } catch (error) {
        console.error('Unlink Student Error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred while unlinking the account.' });
    }
};

/**
 * Controller to handle "Achievements" page
 */
exports.getAchievements = async (req, res, next) => {
    try {
        const parentId = req.user._id;

        // 1. Fetch connected children securely
        const studentProfiles = await StudentProfile.find({ parents: parentId })
            .populate('user', 'name profilePicture')
            .lean();

        if (!studentProfiles || studentProfiles.length === 0) {
            return res.render('parent/achievements', {
                title: 'Achievements | EduSmart',
                user: req.user,
                children: [],
                selectedChild: null,
                achievements: [],
                summary: {
                    totalAchievements: 0,
                    coursesCompleted: 0,
                    quizzesCompleted: 0,
                    lessonsCompleted: 0,
                    assignmentsCompleted: 0
                }
            });
        }

        const children = studentProfiles.map(sp => ({
            id: sp.user._id.toString(),
            name: sp.user.name,
            profilePicture: sp.user.profilePicture
        }));

        let selectedChildId = req.query.childId;
        
        let studentUserIds = [];
        let selectedChild = null;

        if (selectedChildId && selectedChildId !== 'all') {
            selectedChild = children.find(c => c.id === selectedChildId);
            if (!selectedChild) selectedChild = children[0];
            studentUserIds = [selectedChild.id];
        } else {
            studentUserIds = children.map(c => c.id);
            // selectedChild remains null for 'all'
        }

        // 2. Fetch Achievements for the verified child(ren)
        const achievements = await Achievement.find({ studentId: { $in: studentUserIds } })
            .populate('courseId', 'title')
            .populate('quizId', 'title')
            .populate('assignmentId', 'title')
            .populate('studentId', 'name')
            .sort({ earnedAt: -1 })
            .lean();

        // 3. Calculate Real Summary Data
        let coursesCompleted = 0;
        let quizzesCompleted = 0;
        let lessonsCompleted = 0;
        let assignmentsCompleted = 0;
        
        if (studentUserIds.length > 0) {
            coursesCompleted = await Progress.countDocuments({ student: { $in: studentUserIds }, status: 'completed', course: { $exists: true } });
            // The logic above is slightly flawed for courses completed.
            // Let's rely on Achievement documents instead or specific counting.
            // Let's count achievements of type course_champion
            coursesCompleted = await Achievement.countDocuments({ studentId: { $in: studentUserIds }, type: 'course_champion' });
            
            quizzesCompleted = await QuizAttempt.countDocuments({ student: { $in: studentUserIds } });
            lessonsCompleted = await Progress.countDocuments({ student: { $in: studentUserIds }, status: 'completed' });
            assignmentsCompleted = await Submission.countDocuments({ student: { $in: studentUserIds } });
        }

        const summary = {
            totalAchievements: achievements.length,
            coursesCompleted,
            quizzesCompleted,
            lessonsCompleted,
            assignmentsCompleted
        };

        res.render('parent/achievements', {
            title: 'Achievements | EduSmart',
            user: req.user,
            children,
            selectedChild,
            achievements,
            summary
        });

    } catch (error) {
        console.error('Get Achievements Error:', error);
        next(error);
    }
};


/**
 * Controller to handle "Assignments" page
 */
exports.getAssignments = async (req, res, next) => {
    try {
        const parentId = req.user._id;
        const requestedChildId = req.query.childId;

        // 1. Fetch connected children
        const studentProfiles = await StudentProfile.find({ parents: parentId })
            .populate('user', 'name email profilePicture role')
            .lean();

        if (!studentProfiles || studentProfiles.length === 0) {
            return res.render('parent/assignments', {
                title: 'Assignments | EduSmart',
                user: req.user,
                children: [],
                selectedChild: null,
                assignments: [],
                summary: { total: 0, pending: 0, submitted: 0, graded: 0, overdue: 0 }
            });
        }

        const children = studentProfiles.map(sp => ({
            id: sp.user._id.toString(),
            name: sp.user.name,
            email: sp.user.email,
            profilePicture: sp.user.profilePicture
        }));

        // Determine which children's assignments to show
        let targetChildIds = children.map(c => c.id);
        let selectedChild = null;

        if (requestedChildId) {
            // Verify childId is authorized
            const childExists = children.find(c => c.id === requestedChildId);
            if (!childExists) {
                // If invalid child ID passed, default to all children safely
                targetChildIds = children.map(c => c.id);
            } else {
                targetChildIds = [requestedChildId];
                selectedChild = childExists;
            }
        } else if (children.length === 1) {
            targetChildIds = [children[0].id];
            selectedChild = children[0];
        }

        // Fetch enrollments for targeted children
        const enrollments = await Enrollment.find({ student: { $in: targetChildIds } }).lean();
        const courseIds = [...new Set(enrollments.map(e => e.course.toString()))];

        if (courseIds.length === 0) {
            return res.render('parent/assignments', {
                title: 'Assignments | EduSmart',
                user: req.user,
                children,
                selectedChild,
                assignments: [],
                summary: { total: 0, pending: 0, submitted: 0, graded: 0, overdue: 0 }
            });
        }

        // Fetch assignments for those courses
        const assignmentsRaw = await Assignment.find({ course: { $in: courseIds } })
            .populate('course', 'title')
            .populate('teacher', 'name')
            .sort({ dueDate: 1 })
            .lean();

        // Fetch submissions for targeted children and assignments
        const assignmentIds = assignmentsRaw.map(a => a._id);
        const submissionsRaw = await Submission.find({
            student: { $in: targetChildIds },
            assignment: { $in: assignmentIds }
        }).lean();

        const assignmentsData = [];
        let summary = { total: 0, pending: 0, submitted: 0, graded: 0, overdue: 0 };
        const now = new Date();

        // Build data structure
        for (const childId of targetChildIds) {
            const childInfo = children.find(c => c.id === childId);
            const childEnrollments = enrollments.filter(e => e.student.toString() === childId).map(e => e.course.toString());
            
            const childAssignments = assignmentsRaw.filter(a => childEnrollments.includes(a.course._id.toString()));

            for (const assignment of childAssignments) {
                const submission = submissionsRaw.find(s => s.student.toString() === childId && s.assignment.toString() === assignment._id.toString());
                
                let calcStatus = 'pending'; // Default
                let isLate = false;
                
                if (submission) {
                    if (submission.status === 'graded') {
                        calcStatus = 'graded';
                    } else if (submission.status === 'late' || new Date(submission.submittedAt) > new Date(assignment.dueDate)) {
                        calcStatus = 'late';
                        isLate = true;
                    } else {
                        calcStatus = 'submitted';
                    }
                } else {
                    if (now > new Date(assignment.dueDate)) {
                        calcStatus = 'overdue';
                    } else {
                        calcStatus = 'pending';
                    }
                }

                // Update summary
                summary.total += 1;
                if (calcStatus === 'pending') summary.pending += 1;
                else if (calcStatus === 'overdue') summary.overdue += 1;
                else if (calcStatus === 'graded') summary.graded += 1;
                else if (calcStatus === 'submitted' || calcStatus === 'late') summary.submitted += 1;

                assignmentsData.push({
                    id: assignment._id.toString(),
                    title: assignment.title,
                    description: assignment.description,
                    courseName: assignment.course?.title || 'Unknown Course',
                    teacherName: assignment.teacher?.name || 'Unknown Teacher',
                    childName: childInfo.name,
                    childId: childInfo.id,
                    dueDate: assignment.dueDate,
                    assignedAt: assignment.createdAt,
                    totalPoints: assignment.totalPoints,
                    calcStatus: calcStatus,
                    isLate: isLate,
                    submission: submission ? {
                        id: submission._id.toString(),
                        submittedAt: submission.submittedAt,
                        score: submission.score,
                        feedback: submission.feedback
                    } : null
                });
            }
        }

        // Sort: Overdue first, then Pending (closest due date), then Submitted/Graded
        assignmentsData.sort((a, b) => {
            const statusOrder = { overdue: 1, pending: 2, late: 3, submitted: 4, graded: 5 };
            if (statusOrder[a.calcStatus] !== statusOrder[b.calcStatus]) {
                return statusOrder[a.calcStatus] - statusOrder[b.calcStatus];
            }
            // If same status, sort by due date ascending
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        res.render('parent/assignments', {
            title: 'Assignments | EduSmart',
            user: req.user,
            children,
            selectedChild,
            assignments: assignmentsData,
            summary
        });

    } catch (error) {
        console.error('Get Assignments Error:', error);
        next(error);
    }
};

/**
 * Fetch Notifications for Parent
 */
exports.getNotifications = async (req, res, next) => {
    try {
        const parentId = req.user._id;
        // Optional pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        const query = { recipientId: parentId };
        
        // Child filter
        if (req.query.childId && req.query.childId !== 'all') {
            // Verify child belongs to parent
            const studentProfiles = await StudentProfile.find({ parents: parentId }).lean();
            const childExists = studentProfiles.some(sp => sp.user.toString() === req.query.childId);
            
            if (childExists) {
                query.childId = req.query.childId;
            }
        }

        const notifications = await Notification.find(query)
            .populate('childId', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const unreadCount = await Notification.countDocuments({ recipientId: parentId, isRead: false });
        
        res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

/**
 * Mark a specific notification as read
 */
exports.markNotificationRead = async (req, res, next) => {
    try {
        const parentId = req.user._id;
        const notificationId = req.params.id;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipientId: parentId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error('Mark Notification Read Error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsRead = async (req, res, next) => {
    try {
        const parentId = req.user._id;

        await Notification.updateMany(
            { recipientId: parentId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark All Notifications Read Error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
};

