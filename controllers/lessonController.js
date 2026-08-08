const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');

/**
 * Get lesson page
 * GET /lessons/:lessonId
 */
exports.getLessonPage = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const studentId = req.user._id;

        // Ensure valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(404).render('student/dashboard', { error: 'Lesson not found.' });
        }

        // Fetch lesson with course and subject
        const lesson = await Lesson.findById(lessonId).populate({
            path: 'course',
            populate: {
                path: 'subject'
            }
        });

        if (!lesson) {
            return res.status(404).render('student/dashboard', { error: 'Lesson not found.' });
        }

        // Check if student is enrolled in the course
        const enrollment = await Enrollment.findOne({ student: studentId, course: lesson.course._id, status: 'active' });
        if (!enrollment && req.user.role === 'student') {
            return res.status(403).render('student/dashboard', { error: 'You do not have access to this course.' });
        }

        // Fetch all lessons in this course to build navigation
        const allLessons = await Lesson.find({ course: lesson.course._id }).sort({ order: 1 });

        // Calculate next lesson and previous lesson
        let prevLesson = null;
        let nextLesson = null;
        
        for (let i = 0; i < allLessons.length; i++) {
            if (allLessons[i]._id.toString() === lessonId) {
                if (i > 0) prevLesson = allLessons[i - 1];
                if (i < allLessons.length - 1) nextLesson = allLessons[i + 1];
                break;
            }
        }

        // Fetch user progress for this course
        let userProgress = [];
        if (req.user.role === 'student') {
            userProgress = await Progress.find({ student: studentId, course: lesson.course._id });
        }

        // Find current lesson progress
        let currentProgress = userProgress.find(p => p.lesson.toString() === lessonId);
        
        if (!currentProgress && req.user.role === 'student') {
            // Initialize progress for this lesson if viewed for the first time
            currentProgress = await Progress.create({
                student: studentId,
                lesson: lessonId,
                course: lesson.course._id,
                status: 'in_progress',
                lastAccessed: new Date()
            });
            userProgress.push(currentProgress);
        } else if (currentProgress) {
            // Update last accessed
            currentProgress.lastAccessed = new Date();
            await currentProgress.save();
        }

        // Compute course progress percentage
        const completedCount = userProgress.filter(p => p.status === 'completed').length;
        const totalLessonsCount = allLessons.length;
        const progressPercentage = totalLessonsCount === 0 ? 0 : Math.round((completedCount / totalLessonsCount) * 100);

        // Map progress states to the navigation list
        const navLessons = allLessons.map(l => {
            const p = userProgress.find(up => up.lesson.toString() === l._id.toString());
            return {
                _id: l._id,
                title: l.title,
                order: l.order,
                status: p ? p.status : 'not_started',
                isCurrent: l._id.toString() === lessonId
            };
        });

        res.render('lessons/lesson', {
            lesson,
            course: lesson.course,
            subject: lesson.course.subject,
            prevLesson,
            nextLesson,
            navLessons,
            currentProgress,
            progressPercentage,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching lesson:', error);
        next(error);
    }
};

/**
 * Update lesson progress
 * POST /lessons/:lessonId/progress
 */
exports.updateProgress = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const studentId = req.user._id;

        if (req.user.role !== 'student') {
            return res.status(403).json({ error: 'Only students can update progress.' });
        }

        // Validate lesson
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }

        // Verify enrollment
        const enrollment = await Enrollment.findOne({ student: studentId, course: lesson.course, status: 'active' });
        if (!enrollment) {
            return res.status(403).json({ error: 'You are not enrolled in this course.' });
        }

        // Find and update progress
        const progress = await Progress.findOneAndUpdate(
            { student: studentId, lesson: lessonId },
            { 
                status: 'completed',
                course: lesson.course, // Ensure course is set for older documents
                completedAt: new Date(),
                lastAccessed: new Date()
            },
            { new: true, upsert: true }
        );

        // Recalculate course progress percentage to return to frontend
        const userProgress = await Progress.find({ student: studentId, course: lesson.course });
        const allLessons = await Lesson.find({ course: lesson.course });
        
        const completedCount = userProgress.filter(p => p.status === 'completed').length;
        const totalLessonsCount = allLessons.length;
        const progressPercentage = totalLessonsCount === 0 ? 0 : Math.round((completedCount / totalLessonsCount) * 100);

        res.json({
            success: true,
            progress,
            progressPercentage
        });

    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update progress.' });
    }
};
