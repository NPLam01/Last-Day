import React, { useState, useEffect } from "react";
import TaskDisplayPage, { Task } from "../../Components/Tasks/TaskDisplayPage";
import { Spin, message, Empty } from "antd";
import TaskService from "../../services/TaskService";
import { useAuth } from "../../contexts/AuthContext";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, token, isAuthenticated } = useAuth();

  const fetchTasks = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const res = await TaskService.getTasksByUserId(user._id, token);
      if (res.data) {
        setTasks(res.data);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải task:", err);
      message.error(err.message || "Không thể tải danh sách task. Vui lòng thử lại sau.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchTasks();
    }
  }, [user?._id]);

  if (!isAuthenticated || !user) {
    return <Empty description="Vui lòng đăng nhập để xem danh sách task" />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "white", padding: 32 }}>
      {loading ? (
        <Spin />
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {tasks.map((t) => (
            <TaskDisplayPage key={t._id} task={t} onUpdated={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
