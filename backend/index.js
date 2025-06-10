import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoute from './routes/auth.js';
import userRoute from './routes/user.js';
import chatRoute from './routes/chat.js';
import taskRoute from './routes/taskRoutes.js';
import User from './models/User.js';

dotenv.config();
const app = express();
const server = createServer(app);

// MongoDB Connection Options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000, // Timeout after 15 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

// MongoDB Connection with retry logic
const connectWithRetry = async (retryCount = 0, maxRetries = 5) => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, mongooseOptions);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectWithRetry(retryCount + 1, maxRetries);
    } else {
      console.error('Failed to connect to MongoDB after maximum retries');
      process.exit(1);
    }
  }
};

// Initialize MongoDB connection
connectWithRetry();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing Mongoose connection:', err);
    process.exit(1);
  }
});

// Initialize Socket.IO and make it globally available
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.100.81:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});
global.io = io;

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(actualToken, process.env.JWT_ACCESS_KEY);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error("Authentication error"));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('User connected:', socket.userId);

  try {
    // Update user's online status and last active time
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastActive: new Date()
    });
    
    // Broadcast user's online status
    socket.broadcast.emit('userOnline', socket.userId);
  } catch (error) {
    console.error('Error updating user status:', error);
  }

  // Handle joining user's room
  socket.join(socket.userId);

  // Handle messages
  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, content } = data;
      
      // Update sender's last active time
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
      
      // Emit to receiver
      io.to(receiverId).emit('newMessage', {
        _id: new mongoose.Types.ObjectId(),
        sender: socket.userId,
        receiver: receiverId,
        content,
        timestamp: new Date(),
        isRead: false
      });

      // Emit back to sender for confirmation
      socket.emit('messageConfirmed', {
        receiverId,
        content,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  // Handle typing status
  socket.on('typing', async ({ receiverId, isTyping }) => {
    try {
      // Update user's last active time
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
      
      io.to(receiverId).emit('userTyping', {
        userId: socket.userId,
        isTyping
      });
    } catch (error) {
      console.error('Error handling typing status:', error);
    }
  });

  // Handle heartbeat
  socket.on('heartbeat', async () => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.userId);
    try {
      await User.findByIdAndUpdate(socket.userId, {
        lastActive: new Date()
      });
      socket.broadcast.emit('userOffline', socket.userId);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware setup
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// API Routes with versioning
app.use('/v1/auth', authRoute);
app.use('/v1/user', userRoute);
app.use('/v1/chat', chatRoute);
app.use('/v1/tasks', taskRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Đã xảy ra lỗi server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint không tồn tại' });
});

// Set up interval to check for offline users every minute
import authController from './controllers/authController.js';
setInterval(() => {
  authController.checkOfflineUsers();
}, 60000); // Check every 60 seconds

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
