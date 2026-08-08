const Achievement = require('../models/Achievement');
const QuizAttempt = require('../models/QuizAttempt');
const Progress = require('../models/Progress');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const notificationService = require('./notificationService');

/**
 * Helper to safely create an achievement, handling duplicate unique errors.
 */
const awardAchievement = async (studentId, type, title, description, icon, context = {}) => {
    try {
        const payload = {
            studentId,
            type,
            title,
            description,
            icon,
            ...context
        };
        const newAchievement = await Achievement.create(payload);
        
        // Notify parent about new achievement
        notificationService.createNotification({
            type: 'achievement_earned',
            title: 'New Achievement 🏆',
            message: `Your child earned the "${title}" achievement!`,
            childId: studentId,
            relatedId: newAchievement._id,
            link: `/parent/achievements` // Link to achievements page
        });

        return true;
    } catch (error) {
        // E11000 duplicate key error means the achievement was already awarded for this context
        if (error.code === 11000) {
            return false;
        }
        console.error('Error awarding achievement:', error);
        return false;
    }
};

/**
 * Checks and awards quiz-related achievements
 */
exports.checkQuizAchievements = async (studentId, quizId, score) => {
    try {
        // 1. Check for perfect score
        if (score === 100) {
            await awardAchievement(
                studentId,
                'quiz_master',
                'Quiz Master',
                'Scored 100% on a quiz',
                'fa-solid fa-trophy',
                { quizId }
            );
        }

        // 2. Check total quizzes completed
        const attemptsCount = await QuizAttempt.countDocuments({ student: studentId });
        
        if (attemptsCount === 1) {
            await awardAchievement(
                studentId,
                'first_quiz',
                'First Quiz Completed',
                'Completed your very first quiz',
                'fa-solid fa-star',
                { quizId }
            );
        }
        
        if (attemptsCount === 10) {
            await awardAchievement(
                studentId,
                'quiz_10',
                'Quiz Enthusiast',
                'Completed 10 quizzes',
                'fa-solid fa-medal',
                { quizId }
            );
        }
    } catch (error) {
        console.error('Error in checkQuizAchievements:', error);
    }
};

/**
 * Checks and awards lesson/course related achievements
 */
exports.checkLessonAchievements = async (studentId, courseId) => {
    try {
        // 1. Check total lessons completed
        const completedLessonsCount = await Progress.countDocuments({ student: studentId, status: 'completed' });
        
        const milestones = {
            1: { type: 'first_lesson', title: 'First Steps', desc: 'Completed your first lesson' },
            10: { type: 'lesson_10', title: 'Getting Started', desc: 'Completed 10 lessons' },
            25: { type: 'lesson_25', title: 'Steady Learner', desc: 'Completed 25 lessons' },
            50: { type: 'lesson_50', title: 'Lesson Explorer', desc: 'Completed 50 lessons' },
            100: { type: 'lesson_100', title: 'Knowledge Seeker', desc: 'Completed 100 lessons' }
        };

        if (milestones[completedLessonsCount]) {
            const milestone = milestones[completedLessonsCount];
            await awardAchievement(
                studentId,
                milestone.type,
                milestone.title,
                milestone.desc,
                'fa-solid fa-book-open',
                { courseId }
            );
        }

        // 2. Check course completion
        if (courseId) {
            const courseLessonsCount = await Lesson.countDocuments({ course: courseId });
            const courseCompletedCount = await Progress.countDocuments({ 
                student: studentId, 
                course: courseId, 
                status: 'completed' 
            });

            if (courseLessonsCount > 0 && courseCompletedCount === courseLessonsCount) {
                await awardAchievement(
                    studentId,
                    'course_champion',
                    'Course Champion',
                    'Successfully completed a full course',
                    'fa-solid fa-graduation-cap',
                    { courseId }
                );

                // Check first course completed
                const courseAchievementsCount = await Achievement.countDocuments({ 
                    studentId: studentId, 
                    type: 'course_champion' 
                });
                
                if (courseAchievementsCount === 1) { // They just earned their first one
                    await awardAchievement(
                        studentId,
                        'first_course',
                        'First Course Completed',
                        'Completed your first full course on EduSmart',
                        'fa-solid fa-award',
                        { courseId }
                    );
                }
            }
        }
    } catch (error) {
        console.error('Error in checkLessonAchievements:', error);
    }
};

/**
 * Checks and awards assignment-related achievements
 */
exports.checkAssignmentAchievements = async (studentId, assignmentId) => {
    try {
        const submissionsCount = await Submission.countDocuments({ student: studentId });

        if (submissionsCount === 1) {
            await awardAchievement(
                studentId,
                'first_assignment',
                'First Assignment',
                'Submitted your first assignment',
                'fa-solid fa-pen-nib',
                { assignmentId }
            );
        }

        if (submissionsCount === 10) {
            await awardAchievement(
                studentId,
                'assignment_10',
                'Diligent Student',
                'Completed 10 assignments',
                'fa-solid fa-check-double',
                { assignmentId }
            );
        }
    } catch (error) {
        console.error('Error in checkAssignmentAchievements:', error);
    }
};
