require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const Lesson = require('./models/Lesson');

// Note: Lesson model exists, we just need a dummy lesson ID to attach to
async function seedData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edusmart');
        console.log('Connected to MongoDB');

        // Clean existing
        await Quiz.deleteMany({ title: "Java Fundamentals" });
        
        // Ensure there is at least one lesson to attach to
        let lesson = await Lesson.findOne();
        if (!lesson) {
            // Need a dummy course first based on Course schema
            // We'll bypass strict relations for a quick test seed by just creating a raw lesson document
            lesson = await Lesson.create({
                course: new mongoose.Types.ObjectId(), // Fake course ID
                title: "Introduction to Java",
                content: "Dummy content",
                order: 1
            });
        }

        const quiz = await Quiz.create({
            lesson: lesson._id,
            title: "Java Fundamentals",
            description: "Test your knowledge of basic Java concepts, syntax, and object-oriented principles.",
            passingScore: 60,
            timeLimitMinutes: 10
        });

        console.log('Quiz created:', quiz._id);

        await Question.insertMany([
            {
                quiz: quiz._id,
                questionText: "Which of the following is not a Java primitive type?",
                options: [
                    { text: "int", isCorrect: false },
                    { text: "String", isCorrect: true },
                    { text: "boolean", isCorrect: false },
                    { text: "char", isCorrect: false }
                ],
                explanation: "String is an object (reference type) in Java, not a primitive type. Primitive types include int, boolean, char, byte, short, long, float, and double."
            },
            {
                quiz: quiz._id,
                questionText: "What is the entry point of a Java program?",
                options: [
                    { text: "public void main(String args[])", isCorrect: false },
                    { text: "static void main(String args[])", isCorrect: false },
                    { text: "public static void main(String[] args)", isCorrect: true },
                    { text: "void start()", isCorrect: false }
                ],
                explanation: "The JVM looks for the exact signature: public static void main(String[] args) to start the application."
            },
            {
                quiz: quiz._id,
                questionText: "Which keyword is used to inherit a class in Java?",
                options: [
                    { text: "implements", isCorrect: false },
                    { text: "inherits", isCorrect: false },
                    { text: "extends", isCorrect: true },
                    { text: "super", isCorrect: false }
                ],
                explanation: "The 'extends' keyword is used for class inheritance, whereas 'implements' is used for interfaces."
            }
        ]);

        console.log('Questions seeded successfully!');
        console.log(`\n\n--> TEST URL: http://localhost:3000/quiz/${quiz._id}\n\n`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedData();
