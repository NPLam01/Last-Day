export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  lastActive?: Date;
  role: string; // Make role required since it's always provided from backend
  admin?: boolean; // Keep for backward compatibility but use role instead
  gender?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (response: any, token: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  refreshUserData: () => Promise<void>;
  getUsers: () => User[];
  refreshUsers: () => Promise<User[]>;
  clearCache: () => void;
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string; // Make confirmPassword optional so we can omit it when sending to server
}

export interface MessageUser {
  _id: string;
  username: string;
  avatar?: string;
}

export interface Message {
  _id: string;
  sender: string | User | MessageUser;
  receiver: string | User | MessageUser;
  content: string;
  messageType: 'text' | 'image';
  timestamp: Date;
  isRead: boolean;
  readAt?: Date;
  status?: 'sending' | 'sent' | 'error';
}
