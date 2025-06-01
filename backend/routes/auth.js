const authController = require('../controllers/authController');
const middlewareController = require('../controllers/middlewareController');
const { verifyToken } = require('../controllers/middlewareController');

const router = require('express').Router();

//Register
router.post("/register", authController.registerUser);

//Login
router.post("/login", authController.loginUser);

//Get current user
router.get("/me", middlewareController.verifyToken, authController.getCurrentUser);

//Test endpoint
router.get("/test", middlewareController.verifyToken, (req, res) => {
  res.status(200).json({ message: "Authentication successful", user: req.user });
});

//REFRESH 
router.post("/refresh", authController.requestRefreshToken);

//LOGOUT
router.post("/logout", middlewareController.verifyToken, authController.userLogout);

//LOGOUT (fallback without auth - just clear cookies)
router.post("/logout-simple", authController.simpleLogout);

//HEARTBEAT - Update user's last active status
router.post("/heartbeat", middlewareController.verifyToken, authController.heartbeat);

module.exports = router;