const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const Question = require('../models/Question');

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
        const { search, course: filterCourseId } = req.query;

        let courseQuery = { teacher: teacherId };
        if (filterCourseId) {
            courseQuery._id = filterCourseId;
        }

        const courses = await Course.find(courseQuery).lean();
        const courseIds = courses.map(c => c._id);
        
        // Also fetch all teacher's courses just for the filter dropdown
        const allTeacherCourses = await Course.find({ teacher: teacherId }).lean();
        
        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: { $ne: 'dropped' } })
            .populate('student', 'name email profilePicture')
            .populate('course', 'title')
            .lean();

        // Group by student
        const studentMap = new Map();
        enrollments.forEach(e => {
            const studentId = e.student._id.toString();
            
            // Apply search filter on student name or email if search term exists
            if (search) {
                const searchLower = search.toLowerCase();
                const nameMatch = e.student.name && e.student.name.toLowerCase().includes(searchLower);
                const emailMatch = e.student.email && e.student.email.toLowerCase().includes(searchLower);
                if (!nameMatch && !emailMatch) {
                    return; // Skip this enrollment if it doesn't match the search
                }
            }

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
            students: studentsList,
            courses: allTeacherCourses,
            searchQuery: search || '',
            filterCourseId: filterCourseId || ''
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle fetching specific Student Details
 */
exports.getStudentDetails = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const studentId = req.params.id;

        const student = await User.findById(studentId).select('-password').lean();
        if (!student) {
            return res.status(404).render('error', { message: 'Student not found' });
        }

        // Fetch courses owned by this teacher
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);

        // Fetch enrollments for this student in this teacher's courses
        const enrollments = await Enrollment.find({ 
            student: studentId, 
            course: { $in: courseIds },
            status: { $ne: 'dropped' }
        })
        .populate('course', 'title subject thumbnail')
        .lean();

        if (enrollments.length === 0) {
            return res.status(403).render('error', { message: 'Unauthorized: Student is not enrolled in any of your courses.' });
        }

        const enrolledCourseIds = enrollments.map(e => e.course._id);

        // Fetch quizzes for these courses
        const quizzes = await Quiz.find({ course: { $in: enrolledCourseIds } }).lean();
        const quizIds = quizzes.map(q => q._id);

        // Fetch quiz attempts for this student on these quizzes
        const quizAttempts = await QuizAttempt.find({
            student: studentId,
            quiz: { $in: quizIds }
        })
        .populate({ path: 'quiz', select: 'title course', populate: { path: 'course', select: 'title' } })
        .sort({ completedAt: -1 })
        .lean();

        // Fetch assignments for these courses
        const assignments = await Assignment.find({ course: { $in: enrolledCourseIds } }).lean();
        const assignmentIds = assignments.map(a => a._id);

        // Fetch submissions for this student on these assignments
        const submissions = await Submission.find({
            student: studentId,
            assignment: { $in: assignmentIds }
        })
        .populate({ path: 'assignment', select: 'title course', populate: { path: 'course', select: 'title' } })
        .sort({ submittedAt: -1 })
        .lean();

        // Combine recent activity
        let activities = [];
        quizAttempts.forEach(qa => {
            activities.push({
                type: 'quiz',
                title: qa.quiz.title,
                courseTitle: qa.quiz.course.title,
                score: qa.score,
                date: qa.completedAt || qa.createdAt
            });
        });

        submissions.forEach(sub => {
            activities.push({
                type: 'assignment',
                title: sub.assignment.title,
                courseTitle: sub.assignment.course.title,
                status: sub.status,
                grade: sub.grade,
                date: sub.submittedAt || sub.createdAt
            });
        });

        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate average progress
        const avgProgress = Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / (enrollments.length || 1));

        res.render('teacher/student-details', {
            title: `${student.name} - Student Details | Teacher Dashboard`,
            user: req.user,
            student,
            enrollments,
            quizAttempts,
            submissions,
            activities: activities.slice(0, 10),
            avgProgress
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
 * Controller to render the Create Lesson page
 */
exports.getCreateLesson = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        res.render('teacher/create-lesson', {
            title: 'Create Lesson | EduSmart',
            user: req.user,
            courses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Lesson Creation API
 */
exports.createLesson = async (req, res, next) => {
    try {
        const { title, course, description, content, videoUrl, duration, order, isFree } = req.body;
        
        if (!title || !course) {
            return res.status(400).json({ success: false, message: 'Title and Course are required.' });
        }

        // Ensure teacher owns this course
        const existingCourse = await Course.findOne({ _id: course, teacher: req.user._id });
        if (!existingCourse) {
            return res.status(403).json({ success: false, message: 'Unauthorized course selection' });
        }

        const newLesson = await Lesson.create({
            title: title.trim(),
            course,
            description: description ? description.trim() : '',
            content: content ? content.trim() : '',
            videoUrl: videoUrl ? videoUrl.trim() : undefined,
            duration: duration || 0,
            order: order || 1,
            isFree: isFree === 'on' || isFree === true || isFree === 'true'
        });

        res.status(201).json({ success: true, message: 'Lesson created successfully.', lesson: newLesson });
    } catch (error) {
        console.error('Create Lesson Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while creating the lesson.' });
    }
};

/**
 * Controller to render the Edit Lesson page
 */
exports.getEditLesson = async (req, res, next) => {
    try {
        const lesson = await Lesson.findById(req.params.id).populate('course').lean();
        if (!lesson) {
            return res.status(404).render('error', { message: 'Lesson not found' });
        }
        
        // Ensure teacher owns this course
        if (lesson.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', { message: 'Unauthorized access' });
        }

        const courses = await Course.find({ teacher: req.user._id }).lean();
        
        res.render('teacher/edit-lesson', {
            title: 'Edit Lesson | EduSmart',
            user: req.user,
            lesson,
            courses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Lesson Update API
 */
exports.updateLesson = async (req, res, next) => {
    try {
        const { title, course, description, content, videoUrl, duration, order, isFree } = req.body;
        
        // Verify lesson exists and teacher owns its course
        const lesson = await Lesson.findById(req.params.id).populate('course');
        if (!lesson || lesson.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized.' });
        }
        
        // If course changed, verify new course is owned by teacher
        if (course !== lesson.course._id.toString()) {
            const newCourse = await Course.findOne({ _id: course, teacher: req.user._id });
            if (!newCourse) {
                return res.status(403).json({ success: false, message: 'Unauthorized course selection' });
            }
        }

        lesson.title = title.trim();
        lesson.course = course;
        lesson.description = description ? description.trim() : '';
        lesson.content = content ? content.trim() : '';
        lesson.videoUrl = videoUrl ? videoUrl.trim() : undefined;
        lesson.duration = duration || 0;
        lesson.order = order || 1;
        lesson.isFree = isFree === 'on' || isFree === true || isFree === 'true';

        await lesson.save();

        res.status(200).json({ success: true, message: 'Lesson updated successfully.', lesson });
    } catch (error) {
        console.error('Update Lesson Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the lesson.' });
    }
};

/**
 * Controller to handle Lesson Deletion API
 */
exports.deleteLesson = async (req, res, next) => {
    try {
        const lesson = await Lesson.findById(req.params.id).populate('course');
        if (!lesson || lesson.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized.' });
        }

        await Lesson.deleteOne({ _id: lesson._id });

        res.status(200).json({ success: true, message: 'Lesson deleted successfully.' });
    } catch (error) {
        console.error('Delete Lesson Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the lesson.' });
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
 * Controller to handle fetching AI Tutor
 */
exports.getAiTutor = async (req, res, next) => {
    try {
        res.render('teacher/ai-tutor', {
            title: 'AI Tutor | Teacher Dashboard',
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

/**
 * Controller to render the Edit Course page
 */
exports.getEditCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id }).lean();
        if (!course) {
            return res.status(404).render('error', { message: 'Course not found or unauthorized' });
        }
        const subjects = await Subject.find().lean();
        res.render('teacher/edit-course', {
            title: 'Edit Course | EduSmart',
            user: req.user,
            course,
            subjects
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Course Update API
 */
exports.updateCourse = async (req, res, next) => {
    try {
        const { title, description, subject, level, duration, thumbnail, status } = req.body;
        
        // Basic validation
        if (!title || !description || !subject) {
            return res.status(400).json({ success: false, message: 'Title, description, and category are required.' });
        }

        const course = await Course.findOneAndUpdate(
            { _id: req.params.id, teacher: req.user._id },
            {
                title: title.trim(),
                description: description.trim(),
                subject,
                level: level || 'beginner',
                duration: duration ? duration.trim() : undefined,
                thumbnail: thumbnail || '/images/default-course.png',
                isPublished: status === 'published'
            },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found or unauthorized.' });
        }

        res.status(200).json({ success: true, message: 'Course updated successfully.', course });
    } catch (error) {
        console.error('Update Course Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the course.' });
    }
};

/**
 * Controller to handle Course Deletion API
 */
exports.deleteCourse = async (req, res, next) => {
    try {
        // Find course and ensure ownership
        const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id });
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found or unauthorized.' });
        }

        // Check if there are enrolled students
        const enrolledStudents = await Enrollment.countDocuments({ course: course._id, status: { $ne: 'dropped' } });
        
        if (enrolledStudents > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete a course with active enrolled students. Archive the course instead.' 
            });
        }

        // Safe to delete related content (Lessons, Quizzes, Assignments)
        await Lesson.deleteMany({ course: course._id });
        const quizzes = await Quiz.find({ course: course._id });
        const quizIds = quizzes.map(q => q._id);
        await QuizAttempt.deleteMany({ quiz: { $in: quizIds } });
        await Quiz.deleteMany({ course: course._id });
        
        const assignments = await Assignment.find({ course: course._id });
        const assignmentIds = assignments.map(a => a._id);
        await Submission.deleteMany({ assignment: { $in: assignmentIds } });
        await Assignment.deleteMany({ course: course._id });

        // Delete course
        await Course.deleteOne({ _id: course._id });

        res.status(200).json({ success: true, message: 'Course deleted successfully.' });
    } catch (error) {
        console.error('Delete Course Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the course.' });
    }
};

/**
 * Controller to fetch details for a specific course
 */
exports.getCourseDetails = async (req, res, next) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id })
            .populate('subject', 'name')
            .lean();
            
        if (!course) {
            return res.status(404).render('error', { message: 'Course not found or unauthorized' });
        }
        
        const enrollments = await Enrollment.find({ course: course._id, status: { $ne: 'dropped' } })
            .populate('student', 'name email profilePicture')
            .lean();
            
        const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 }).lean();
        const quizzes = await Quiz.find({ course: course._id }).lean();
        const assignments = await Assignment.find({ course: course._id }).sort({ dueDate: 1 }).lean();

        res.render('teacher/course-details', {
            title: `${course.title} | Teacher Dashboard`,
            user: req.user,
            course,
            enrollments,
            lessons,
            quizzes,
            assignments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to render the Create Quiz page
 */
exports.getCreateQuiz = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);
        const lessons = await Lesson.find({ course: { $in: courseIds } }).lean();
        
        res.render('teacher/create-quiz', {
            title: 'Create Quiz | EduSmart',
            user: req.user,
            courses,
            lessons
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Quiz Creation API
 */
exports.createQuiz = async (req, res, next) => {
    try {
        const { title, course, lesson, description, passingScore, timeLimitMinutes } = req.body;
        
        if (!title || !course || !lesson) {
            return res.status(400).json({ success: false, message: 'Title, Course, and Lesson are required.' });
        }

        // Verify ownership
        const existingCourse = await Course.findOne({ _id: course, teacher: req.user._id });
        if (!existingCourse) {
            return res.status(403).json({ success: false, message: 'Unauthorized course selection' });
        }

        const newQuiz = await Quiz.create({
            title: title.trim(),
            course,
            lesson,
            description: description ? description.trim() : '',
            passingScore: passingScore || 60,
            timeLimitMinutes: timeLimitMinutes || 0
        });

        res.status(201).json({ success: true, message: 'Quiz created successfully.', quiz: newQuiz });
    } catch (error) {
        console.error('Create Quiz Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while creating the quiz.' });
    }
};

/**
 * Controller to render the Edit Quiz page
 */
exports.getEditQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('course').lean();
        if (!quiz) {
            return res.status(404).render('error', { message: 'Quiz not found' });
        }
        
        if (quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', { message: 'Unauthorized access' });
        }

        const courses = await Course.find({ teacher: req.user._id }).lean();
        const courseIds = courses.map(c => c._id);
        const lessons = await Lesson.find({ course: { $in: courseIds } }).lean();
        const questions = await Question.find({ quiz: quiz._id }).lean();
        
        res.render('teacher/edit-quiz', {
            title: 'Edit Quiz | EduSmart',
            user: req.user,
            quiz,
            courses,
            lessons,
            questions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Quiz Update API
 */
exports.updateQuiz = async (req, res, next) => {
    try {
        const { title, course, lesson, description, passingScore, timeLimitMinutes } = req.body;
        
        const quiz = await Quiz.findById(req.params.id).populate('course');
        if (!quiz || quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Quiz not found or unauthorized.' });
        }
        
        if (course !== quiz.course._id.toString()) {
            const newCourse = await Course.findOne({ _id: course, teacher: req.user._id });
            if (!newCourse) {
                return res.status(403).json({ success: false, message: 'Unauthorized course selection' });
            }
        }

        quiz.title = title.trim();
        quiz.course = course;
        quiz.lesson = lesson;
        quiz.description = description ? description.trim() : '';
        quiz.passingScore = passingScore || 60;
        quiz.timeLimitMinutes = timeLimitMinutes || 0;

        await quiz.save();

        res.status(200).json({ success: true, message: 'Quiz updated successfully.', quiz });
    } catch (error) {
        console.error('Update Quiz Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the quiz.' });
    }
};

/**
 * Controller to handle Quiz Deletion API
 */
exports.deleteQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('course');
        if (!quiz || quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Quiz not found or unauthorized.' });
        }

        await Question.deleteMany({ quiz: quiz._id });
        await QuizAttempt.deleteMany({ quiz: quiz._id });
        await Quiz.deleteOne({ _id: quiz._id });

        res.status(200).json({ success: true, message: 'Quiz deleted successfully.' });
    } catch (error) {
        console.error('Delete Quiz Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the quiz.' });
    }
};

/**
 * Controller to handle getting questions for a quiz (API)
 */
exports.getQuizQuestions = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('course');
        if (!quiz || quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Quiz not found or unauthorized.' });
        }
        
        const questions = await Question.find({ quiz: quiz._id }).lean();
        res.status(200).json({ success: true, questions });
    } catch (error) {
        console.error('Get Questions Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred fetching questions.' });
    }
};

/**
 * Controller to handle Question Creation API
 */
exports.createQuestion = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('course');
        if (!quiz || quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Quiz not found or unauthorized.' });
        }
        
        const { questionText, options, explanation } = req.body;
        
        if (!questionText || !options || options.length < 2) {
            return res.status(400).json({ success: false, message: 'Question text and at least 2 options are required.' });
        }

        const newQuestion = await Question.create({
            quiz: quiz._id,
            questionText: questionText.trim(),
            options,
            explanation: explanation ? explanation.trim() : ''
        });

        res.status(201).json({ success: true, message: 'Question created successfully.', question: newQuestion });
    } catch (error) {
        console.error('Create Question Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred creating the question.' });
    }
};

/**
 * Controller to handle Question Update API
 */
exports.updateQuestion = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('course');
        if (!quiz || quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Quiz not found or unauthorized.' });
        }
        
        const { questionText, options, explanation } = req.body;
        
        if (!questionText || !options || options.length < 2) {
            return res.status(400).json({ success: false, message: 'Question text and at least 2 options are required.' });
        }

        const question = await Question.findOne({ _id: req.params.questionId, quiz: quiz._id });
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        question.questionText = questionText.trim();
        question.options = options;
        question.explanation = explanation ? explanation.trim() : '';

        await question.save();

        res.status(200).json({ success: true, message: 'Question updated successfully.', question });
    } catch (error) {
        console.error('Update Question Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred updating the question.' });
    }
};

/**
 * Controller to handle Question Deletion API
 */
exports.deleteQuestion = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('course');
        if (!quiz || quiz.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Quiz not found or unauthorized.' });
        }
        
        const question = await Question.findOne({ _id: req.params.questionId, quiz: quiz._id });
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        await Question.deleteOne({ _id: question._id });

        res.status(200).json({ success: true, message: 'Question deleted successfully.' });
    } catch (error) {
        console.error('Delete Question Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred deleting the question.' });
    }
};

/**
 * Controller to render the Assignments List page
 */
exports.getAssignments = async (req, res, next) => {
    try {
        const teacherId = req.user._id;
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);
        
        const assignments = await Assignment.find({ course: { $in: courseIds } })
            .populate('course')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate submissions count for each assignment
        for (let i = 0; i < assignments.length; i++) {
            assignments[i].submissionsCount = await Submission.countDocuments({ assignment: assignments[i]._id });
        }
        
        res.render('teacher/assignments', {
            title: 'Assignments | EduSmart',
            user: req.user,
            assignments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to render Create Assignment page
 */
exports.getCreateAssignment = async (req, res, next) => {
    try {
        const courses = await Course.find({ teacher: req.user._id }).lean();
        res.render('teacher/create-assignment', {
            title: 'Create Assignment | EduSmart',
            user: req.user,
            courses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Assignment Creation API
 */
exports.createAssignment = async (req, res, next) => {
    try {
        const { title, course, description, dueDate, totalPoints } = req.body;
        
        if (!title || !course || !description || !dueDate) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
        }

        // Verify ownership
        const existingCourse = await Course.findOne({ _id: course, teacher: req.user._id });
        if (!existingCourse) {
            return res.status(403).json({ success: false, message: 'Unauthorized course selection' });
        }

        const newAssignment = await Assignment.create({
            title: title.trim(),
            course,
            description: description.trim(),
            dueDate,
            totalPoints: totalPoints || 100
        });

        res.status(201).json({ success: true, message: 'Assignment created successfully.', assignment: newAssignment });
    } catch (error) {
        console.error('Create Assignment Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while creating the assignment.' });
    }
};

/**
 * Controller to render Edit Assignment page
 */
exports.getEditAssignment = async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('course').lean();
        if (!assignment) {
            return res.status(404).render('error', { message: 'Assignment not found' });
        }
        
        if (assignment.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', { message: 'Unauthorized access' });
        }

        const courses = await Course.find({ teacher: req.user._id }).lean();
        
        res.render('teacher/edit-assignment', {
            title: 'Edit Assignment | EduSmart',
            user: req.user,
            assignment,
            courses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Assignment Update API
 */
exports.updateAssignment = async (req, res, next) => {
    try {
        const { title, course, description, dueDate, totalPoints } = req.body;
        
        const assignment = await Assignment.findById(req.params.id).populate('course');
        if (!assignment || assignment.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Assignment not found or unauthorized.' });
        }
        
        if (course !== assignment.course._id.toString()) {
            const newCourse = await Course.findOne({ _id: course, teacher: req.user._id });
            if (!newCourse) {
                return res.status(403).json({ success: false, message: 'Unauthorized course selection' });
            }
        }

        assignment.title = title.trim();
        assignment.course = course;
        assignment.description = description.trim();
        assignment.dueDate = dueDate;
        assignment.totalPoints = totalPoints || 100;

        await assignment.save();

        res.status(200).json({ success: true, message: 'Assignment updated successfully.', assignment });
    } catch (error) {
        console.error('Update Assignment Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the assignment.' });
    }
};

/**
 * Controller to handle Assignment Deletion API
 */
exports.deleteAssignment = async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('course');
        if (!assignment || assignment.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Assignment not found or unauthorized.' });
        }

        await Submission.deleteMany({ assignment: assignment._id });
        await Assignment.deleteOne({ _id: assignment._id });

        res.status(200).json({ success: true, message: 'Assignment deleted successfully.' });
    } catch (error) {
        console.error('Delete Assignment Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the assignment.' });
    }
};

/**
 * Controller to render Assignment Submissions page
 */
exports.getAssignmentSubmissions = async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('course').lean();
        if (!assignment) {
            return res.status(404).render('error', { message: 'Assignment not found' });
        }
        
        if (assignment.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', { message: 'Unauthorized access' });
        }

        const submissions = await Submission.find({ assignment: assignment._id })
            .populate('student')
            .sort({ submittedAt: -1 })
            .lean();
        
        res.render('teacher/assignment-submissions', {
            title: 'Submissions | EduSmart',
            user: req.user,
            assignment,
            submissions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to handle Submission Grading API
 */
exports.gradeSubmission = async (req, res, next) => {
    try {
        const { score, feedback } = req.body;
        
        const submission = await Submission.findById(req.params.submissionId).populate('assignment');
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found.' });
        }
        
        const assignment = await Assignment.findById(submission.assignment._id).populate('course');
        if (assignment.course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        submission.score = score;
        submission.feedback = feedback ? feedback.trim() : '';
        submission.status = 'graded';

        await submission.save();

        res.status(200).json({ success: true, message: 'Submission graded successfully.', submission });
    } catch (error) {
        console.error('Grade Submission Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred grading the submission.' });
    }
};

/**
 * Controller for Under Construction / Unimplemented features
 */
exports.getUnderConstruction = (req, res) => {
    res.render('teacher/under-construction', {
        title: 'Coming Soon | EduSmart',
        user: req.user
    });
};

/**
 * Controller for Analytics
 */
exports.getAnalytics = async (req, res, next) => {
    try {
        const teacherId = req.user._id;

        // Fetch courses for this teacher
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);

        // Fetch aggregate stats
        const totalCourses = courses.length;
        
        // Active students (distinct students enrolled in teacher's courses)
        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: 'active' }).populate('student').lean();
        const activeStudentsSet = new Set(enrollments.map(e => e.student?._id?.toString()).filter(Boolean));
        const totalActiveStudents = activeStudentsSet.size;

        // Assignments & Quizzes counts
        const totalAssignments = await Assignment.countDocuments({ course: { $in: courseIds } });
        const totalQuizzes = await Quiz.countDocuments({ course: { $in: courseIds } });

        // Calculate average assignment score
        const assignments = await Assignment.find({ course: { $in: courseIds } }).lean();
        const assignmentIds = assignments.map(a => a._id);
        const submissions = await Submission.find({ assignment: { $in: assignmentIds }, status: 'graded' }).lean();
        
        let totalAssignmentScore = 0;
        let maxPossibleAssignmentScore = 0;
        submissions.forEach(sub => {
            const assignment = assignments.find(a => a._id.toString() === sub.assignment.toString());
            if (assignment) {
                totalAssignmentScore += sub.score;
                maxPossibleAssignmentScore += assignment.totalPoints;
            }
        });
        
        const avgAssignmentScore = maxPossibleAssignmentScore > 0 
            ? Math.round((totalAssignmentScore / maxPossibleAssignmentScore) * 100) 
            : 0;

        // Calculate average quiz score
        const quizzes = await Quiz.find({ course: { $in: courseIds } }).lean();
        const quizIds = quizzes.map(q => q._id);
        const quizAttempts = await QuizAttempt.find({ quiz: { $in: quizIds } }).lean();
        
        let totalQuizScore = 0;
        let maxPossibleQuizScore = 0;
        quizAttempts.forEach(attempt => {
            const quiz = quizzes.find(q => q._id.toString() === attempt.quiz.toString());
            if (quiz) {
                totalQuizScore += attempt.score;
                // Assuming total points for a quiz is equal to number of questions (or a field on quiz)
                // For simplicity, if totalPoints is not on quiz attempt, we just use a normalized percentage if it's stored.
                // Wait, QuizAttempt usually stores `score` (e.g., number of correct answers)
            }
        });
        
        // Just simple average of percentages if we want to be quick, but let's just pass the data
        const recentEnrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('student')
            .populate('course')
            .sort({ enrolledAt: -1 })
            .limit(5)
            .lean();

        res.render('teacher/analytics', {
            title: 'Analytics | EduSmart',
            user: req.user,
            stats: {
                totalCourses,
                totalActiveStudents,
                totalAssignments,
                totalQuizzes,
                avgAssignmentScore
            },
            recentEnrollments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller for Reports
 */
exports.getReports = async (req, res, next) => {
    try {
        const teacherId = req.user._id;

        // Fetch courses for this teacher
        const courses = await Course.find({ teacher: teacherId }).lean();
        const courseIds = courses.map(c => c._id);

        // Fetch active enrollments with populated student details
        const enrollments = await Enrollment.find({ course: { $in: courseIds }, status: 'active' })
            .populate('student')
            .populate('course')
            .lean();

        // Calculate progress and aggregate grades
        const reportData = [];
        
        for (const enroll of enrollments) {
            // Find assignments for this specific course
            const assignments = await Assignment.find({ course: enroll.course._id }).lean();
            const assignmentIds = assignments.map(a => a._id);
            
            const submissions = await Submission.find({ 
                assignment: { $in: assignmentIds },
                student: enroll.student._id
            }).lean();

            let totalPointsEarned = 0;
            let totalPointsPossible = 0;
            
            assignments.forEach(assignment => {
                totalPointsPossible += assignment.totalPoints;
                const sub = submissions.find(s => s.assignment.toString() === assignment._id.toString() && s.status === 'graded');
                if (sub) {
                    totalPointsEarned += sub.score;
                }
            });

            const assignmentScore = totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0;
            
            // Build report row
            reportData.push({
                studentId: enroll.student._id,
                studentName: `${enroll.student.firstName} ${enroll.student.lastName}`,
                studentEmail: enroll.student.email,
                courseName: enroll.course.title,
                enrolledAt: enroll.enrolledAt,
                progress: enroll.progress || 0, // from enrollment
                assignmentScore,
                assignmentsCompleted: submissions.length,
                totalAssignments: assignments.length
            });
        }

        res.render('teacher/reports', {
            title: 'Reports | EduSmart',
            user: req.user,
            reportData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller for Settings
 */
exports.getSettings = (req, res) => {
    res.render('teacher/settings', {
        title: 'Settings | EduSmart',
        user: req.user
    });
};
