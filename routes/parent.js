const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/dashboard', requireAuth, requireRole('parent'), (req, res) => {
    res.send(`<h1>Parent Dashboard</h1><p>Welcome, ${req.user.firstName}</p><a href="/logout">Logout</a>`);
});

module.exports = router;
