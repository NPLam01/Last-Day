import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  // Thông tin cơ bản của task
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  // Trạng thái và thời gian
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  receivedAt: { type: Date },
  proofUrl: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
