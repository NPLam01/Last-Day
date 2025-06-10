import express from 'express';
import * as chatController from '../controllers/chatController.js';
import * as middlewareController from '../controllers/middlewareController.js';

const router = express.Router();

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

export default router;
