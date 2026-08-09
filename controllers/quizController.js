const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProfile = require('../models/StudentProfile');
const achievementService = require('../services/achievementService');
const notificationService = require('../services/notificationService');

// Render the quiz SPA page
const renderQuizPage = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).send('Quiz not found');
        }
        res.render('quiz/quiz', { quizId: req.params.id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Get Quiz Data (Safe payload for client)
const getQuizData = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate('lesson');
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Fetch questions, explicitly EXCLUDING the explanation
        const questions = await Question.find({ quiz: quiz._id }).select('-explanation');
        
        res.json({
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                description: quiz.description,
                timeLimitMinutes: quiz.timeLimitMinutes,
                passingScore: quiz.passingScore,
                course: quiz.course
            },
            questions
        });
    } catch (error) {
        console.error('getQuizData error:', error);
        res.status(500).json({ error: 'Server error fetching quiz data' });
    }
};

// Submit Quiz and calculate scores securely
const submitQuiz = async (req, res) => {
    const { answers } = req.body; // format: [{ questionId, selectedOptionIndex }]
    const studentId = req.user._id; 
    
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        // Retrieve actual questions with the correct answers and explanations
        const actualQuestions = await Question.find({ quiz: quiz._id });
        let correctCount = 0;
        
        // Prepare attempt answers array
        const attemptAnswers = actualQuestions.map(q => {
            const studentAnswer = answers.find(a => a.questionId === q._id.toString());
            let isCorrect = false;
            let selectedIndex = null;
            let responseDuration = 0;
            let skipped = true;
            
            if (studentAnswer && studentAnswer.selectedOptionIndex !== null && studentAnswer.selectedOptionIndex !== undefined) {
                selectedIndex = studentAnswer.selectedOptionIndex;
                skipped = false;
                if (q.options[selectedIndex] && q.options[selectedIndex].isCorrect) {
                    isCorrect = true;
                    correctCount++;
                }
            }

            if (studentAnswer && typeof studentAnswer.responseDuration === 'number') {
                responseDuration = studentAnswer.responseDuration;
            }
            if (studentAnswer && studentAnswer.skipped !== undefined) {
                skipped = studentAnswer.skipped;
            }
            
            return {
                question: q._id,
                selectedOptionIndex: selectedIndex,
                isCorrect,
                responseDuration,
                skipped
            };
        });

        const totalQuestions = actualQuestions.length;
        const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        const passed = percentage >= quiz.passingScore;

        // Save Attempt
        const attempt = await QuizAttempt.create({
            quiz: quiz._id,
            student: studentId,
            score: percentage, // storing percentage as score for simplicity based on model
            passed,
            answers: attemptAnswers,
            endTime: new Date()
        });

        // Check for achievements asynchronously
        achievementService.checkQuizAchievements(studentId, quiz._id, percentage).catch(err => {
            console.error('Quiz achievement check failed:', err);
        });

        // Adaptive Difficulty Logic
        if (req.user.role === 'student') {
            const profile = await StudentProfile.findOne({ user: studentId });
            if (profile) {
                if (percentage >= 80) {
                    profile.recommendedDifficulty = 'advanced';
                } else if (percentage < 50) {
                    profile.recommendedDifficulty = 'beginner';
                } else {
                    profile.recommendedDifficulty = 'intermediate';
                }
                await profile.save();
            }
        }

        // Notify parent about quiz completion
        notificationService.createNotification({
            type: 'quiz_completed',
            title: 'Quiz Completed',
            message: `${req.user.name || 'Your child'} completed the ${quiz.title} quiz with a score of ${percentage}%.`,
            childId: studentId,
            relatedId: quiz._id,
            link: `/parent/progress` // Link to progress page where they can see quizzes
        });

        // Return Detailed Results (including correct answers and explanations for review)
        const reviewData = actualQuestions.map(q => {
            const stuAns = attemptAnswers.find(a => a.question.toString() === q._id.toString());
            return {
                questionText: q.questionText,
                options: q.options, // This includes isCorrect now
                explanation: q.explanation,
                selectedOptionIndex: stuAns ? stuAns.selectedOptionIndex : null,
                isCorrect: stuAns ? stuAns.isCorrect : false
            };
        });

        res.json({
            status: 'success',
            result: {
                score: percentage,
                passed,
                correctCount,
                totalQuestions,
                reviewData
            }
        });
    } catch (error) {
        console.error('submitQuiz error:', error);
        res.status(500).json({ error: 'Server error during quiz submission' });
    }
};

module.exports = {
    renderQuizPage,
    getQuizData,
    submitQuiz
};
