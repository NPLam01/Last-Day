import axios from "axios";
import { Task } from "../Components/Tasks/TaskDisplayPage";

const BASE_URL = "http://localhost:8000/v1"; // backend API URL

const getAuthHeader = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TaskService = {
    getTasksByUserId: async (userId: string, token: string | null) => {
      try {
        const response = await axios.get<{success: boolean; data: Task[]}>(
          `${BASE_URL}/tasks`, {
            params: { assignedTo: userId },
            headers: getAuthHeader(token),
          }
        );
        return response.data;
      } catch (error: any) {
        console.error('Error fetching tasks:', error);
        throw new Error(error.response?.data?.message || 'Error fetching tasks');
      }
    },
  
    createTask: async (task: Task, token: string | null) => {
      return axios.post<Task>(`${BASE_URL}/tasks`, task, {
        headers: getAuthHeader(token),
      });
    },
  
    updateTask: async (taskId: string, updates: Partial<Task>, token: string | null) => {
      return axios.patch(`${BASE_URL}/tasks/${taskId}`, updates, {
        headers: getAuthHeader(token),
      });
    },
  
    getAllTasks: async (token: string | null) => {
      return axios.get<Task[]>(`${BASE_URL}/tasks`, {
        headers: getAuthHeader(token),
      });
    },
  
    uploadProof: async (taskId: string, formData: FormData, token: string | null) => {
      return axios.post<{ url: string }>(`${BASE_URL}/tasks/${taskId}/upload`, formData, {
        headers: {
          ...getAuthHeader(token),
          "Content-Type": "multipart/form-data",
        },
      });
    },
  };  

export default TaskService;
