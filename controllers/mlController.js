const RiskEvent = require('../models/RiskEvent');
const StudentProfile = require('../models/StudentProfile');

// Sync risk events (struggle detections) from client IndexedDB
const syncRiskEvents = async (req, res) => {
    try {
        const { riskEvents } = req.body;
        const studentId = req.user._id;

        if (!Array.isArray(riskEvents) || riskEvents.length === 0) {
            return res.status(400).json({ error: 'riskEvents array is required' });
        }

        const successIds = [];
        const Enrollment = require('../models/Enrollment');
        const Course = require('../models/Course');

        // Pre-fetch enrollments for this student
        const enrollments = await Enrollment.find({ student: studentId, status: { $ne: 'dropped' } }).lean();
        const enrolledCourseIds = enrollments.map(e => e.course.toString());

        for (const event of riskEvents) {
            // Validate event structure
            if (!event.eventId || !event.courseId || event.riskProbability === undefined || !event.riskLevel) {
                // If malformed, consider it synced so it gets removed from client queue
                successIds.push(event.eventId || 'unknown');
                continue;
            }

            // Check if already exists
            const existing = await RiskEvent.findOne({ eventId: event.eventId });
            if (existing) {
                successIds.push(event.eventId);
                continue;
            }

            // Validate course enrollment
            if (!enrolledCourseIds.includes(event.courseId.toString())) {
                console.warn(`Unauthorized risk event sync for course: ${event.courseId}`);
                successIds.push(event.eventId); // drop it
                continue;
            }

            // Validate features/ranges
            const probability = parseFloat(event.riskProbability);
            if (isNaN(probability) || probability < 0 || probability > 1) {
                successIds.push(event.eventId);
                continue;
            }

            const validCategories = ['LOW', 'MEDIUM', 'HIGH'];
            if (!validCategories.includes(event.riskLevel)) {
                successIds.push(event.eventId);
                continue;
            }
            
            // Validate timestamps
            let timestamp = new Date(event.createdAt);
            if (isNaN(timestamp.getTime()) || timestamp > new Date()) {
                timestamp = new Date();
            }

            // Save to DB
            await RiskEvent.create({
                eventId: event.eventId,
                student: studentId,
                course: event.courseId,
                quiz: event.quizId || null,
                riskProbability: probability,
                riskLevel: event.riskLevel,
                topic: event.topic || 'General',
                modelVersion: event.modelVersion || '1.0.0',
                createdAt: timestamp
            });

            successIds.push(event.eventId);
        }

        res.status(200).json({
            status: 'success',
            syncedIds: successIds
        });
    } catch (error) {
        console.error('syncRiskEvents error:', error);
        res.status(500).json({ error: 'Server error syncing risk events' });
    }
};

const LearningEvent = require('../models/LearningEvent');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');

// Sync learning events from client IndexedDB
const syncEvents = async (req, res) => {
    try {
        const { events } = req.body;
        const studentId = req.user._id;

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'Events array is required' });
        }

        const successIds = [];

        for (const event of events) {
            // Check for duplicates
            const existing = await LearningEvent.findOne({ eventId: event.eventId });
            if (existing) {
                successIds.push(event.eventId);
                continue; // Skip processing if it already exists
            }

            // Fetch relations securely on backend
            const quiz = await Quiz.findById(event.quizId);
            const question = await Question.findById(event.questionId);

            if (!quiz || !question) {
                // If invalid relations, we still mark as success to pop it from client queue
                successIds.push(event.eventId);
                continue;
            }

            // Calculate duration securely
            const startedAt = new Date(event.questionStartedAt);
            const answeredAt = new Date(event.questionAnsweredAt);
            let duration = answeredAt.getTime() - startedAt.getTime();
            if (duration < 0) duration = 0; // fallback

            // Determine if correct from backend truth
            let isCorrect = false;
            if (event.selectedOptionIndex !== null && event.selectedOptionIndex !== undefined) {
                if (question.options[event.selectedOptionIndex] && question.options[event.selectedOptionIndex].isCorrect) {
                    isCorrect = true;
                }
            }

            // Calculate attempt count for this specific question by this student
            const attemptCount = (await LearningEvent.countDocuments({ 
                student: studentId, 
                question: question._id 
            })) + 1;

            // Compute recent quiz performance (last 5 attempts)
            const recentAttempts = await QuizAttempt.find({ student: studentId })
                .sort({ endTime: -1 })
                .limit(5);
                
            let recentQuizPerformance = 0;
            if (recentAttempts.length > 0) {
                const totalScore = recentAttempts.reduce((acc, curr) => acc + curr.score, 0);
                recentQuizPerformance = totalScore / recentAttempts.length;
            }

            // Create event
            await LearningEvent.create({
                eventId: event.eventId,
                student: studentId,
                course: quiz.course,
                lesson: quiz.lesson,
                quiz: quiz._id,
                question: question._id,
                topic: question.topic || 'General',
                difficulty: question.difficulty || 3,
                isCorrect: isCorrect,
                attemptCount: attemptCount,
                questionStartedAt: startedAt,
                questionAnsweredAt: answeredAt,
                responseDuration: duration,
                skipped: !!event.skipped,
                quizCompleted: !!event.quizCompleted,
                recentQuizPerformance: recentQuizPerformance,
                topicPerformance: 0 // Optional: implement topic-level logic here if needed
            });

            successIds.push(event.eventId);
        }

        res.status(200).json({
            status: 'success',
            syncedIds: successIds
        });
    } catch (error) {
        console.error('syncEvents error:', error);
        res.status(500).json({ error: 'Server error syncing events' });
    }
};

module.exports = {
    syncRiskEvents,
    syncEvents
};
