import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import {
  getTasks,
  createTask,
  updateTask,
  uploadProof
} from '../controllers/taskController.js';

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});
const upload = multer({ storage });

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.post('/:id/upload', upload.single('file'), uploadProof);

export default router;