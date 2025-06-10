import Task from '../models/Task.js';
import path from 'path';

export const getTasks = async (req, res) => {
  try {
    const { assignedTo } = req.query;
    const query = assignedTo ? { assignedTo } : {};
    
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'username email')
      .populate('assignedBy', 'username email');

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createTask = async (req, res) => {
  try {
    const task = new Task(req.body);
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { status } = req.body;
    const taskId = req.params.id;

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Kiểm tra logic chuyển trạng thái
    if (status === 'in_progress' && task.status === 'todo') {
      // Khi nhấn nút "Nhận"
      task.status = 'in_progress';
      task.receivedAt = new Date();
    } else if (status === 'done' && task.status === 'in_progress') {
      // Kiểm tra đã có minh chứng chưa
      if (!task.proofUrl) {
        return res.status(400).json({
          success: false,
          message: 'Proof is required before completing the task'
        });
      }
      task.status = 'done';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition'
      });
    }

    await task.save();

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Kiểm tra trạng thái task
    if (task.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Task must be in progress to upload proof'
      });
    }

    // Cập nhật đường dẫn file minh chứng
    const fileUrl = `/uploads/${req.file.filename}`;
    task.proofUrl = fileUrl;
    await task.save();

    res.json({
      success: true,
      data: {
        url: fileUrl
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
