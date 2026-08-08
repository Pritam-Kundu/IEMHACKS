const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');

/**
 * Controller to handle Teacher Dashboard data fetching
 */
exports.getDashboard = async (req, res, next) => {
    try {
        const teacherId = req.user._id;

        // 1. Fetch Courses owned by Teacher
        const courses = await Course.find({ teacher: teacherId })
            .populate('subject', 'name')
            .lean();
        
        const courseIds = courses.map(c => c._id);

        // 2. Fetch Enrollments for these courses to count total unique students
        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: { $ne: 'dropped' } })
            .populate('student', 'name profilePicture')
            .populate('course', 'title')
            .lean();

        // Calculate unique students
        const uniqueStudentIds = [...new Set(enrollments.map(e => e.student._id.toString()))];
        const totalStudents = uniqueStudentIds.length;

        // 3. Count lessons and quizzes per course (Safely checking schema references)
        const lessons = await Lesson.find({ course: { $in: courseIds } }).lean().catch(() => []);
        const quizzes = await Quiz.find({ course: { $in: courseIds } }).lean().catch(() => []);

        const coursesWithStats = courses.map(course => {
            const courseLessons = lessons.filter(l => l.course && l.course.toString() === course._id.toString()).length;
            const courseQuizzes = quizzes.filter(q => q.course && q.course.toString() === course._id.toString()).length;
            const courseStudents = enrollments.filter(e => e.course && e.course._id.toString() === course._id.toString()).length;
            
            return {
                ...course,
                lessonsCount: courseLessons,
                quizzesCount: courseQuizzes,
                studentsCount: courseStudents
            };
        });

        // 4. Quiz Attempts for Average Score
        const quizIds = quizzes.map(q => q._id);
        const quizAttempts = await QuizAttempt.find({ quiz: { $in: quizIds } }).populate('student', 'name').lean().catch(() => []);
        let averageStudentScore = 0;
        if (quizAttempts.length > 0) {
            const totalScore = quizAttempts.reduce((acc, curr) => acc + curr.score, 0);
            averageStudentScore = Math.round(totalScore / quizAttempts.length);
        }

        // 5. Assignments & Submissions
        const assignments = await Assignment.find({ course: { $in: courseIds } }).populate('course', 'title').lean().catch(() => []);
        const assignmentIds = assignments.map(a => a._id);
        
        const submissions = await Submission.find({ assignment: { $in: assignmentIds } }).lean().catch(() => []);
        const pendingSubmissions = submissions.filter(s => s.status === 'submitted').length;

        // Enhance assignments with submission counts and statuses
        const assignmentsWithStats = assignments.map(assignment => {
            const assignmentSubs = submissions.filter(s => s.assignment && s.assignment.toString() === assignment._id.toString());
            const submittedCount = assignmentSubs.length;
            const pendingCount = assignmentSubs.filter(s => s.status === 'submitted').length;
            
            // Determine status based on due date
            let status = 'Published';
            const now = new Date();
            if (new Date(assignment.dueDate) < now) {
                status = 'Closed';
            } else if (new Date(assignment.dueDate) - now < 7 * 24 * 60 * 60 * 1000) { 
                status = 'Due Soon';
            }
            
            return {
                ...assignment,
                submissionCount: submittedCount,
                pendingCount: pendingCount,
                status
            };
        });

        assignmentsWithStats.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // 6. Students Needing Attention (e.g. recent quiz score < 50)
        const weakAttempts = quizAttempts.filter(qa => qa.score < 50);
        const weakStudentIds = [...new Set(weakAttempts.map(qa => qa.student && qa.student._id.toString()))].filter(Boolean);
        
        const studentsNeedingAttentionMap = new Map();
        enrollments.forEach(e => {
            const stuId = e.student._id.toString();
            if (weakStudentIds.includes(stuId) && !studentsNeedingAttentionMap.has(stuId)) {
                studentsNeedingAttentionMap.set(stuId, {
                    name: e.student.name,
                    profilePicture: e.student.profilePicture,
                    courseTitle: e.course.title,
                    issue: 'Low Quiz Score'
                });
            }
        });
        const uniqueStudentsNeedingAttention = Array.from(studentsNeedingAttentionMap.values());

        // 7. Recent Activity (Mix of submissions and quizzes)
        const activities = [];
        submissions.slice(0, 5).forEach(s => {
            activities.push({
                type: 'assignment_submitted',
                description: 'A student submitted an assignment',
                date: s.submittedAt || s.createdAt
            });
        });
        quizAttempts.slice(0, 5).forEach(q => {
            activities.push({
                type: 'quiz_completed',
                description: `A student completed a quiz with ${q.score}%`,
                date: q.createdAt
            });
        });
        
        // Sort activities by date descending
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Render dashboard View
        res.render('teacher/dashboard', {
            title: 'Teacher Dashboard | EduSmart',
            totalCourses: courses.length,
            totalStudents,
            averageStudentScore,
            pendingSubmissions,
            courses: coursesWithStats,
            enrollments: enrollments.slice(0, 5), // Show recent 5 in the overview
            assignments: assignmentsWithStats.slice(0, 4), 
            studentsNeedingAttention: uniqueStudentsNeedingAttention.slice(0, 4),
            activities: activities.slice(0, 5),
            totalQuizzes: quizzes.length
        });
    } catch (error) {
        console.error('Teacher Dashboard Error:', error);
        next(error);
    }
};

/**
 * Controller to handle fetching My Courses
 */
exports.getCourses = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId })
            .populate('subject', 'name')
            .lean();
            
        // Calculate basic stats for each course
        const courseIds = courses.map(c => c._id);
        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: { $ne: 'dropped' } }).lean();
        const lessons = await Lesson.find({ course: { $in: courseIds } }).lean();
        
        const coursesWithStats = courses.map(course => {
            return {
                ...course,
                studentsCount: enrollments.filter(e => e.course.toString() === course._id.toString()).length,
                lessonsCount: lessons.filter(l => l.course.toString() === course._id.toString()).length,
            };
        });

        res.render('teacher/courses', {
            title: 'My Courses | Teacher Dashboard',
            user: req.user,
            courses: coursesWithStats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to render the Create Course page
 */
exports.getCreateCourse = async (req, res, next) => {
    try {
        const subjects = await Subject.find().lean();
        res.render('teacher/create-course', {
            title: 'Create Course | EduSmart',
            user: req.user,
            subjects
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Students
 */
exports.getStudents = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);
        
        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: { $ne: 'dropped' } })
            .populate('student', 'name email profilePicture')
            .populate('course', 'title')
            .lean();

        // Group by student
        const studentMap = new Map();
        enrollments.forEach(e => {
            const studentId = e.student._id.toString();
            if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                    student: e.student,
                    courses: [],
                    averageProgress: 0,
                    enrollmentDate: e.enrolledAt || e.createdAt
                });
            }
            const studentData = studentMap.get(studentId);
            studentData.courses.push({
                courseTitle: e.course.title,
                progress: e.progress || 0
            });
        });
        
        const studentsList = Array.from(studentMap.values()).map(s => {
            const avg = s.courses.reduce((acc, curr) => acc + curr.progress, 0) / (s.courses.length || 1);
            s.averageProgress = Math.round(avg);
            return s;
        });

        res.render('teacher/students', {
            title: 'Students | Teacher Dashboard',
            user: req.user,
            students: studentsList
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Lessons
 */
exports.getLessons = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);
        
        const lessons = await Lesson.find({ course: { $in: courseIds } })
            .populate('course', 'title')
            .sort({ 'course': 1, 'order': 1 })
            .lean();

        res.render('teacher/lessons', {
            title: 'Lessons | Teacher Dashboard',
            user: req.user,
            lessons
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Quizzes
 */
exports.getQuizzes = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);
        
        const quizzes = await Quiz.find({ course: { $in: courseIds } })
            .populate('course', 'title')
            .lean();
            
        // Fetch attempts for stats
        const quizIds = quizzes.map(q => q._id);
        const quizAttempts = await QuizAttempt.find({ quiz: { $in: quizIds } }).lean();
        
        const quizzesWithStats = quizzes.map(quiz => {
            const attempts = quizAttempts.filter(qa => qa.quiz.toString() === quiz._id.toString());
            let avgScore = 0;
            if (attempts.length > 0) {
                avgScore = Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length);
            }
            return {
                ...quiz,
                attemptsCount: attempts.length,
                averageScore: avgScore
            };
        });

        res.render('teacher/quizzes', {
            title: 'Quizzes | Teacher Dashboard',
            user: req.user,
            quizzes: quizzesWithStats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Assignments
 */
exports.getAssignments = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);
        
        const assignments = await Assignment.find({ course: { $in: courseIds } })
            .populate('course', 'title')
            .sort({ dueDate: 1 })
            .lean();
            
        const assignmentIds = assignments.map(a => a._id);
        const submissions = await Submission.find({ assignment: { $in: assignmentIds } }).lean();
        
        const assignmentsWithStats = assignments.map(assignment => {
            const assignmentSubs = submissions.filter(s => s.assignment.toString() === assignment._id.toString());
            return {
                ...assignment,
                submissionCount: assignmentSubs.length,
                pendingGradingCount: assignmentSubs.filter(s => s.status === 'submitted').length,
                status: new Date(assignment.dueDate) < new Date() ? 'Closed' : 'Active'
            };
        });

        res.render('teacher/assignments', {
            title: 'Assignments | Teacher Dashboard',
            user: req.user,
            assignments: assignmentsWithStats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Analytics
 */
exports.getAnalytics = async (req, res, next) => {
    try {
        res.render('teacher/analytics', {
            title: 'Analytics | Teacher Dashboard',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Reports
 */
exports.getReports = async (req, res, next) => {
    try {
        res.render('teacher/reports', {
            title: 'Reports | Teacher Dashboard',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching Settings
 */
exports.getSettings = async (req, res, next) => {
    try {
        res.render('teacher/settings', {
            title: 'Settings | Teacher Dashboard',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle create pages that are under construction
 */
exports.getUnderConstruction = (req, res) => {
    // Re-use the reports template as a quick under construction placeholder
    res.render('teacher/reports', {
        title: 'Coming Soon | Teacher Dashboard',
        user: req.user
    });
};

/**
 * Controller to handle Course Creation API
 */
exports.createCourse = async (req, res, next) => {
    try {
        const { title, description, subject, level, duration, thumbnail, status } = req.body;
        
        // Basic validation
        if (!title || !description || !subject) {
            return res.status(400).json({ success: false, message: 'Title, description, and category are required.' });
        }

        const newCourse = await Course.create({
            title: title.trim(),
            description: description.trim(),
            subject,
            teacher: req.user._id, // Securely injected from authentication middleware
            level: level || 'beginner',
            duration: duration ? duration.trim() : undefined,
            thumbnail: thumbnail || '/images/default-course.png',
            isPublished: status === 'published'
        });

        res.status(201).json({ success: true, message: 'Course created successfully.', course: newCourse });
    } catch (error) {
        console.error('Create Course Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while creating the course.' });
    }
};
