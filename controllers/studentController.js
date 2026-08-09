const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProfile = require('../models/StudentProfile');
const Course = require('../models/Course');
const Badge = require('../models/Badge');
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

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
            currentStreak: profile && profile.currentStreak ? profile.currentStreak : 0,
            level: profile && profile.level ? profile.level : 1,
            totalPoints: profile && profile.totalPoints ? profile.totalPoints : 0,
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
        const Subject = require('../models/Subject');
        const subjects = await Subject.find().sort({ name: 1 }).lean();

        console.log('allCourses length:', allCourses.length);
        console.log('allCourses titles:', allCourses.map(c => c.title));

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
        
        // Fetch enrollments
        const enrollments = await Enrollment.find({ student: studentId, status: { $ne: 'dropped' } }).lean();
        const enrolledCourseIds = enrollments.map(e => e.course.toString());
        
        // Fetch quizzes for these courses
        const availableQuizzes = await Quiz.find({ course: { $in: enrolledCourseIds } })
            .populate('course', 'title')
            .populate('lesson', 'title')
            .lean();
            
        // Fetch attempts
        const quizAttempts = await QuizAttempt.find({ student: studentId })
            .populate({
                path: 'quiz',
                populate: { path: 'course', select: 'title' }
            })
            .sort({ createdAt: -1 })
            .lean();
            
        // Attach attempts to available quizzes
        availableQuizzes.forEach(quiz => {
            quiz.attempts = quizAttempts.filter(a => a.quiz._id.toString() === quiz._id.toString());
            quiz.bestScore = quiz.attempts.length > 0 ? Math.max(...quiz.attempts.map(a => a.score)) : null;
        });
            
        res.render('student/quizzes', {
            title: 'Quizzes | EduSmart',
            availableQuizzes,
            recentAttempts: quizAttempts,
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
        
        // Find all enrollments for the student
        const enrollments = await Enrollment.find({ student: studentId })
            .populate('course')
            .lean();
            
        // Calculate progress for each enrolled course
        const progressRecordsRaw = await Promise.all(enrollments.map(async (enrollment) => {
            const course = enrollment.course;
            if (!course) return null;
            
            // Count completed lessons for this course
            const completedLessonsCount = await Progress.countDocuments({
                student: studentId,
                course: course._id,
                status: 'completed'
            });
            
            // Get last accessed date
            const lastProgress = await Progress.findOne({
                student: studentId,
                course: course._id
            }).sort({ lastAccessed: -1 }).lean();
            
            return {
                course: {
                    title: course.title,
                    lessons: course.lessons || []
                },
                completedLessons: { length: completedLessonsCount },
                lastAccessed: lastProgress ? lastProgress.lastAccessed : enrollment.enrolledAt
            };
        }));

        const progressRecords = progressRecordsRaw.filter(Boolean);

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
        const allBadges = await Badge.find({}).lean();
        
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
// --- NEW COURSE ENDPOINTS ---

exports.getCourseDetails = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { courseId } = req.params;

        const course = await Course.findById(courseId)
            .populate('teacher', 'name profilePicture')
            .populate('subject', 'name')
            .lean();

        if (!course || !course.isPublished) {
            return res.status(404).render('error', { message: 'Course not found or not available.' });
        }

        const enrollment = await Enrollment.findOne({ student: studentId, course: courseId }).lean();
        const lessons = await Lesson.find({ course: courseId }).sort({ order: 1 }).lean();
        const quizzes = await Quiz.find({ course: courseId }).lean();

        res.render('student/course-details', {
            title: `${course.title} | EduSmart`,
            course,
            lessons,
            quizzes,
            isEnrolled: !!enrollment,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.enrollInCourse = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { courseId } = req.params;

        const course = await Course.findById(courseId).lean();
        if (!course || !course.isPublished) {
            return res.status(404).json({ success: false, message: 'Course not found or unavailable' });
        }

        const existingEnrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        if (existingEnrollment) {
            return res.redirect(`/student/courses/${courseId}`);
        }

        await Enrollment.create({
            student: studentId,
            course: courseId,
            status: 'active'
        });

        // Redirect to course details where they can now "Continue Learning"
        res.redirect(`/student/courses/${courseId}`);
    } catch (error) {
        next(error);
    }
};

exports.continueLearning = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { courseId } = req.params;

        const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        if (!enrollment) {
            return res.status(403).render('error', { message: 'You are not enrolled in this course.' });
        }

        // Find the last incomplete lesson
        const lessons = await Lesson.find({ course: courseId }).sort({ order: 1 }).lean();
        if (lessons.length === 0) {
            return res.redirect(`/student/courses/${courseId}`);
        }

        const progressRecords = await Progress.find({ student: studentId, course: courseId }).lean();
        const completedLessonIds = progressRecords.filter(p => p.status === 'completed').map(p => p.lesson.toString());

        let nextLesson = lessons.find(l => !completedLessonIds.includes(l._id.toString()));
        if (!nextLesson) {
            nextLesson = lessons[lessons.length - 1]; // All completed, go to last
        }

        res.redirect(`/student/lessons/${nextLesson._id}`);
    } catch (error) {
        next(error);
    }
};

// --- NEW LESSON ENDPOINTS ---

exports.getLesson = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { lessonId } = req.params;

        const lesson = await Lesson.findById(lessonId).populate('course').lean();
        if (!lesson) {
            return res.status(404).render('error', { message: 'Lesson not found.' });
        }

        const enrollment = await Enrollment.findOne({ student: studentId, course: lesson.course._id });
        if (!enrollment) {
            return res.status(403).render('error', { message: 'You are not enrolled in this course.' });
        }

        // Fetch all lessons for the course to build a navigation menu
        const courseLessons = await Lesson.find({ course: lesson.course._id }).sort({ order: 1 }).lean();
        const progressRecords = await Progress.find({ student: studentId, course: lesson.course._id }).lean();
        const completedLessonIds = progressRecords.filter(p => p.status === 'completed').map(p => p.lesson.toString());

        // Update progress status to in_progress if not completed
        const existingProgress = progressRecords.find(p => p.lesson.toString() === lessonId.toString());
        if (!existingProgress) {
            await Progress.create({
                student: studentId,
                lesson: lessonId,
                course: lesson.course._id,
                status: 'in_progress',
                lastAccessed: new Date()
            });
        } else {
            await Progress.updateOne({ _id: existingProgress._id }, { lastAccessed: new Date() });
        }

        // Determine next lesson
        const currentIndex = courseLessons.findIndex(l => l._id.toString() === lessonId.toString());
        const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;
        const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;

        res.render('student/lesson', {
            title: `${lesson.title} | EduSmart`,
            lesson,
            courseLessons,
            completedLessonIds,
            nextLesson,
            prevLesson,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.completeLesson = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { lessonId } = req.params;

        const lesson = await Lesson.findById(lessonId).lean();
        if (!lesson) return res.status(404).json({ success: false });

        const progress = await Progress.findOneAndUpdate(
            { student: studentId, lesson: lessonId, course: lesson.course },
            { status: 'completed', completedAt: new Date(), lastAccessed: new Date() },
            { upsert: true, new: true }
        );

        // Gamification: Add XP and Level Up
        let profile = await StudentProfile.findOne({ user: studentId });
        if (!profile) {
            profile = await StudentProfile.create({ user: studentId });
        }

        let leveledUp = false;
        profile.totalPoints = (profile.totalPoints || 0) + 50;
        const requiredXP = (profile.level || 1) * 100;
        if (profile.totalPoints >= requiredXP) {
            profile.level = (profile.level || 1) + 1;
            leveledUp = true;
        }

        const badge = await Badge.findOne({ criteria: 'completed_first_lesson' });
        if (badge) {
            const hasBadge = profile.earnedBadges.some(b => b.badge.toString() === badge._id.toString());
            if (!hasBadge) {
                profile.earnedBadges.push({ badge: badge._id, earnedAt: new Date() });
            }
        }
        await profile.save();

        res.json({ success: true, progress, leveledUp });
    } catch (error) {
        next(error);
    }
};

// --- NEW QUIZ ENDPOINTS ---

exports.getQuizDetails = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId).populate('course').lean();
        if (!quiz) return res.status(404).render('error', { message: 'Quiz not found.' });

        const enrollment = await Enrollment.findOne({ student: studentId, course: quiz.course._id });
        if (!enrollment) return res.status(403).render('error', { message: 'Access denied.' });

        const attempts = await QuizAttempt.find({ student: studentId, quiz: quizId }).sort({ createdAt: -1 }).lean();

        res.render('student/quiz-details', {
            title: `${quiz.title} | EduSmart`,
            quiz,
            attempts,
            bestScore: attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : null,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.attemptQuiz = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { quizId } = req.params;

        const quiz = await Quiz.findById(quizId).populate('course').lean();
        if (!quiz) return res.status(404).render('error', { message: 'Quiz not found.' });

        const enrollment = await Enrollment.findOne({ student: studentId, course: quiz.course._id });
        if (!enrollment) return res.status(403).render('error', { message: 'Access denied.' });

        const questions = await Question.find({ quiz: quizId }).lean();
        
        // Remove 'isCorrect' from options before sending to client
        const safeQuestions = questions.map(q => {
            const safeOptions = q.options.map(o => ({ _id: o._id, text: o.text }));
            return { _id: q._id, questionText: q.questionText, options: safeOptions };
        });

        res.render('student/quiz-attempt', {
            title: `Attempting ${quiz.title} | EduSmart`,
            quiz,
            questions: safeQuestions,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.submitQuiz = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { quizId } = req.params;
        const { answers } = req.body; // Array of { questionId, selectedOptionIndex }

        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

        const questions = await Question.find({ quiz: quizId }).lean();
        let correctCount = 0;
        const detailedAnswers = [];

        for (const ans of answers) {
            const q = questions.find(question => question._id.toString() === ans.questionId);
            if (q) {
                const isCorrect = q.options[ans.selectedOptionIndex]?.isCorrect || false;
                if (isCorrect) correctCount++;
                detailedAnswers.push({
                    question: q._id,
                    selectedOptionIndex: ans.selectedOptionIndex,
                    isCorrect
                });
            }
        }

        const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        const passed = score >= quiz.passingScore;

        const attempt = await QuizAttempt.create({
            quiz: quizId,
            student: studentId,
            score,
            passed,
            answers: detailedAnswers,
            endTime: new Date()
        });

        // Gamification: Earn XP and Badge Logic
        let profile = await StudentProfile.findOne({ user: studentId });
        if (!profile) profile = await StudentProfile.create({ user: studentId });

        let leveledUp = false;
        if (passed) {
            profile.totalPoints = (profile.totalPoints || 0) + (score * 10);
            const requiredXP = (profile.level || 1) * 100;
            if (profile.totalPoints >= requiredXP) {
                profile.level = (profile.level || 1) + 1;
                leveledUp = true;
            }
        }

        if (score === 100) {
            const badge = await Badge.findOne({ criteria: 'perfect_quiz' });
            if (badge) {
                const hasBadge = profile.earnedBadges.some(b => b.badge.toString() === badge._id.toString());
                if (!hasBadge) {
                    profile.earnedBadges.push({ badge: badge._id, earnedAt: new Date() });
                }
            }
        }
        await profile.save();

        res.json({ success: true, attemptId: attempt._id, leveledUp });
    } catch (error) {
        next(error);
    }
};

exports.getQuizResult = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        const { quizId } = req.params;
        const { attemptId } = req.query;

        const attempt = await QuizAttempt.findOne({ _id: attemptId, student: studentId })
            .populate('quiz')
            .lean();
            
        if (!attempt) return res.status(404).render('error', { message: 'Attempt not found.' });

        const questions = await Question.find({ quiz: attempt.quiz._id }).lean();

        res.render('student/quiz-result', {
            title: `Results: ${attempt.quiz.title} | EduSmart`,
            attempt,
            questions,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

exports.getLeaderboard = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        
        const topStudents = await StudentProfile.find({})
            .populate('user', 'name profilePicture')
            .sort({ totalPoints: -1 })
            .limit(10)
            .lean();

        let userRank = topStudents.findIndex(p => p.user._id.toString() === studentId.toString()) + 1;
        let userTotalPoints = 0;
        
        if (userRank === 0) {
            const profile = await StudentProfile.findOne({ user: studentId }).lean();
            if (profile) {
                userTotalPoints = profile.totalPoints || 0;
                const higherRanked = await StudentProfile.countDocuments({ totalPoints: { $gt: userTotalPoints } });
                userRank = higherRanked + 1;
            }
        } else {
            userTotalPoints = topStudents[userRank - 1].totalPoints;
        }

        res.render('student/leaderboard', {
            title: 'Leaderboard | EduSmart',
            user: req.user,
            topStudents,
            userRank,
            userTotalPoints
        });
    } catch (error) {
        next(error);
    }
};

exports.getBadges = async (req, res, next) => {
    try {
        const studentId = req.user._id;
        
        const allBadges = await Badge.find({}).lean();
        const profile = await StudentProfile.findOne({ user: studentId }).populate('earnedBadges.badge').lean();
        
        res.render('student/badges', {
            title: 'My Badges | EduSmart',
            user: req.user,
            allBadges: allBadges,
            earnedBadges: profile ? profile.earnedBadges : []
        });
    } catch (error) {
        next(error);
    }
};

exports.getSettings = (req, res) => {
    res.render('student/settings', {
        title: 'Settings | EduSmart',
        user: req.user
    });
};

exports.getOfflineVideos = async (req, res, next) => {
    try {
        // Just rendering the template for now. It can be populated with real data later.
        res.render('student/offline-videos', {
            title: 'Offline Videos | EduSmart',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};
