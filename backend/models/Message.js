import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required'],
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required'],
    index: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  messageType: {
    type: String,
    enum: {
      values: ['text', 'image'],
      message: '{VALUE} is not supported'
    },
    default: 'text',
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  deletedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  // Thêm index cho các query phổ biến
  indexes: [
    { sender: 1, createdAt: -1 },
    { receiver: 1, createdAt: -1 },
    { isRead: 1 },
    { 'deletedBy.user': 1 }
  ]
});

// Thêm TTL index để tự động xóa tin nhắn cũ sau 30 ngày
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

export default mongoose.model('Message', messageSchema);
