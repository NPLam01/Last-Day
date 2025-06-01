const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const middlewareController = require('../controllers/middlewareController');

// Send message
router.post('/send', middlewareController.verifyToken, chatController.sendMessage);

// Get conversation with specific user
router.get('/conversation/:userId', middlewareController.verifyToken, chatController.getConversation);

// Get all conversations
router.get('/conversations', middlewareController.verifyToken, chatController.getConversations);

// Mark messages as read
router.post('/read', middlewareController.verifyToken, chatController.markAsRead);

// Get unread message count
router.get('/unread-count', middlewareController.verifyToken, chatController.getUnreadCount);

// Get users available for chat
router.get('/users', middlewareController.verifyToken, chatController.getChatUsers);

module.exports = router;
