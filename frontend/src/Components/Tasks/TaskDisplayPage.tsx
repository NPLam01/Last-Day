import React, { useState } from "react";
import { Card, Typography, Button, Space, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import TaskService from "../../services/TaskService";
import { useAuth } from "../../contexts/AuthContext";

const { Title, Paragraph } = Typography;

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  deadline: string;
  createdAt: string;
  status: "todo" | "in_progress" | "done";
  receivedAt?: string;
  proofUrl?: string;
}

const TaskDisplayPage: React.FC<{ task: Task; onUpdated: () => Promise<void> }> = ({ task, onUpdated }) => {
  const { token } = useAuth();
  const [status, setStatus] = useState(task.status);
  const [receivedAt, setReceivedAt] = useState<string | null>(task.receivedAt || null);
  const [proofUploaded, setProofUploaded] = useState(!!task.proofUrl);
  const [proofUrl, setProofUrl] = useState<string | null>(task.proofUrl || null);

  const handleReceive = async () => {
    if (status === "todo") {
      const now = new Date().toISOString();
      try {
        await TaskService.updateTask(task._id, { status: "in_progress", receivedAt: now }, token);
        setStatus("in_progress");
        setReceivedAt(now);
        onUpdated();
      } catch (error) {
        message.error("Không thể cập nhật trạng thái task.");
      }
    }
  };

  const handleComplete = async () => {
    if (status === "in_progress" && proofUploaded) {
      try {
        await TaskService.updateTask(task._id, { status: "done" }, token);
        setStatus("done");
        onUpdated();
      } catch (error) {
        message.error("Không thể hoàn thành task.");
      }
    }
  };

  const uploadProps = {
    beforeUpload: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await TaskService.uploadProof(task._id, formData, token);
        const uploadedUrl = res.data.url;

        await TaskService.updateTask(task._id, { proofUrl: uploadedUrl }, token);

        setProofUploaded(true);
        setProofUrl(uploadedUrl);
        message.success(`${file.name} đã được tải lên.`);
        onUpdated();
      } catch (error) {
        message.error("Lỗi khi tải minh chứng.");
      }
      return false;
    },
    showUploadList: false,
  };

  return (
    <Card title={<Title level={4}>{task.title}</Title>} style={{ maxWidth: 600 }}>
      <Paragraph><strong>Mô tả:</strong> {task.description}</Paragraph>
      <Paragraph><strong>Người giao việc:</strong> {task.assignedBy}</Paragraph>

      {receivedAt && (
        <Paragraph><strong>Ngày nhận:</strong> {new Date(receivedAt).toLocaleString()}</Paragraph>
      )}

      <Paragraph><strong>Hạn chót:</strong> {new Date(task.deadline).toLocaleString()}</Paragraph>
      <Paragraph><strong>Ngày tạo:</strong> {new Date(task.createdAt).toLocaleString()}</Paragraph>

      <Space style={{ marginTop: 16 }}>
        {status === "todo" && (
          <Button type="primary" onClick={handleReceive}>Nhận</Button>
        )}

        {status === "in_progress" && (
          <>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Upload minh chứng</Button>
            </Upload>
            <Button
              type="primary"
              onClick={handleComplete}
              disabled={!proofUploaded}
            >
              Hoàn thành
            </Button>
          </>
        )}

        {status === "done" && (
          <Paragraph><strong>Trạng thái:</strong> Hoàn thành</Paragraph>
        )}
      </Space>

      {proofUrl && (
        <Paragraph style={{ marginTop: 12 }}>
          <strong>Minh chứng:</strong><br />
          <img src={proofUrl} alt="Proof" style={{ maxWidth: "100%", maxHeight: 200 }} />
        </Paragraph>
      )}
    </Card>
  );
};

export default TaskDisplayPage;
