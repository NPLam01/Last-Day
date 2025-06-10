import express from 'express';
import * as middlewareController from '../controllers/middlewareController.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// Public routes
router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Protected routes
router.get('/', middlewareController.verifyAdmin, userController.getAllUsers);
router.get('/me', middlewareController.verifyToken, userController.getCurrentUser);
router.get('/:id', middlewareController.verifyAdmin, userController.getUserById);

// Admin routes
router.put('/:id', middlewareController.verifyAdmin, userController.updateUserByAdmin);
router.delete('/:id', middlewareController.verifyAdmin, userController.deleteUser);

// User profile routes
router.put('/profile', middlewareController.verifyToken, userController.updateProfile);

export default router;