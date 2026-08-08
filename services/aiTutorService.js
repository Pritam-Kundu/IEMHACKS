const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');
const StudentProfile = require('../models/StudentProfile');
const ParentProfile = require('../models/ParentProfile');
const User = require('../models/User');
const Progress = require('../models/Progress');
const geminiService = require('./geminiService');

const STUDENT_SYSTEM_PROMPT = `You are EduSmart AI, a friendly and patient educational tutor.
Your goal is to help students understand concepts rather than simply providing answers.
Explain difficult concepts in simple language.
Adapt explanations to the student's level.
Use:
- simple explanations
- examples
- analogies
- step-by-step reasoning
- short summaries
- practice questions when useful
If a student asks a homework or quiz question, guide them toward understanding.
Do not unnecessarily overwhelm beginners with advanced terminology.
If the question is ambiguous, ask a short clarifying question.
Never claim to know information that you do not know.
For mathematical/scientific questions, show the relevant steps clearly.
When useful, end with a short "Quick Check" question to test understanding.`;

const PARENT_SYSTEM_PROMPT = `You are EduSmart AI, an educational assistant helping parents understand their child's learning.
Explain academic information in simple language.
You should help parents understand:
- How their child is performing
- Which subjects need attention
- What their child should study next
- Why their child is struggling
- How they can help with a topic
- What quiz results mean
- What learning habits they should improve
Do not invent academic data. If data is unavailable, state that you don't have enough learning data to determine that yet.`;

const TEACHER_SYSTEM_PROMPT = `You are EduSmart AI, an educational assistant helping teachers with their workflow.
You can help teachers with:
- Lesson planning and curriculum design
- Creating grading rubrics
- Generating practice questions and quizzes
- Explaining educational strategies and pedagogies
- Analyzing student performance trends (conceptually)
Keep your answers professional, concise, and pedagogical.`;

const getStudentContext = async (userId) => {
    const profile = await StudentProfile.findOne({ user: userId });
    let contextStr = `Student Information:\n`;
    if (profile) {
        contextStr += `Grade Level: ${profile.gradeLevel || 'Unknown'}\n`;
        contextStr += `Recommended Difficulty: ${profile.recommendedDifficulty || 'intermediate'}\n`;
    }
    
    // Add brief progress summary
    const progress = await Progress.find({ student: userId }).populate('course', 'title').limit(5);
    if (progress && progress.length > 0) {
        contextStr += `\nRecent Progress:\n`;
        progress.forEach(p => {
            contextStr += `- Course: ${p.course ? p.course.title : 'Unknown'}, Completed Lessons: ${p.completedLessons.length}, Quiz Avg: ${p.quizScores ? p.quizScores.reduce((a, b) => a + b.score, 0) / (p.quizScores.length || 1) : 'N/A'}%\n`;
        });
    }
    return contextStr;
};

const getParentContext = async (parentId, childId) => {
    if (!childId) {
        throw new Error("Child ID is required for parent inquiries.");
    }
    
    const parentProfile = await ParentProfile.findOne({ user: parentId });
    if (!parentProfile || !parentProfile.children.includes(childId)) {
        throw new Error("Unauthorized to access this child's data.");
    }

    const childUser = await User.findById(childId);
    let contextStr = `Parent is inquiring about their child: ${childUser ? childUser.name : 'Unknown'}.\n`;
    
    // Retrieve child's context
    const childContext = await getStudentContext(childId);
    contextStr += childContext;
    
    return contextStr;
};

const getTeacherContext = async (userId) => {
    const user = await User.findById(userId);
    return `Teacher Information:\nName: ${user ? user.name : 'Unknown'}\nRole: Teacher`;
};

/**
 * Handle a chat message and generate a response
 */
const processMessage = async (userId, role, messageText, conversationId = null, contextParams = {}) => {
    let conversation;
    
    // 1. Resolve or Create Conversation
    if (conversationId) {
        conversation = await AIConversation.findById(conversationId);
        if (!conversation) throw new Error("Conversation not found");
        // Verify ownership
        if (conversation.user.toString() !== userId.toString()) {
            throw new Error("Unauthorized to access this conversation");
        }
    } else {
        conversation = new AIConversation({
            user: userId,
            title: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : ''),
            context: role,
            selectedStudent: contextParams.studentId || null,
            course: contextParams.courseId || null,
            lesson: contextParams.lessonId || null
        });
        await conversation.save();
    }

    // 2. Fetch History (Limit to last 10 messages to save context window)
    const history = await AIMessage.find({ conversation: conversation._id })
                                   .sort({ sentAt: 1 }) // Chronological
                                   .limit(10);

    // 3. Save User Message
    const userMessage = new AIMessage({
        conversation: conversation._id,
        sender: 'user',
        content: messageText
    });
    await userMessage.save();

    // 4. Build Context & System Prompt
    let systemInstruction = role === 'teacher' ? TEACHER_SYSTEM_PROMPT : (role === 'parent' ? PARENT_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT);
    let dataContext = '';

    try {
        if (role === 'student') {
            dataContext = await getStudentContext(userId);
        } else if (role === 'parent') {
            dataContext = await getParentContext(userId, conversation.selectedStudent || contextParams.studentId);
        } else if (role === 'teacher') {
            dataContext = await getTeacherContext(userId);
        }
        
        // Append context to system instruction
        systemInstruction += `\n\n--- Context Data ---\n${dataContext}`;
    } catch (err) {
        console.warn("Could not fetch full context data:", err.message);
    }

    // 5. Generate AI Response
    const aiResponseText = await geminiService.generateResponse(history, messageText, systemInstruction);

    // 6. Save AI Message
    const aiMessage = new AIMessage({
        conversation: conversation._id,
        sender: 'ai',
        content: aiResponseText
    });
    await aiMessage.save();

    return {
        conversationId: conversation._id,
        message: aiResponseText
    };
};

const processMessageStream = async function* (userId, role, messageText, conversationId = null, contextParams = {}) {
    let conversation;
    
    if (conversationId) {
        conversation = await AIConversation.findById(conversationId);
        if (!conversation) throw new Error("Conversation not found");
        if (conversation.user.toString() !== userId.toString()) {
            throw new Error("Unauthorized to access this conversation");
        }
    } else {
        conversation = new AIConversation({
            user: userId,
            title: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : ''),
            context: role,
            selectedStudent: contextParams.studentId || null,
            course: contextParams.courseId || null,
            lesson: contextParams.lessonId || null
        });
        await conversation.save();
    }

    const history = await AIMessage.find({ conversation: conversation._id })
                                   .sort({ sentAt: 1 })
                                   .limit(10);

    const userMessage = new AIMessage({
        conversation: conversation._id,
        sender: 'user',
        content: messageText
    });
    await userMessage.save();

    let systemInstruction = role === 'teacher' ? TEACHER_SYSTEM_PROMPT : (role === 'parent' ? PARENT_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT);
    let dataContext = '';

    try {
        if (role === 'student') {
            dataContext = await getStudentContext(userId);
        } else if (role === 'parent') {
            dataContext = await getParentContext(userId, conversation.selectedStudent || contextParams.studentId);
        } else if (role === 'teacher') {
            dataContext = await getTeacherContext(userId);
        }
        systemInstruction += `\n\n--- Context Data ---\n${dataContext}`;
    } catch (err) {
        console.warn("Could not fetch full context data:", err.message);
    }

    const responseStream = await geminiService.generateResponseStream(history, messageText, systemInstruction);
    
    yield { type: 'meta', conversationId: conversation._id };

    let fullResponse = "";
    for await (const chunk of responseStream) {
        if (chunk.text) {
            fullResponse += chunk.text;
            yield { type: 'chunk', text: chunk.text };
        }
    }

    const aiMessage = new AIMessage({
        conversation: conversation._id,
        sender: 'ai',
        content: fullResponse
    });
    await aiMessage.save();
};

const getConversations = async (userId) => {
    return await AIConversation.find({ user: userId }).sort({ updatedAt: -1 }).limit(20);
};

const getConversationMessages = async (conversationId, userId) => {
    const conversation = await AIConversation.findById(conversationId);
    if (!conversation || conversation.user.toString() !== userId.toString()) {
        throw new Error("Conversation not found or unauthorized");
    }
    return await AIMessage.find({ conversation: conversationId }).sort({ sentAt: 1 });
};

module.exports = {
    processMessage,
    processMessageStream,
    getConversations,
    getConversationMessages
};
