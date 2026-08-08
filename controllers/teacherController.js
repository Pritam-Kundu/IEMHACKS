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
