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

        // Very basic logic for 'Complete First Lesson' badge
        let profile = await StudentProfile.findOne({ user: studentId });
        if (!profile) {
            profile = await StudentProfile.create({ user: studentId });
        }

        const badge = await Badge.findOne({ criteria: 'completed_first_lesson' });
        if (badge) {
            const hasBadge = profile.earnedBadges.some(b => b.badge.toString() === badge._id.toString());
            if (!hasBadge) {
                profile.earnedBadges.push({ badge: badge._id, earnedAt: new Date() });
                await profile.save();
            }
        }

        res.json({ success: true, progress });
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

        // Earn Badge Logic
        if (score === 100) {
            let profile = await StudentProfile.findOne({ user: studentId });
            if (!profile) profile = await StudentProfile.create({ user: studentId });

            const badge = await Badge.findOne({ criteria: 'perfect_quiz' });
            if (badge) {
                const hasBadge = profile.earnedBadges.some(b => b.badge.toString() === badge._id.toString());
                if (!hasBadge) {
                    profile.earnedBadges.push({ badge: badge._id, earnedAt: new Date() });
                    await profile.save();
                }
            }
        }

        res.json({ success: true, attemptId: attempt._id });
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
