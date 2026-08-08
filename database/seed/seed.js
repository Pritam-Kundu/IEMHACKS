const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' }); // Adjust path if needed based on execution context
const User = require('../../models/User');
const Subject = require('../../models/Subject');
const Course = require('../../models/Course');
const Lesson = require('../../models/Lesson');
const db = require('../../config/db');

const seedData = async () => {
    try {
        await db();
        
        console.log('Clearing old data...');
        // CAUTION: This will delete data. Only use in development!
        await User.deleteMany();
        await Subject.deleteMany();
        await Course.deleteMany();
        await Lesson.deleteMany();
        
        console.log('Creating Subject...');
        const mathSubject = await Subject.create({
            name: 'Mathematics',
            description: 'Core concepts of algebra and geometry.',
            icon: 'fas fa-calculator',
            colorCode: '#ef4444' // red-500
        });

        console.log('Creating Admin/Teacher User...');
        const teacher = await User.create({
            firebaseUid: 'dev_teacher_uid_123',
            email: 'teacher@edtech.local',
            role: 'teacher',
            name: 'John Doe',
            password: 'password123' // Added password since it's required now for local auth, though the schema has select: false. Wait, password is required in auth logic, but not in schema (schema has select: false, no required true). Let's just omit it or add a hash. I'll omit it since local auth handles requirement.
        });

        console.log('Creating Course...');
        const course = await Course.create({
            title: 'Algebra 101',
            description: 'Introduction to basic algebra.',
            subject: mathSubject._id,
            teacher: teacher._id,
            level: 'beginner',
            isPublished: true,
            tags: ['algebra', 'math', 'basics']
        });

        console.log('Creating Lesson...');
        await Lesson.create({
            course: course._id,
            title: 'Variables and Expressions',
            description: 'Learn what variables are.',
            content: '<p>A variable is a letter or symbol that represents a number.</p>',
            order: 1,
            durationMinutes: 15
        });

        console.log('Seed completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
