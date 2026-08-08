const aiTutorService = require('../services/aiTutorService');

exports.chat = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { message, conversationId, contextParams, stream } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            try {
                const streamGenerator = await aiTutorService.processMessageStream(
                    userId,
                    role,
                    message,
                    conversationId,
                    contextParams || {}
                );

                for await (const chunk of streamGenerator) {
                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
            } catch (streamError) {
                console.error("AI Controller Stream Error:", streamError);
                res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message || 'Stream error' })}\n\n`);
                res.end();
            }
        } else {
            const response = await aiTutorService.processMessage(
                userId,
                role,
                message,
                conversationId,
                contextParams || {}
            );

            res.json({
                success: true,
                conversationId: response.conversationId,
                message: response.message
            });
        }
    } catch (error) {
        console.error("AI Controller Error:", error);
        res.status(500).json({
            success: false,
            error: `API Error: ${error.message || 'Unknown error'}. Check terminal for details.`
        });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await aiTutorService.getConversations(userId);
        res.json({ success: true, conversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ success: false, error: "Failed to fetch history" });
    }
};

exports.getConversationMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;
        const messages = await aiTutorService.getConversationMessages(conversationId, userId);
        res.json({ success: true, messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
};
