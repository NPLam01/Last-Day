import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Avatar, 
  Tag, 
  Space, 
  Popconfirm, 
  message, 
  Typography,
  Input
} from 'antd';
import { 
  UserOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { userAPI } from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import type { ColumnsType } from 'antd/es/table';
import './Users.css';

const { Title } = Typography;
const { Search } = Input;

const Users: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [editingEmailUserId, setEditingEmailUserId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const { user: currentUser, getUsers, refreshUsers } = useAuth();
  const users = getUsers();

  useEffect(() => {
    const initUsers = async () => {
      try {
        setLoading(true);
        await refreshUsers();
      } catch (error) {
        message.error('Không thể tải danh sách người dùng');
      } finally {
        setLoading(false);
      }
    };

    initUsers();
  }, [refreshUsers]);

  const handleDeleteUser = async (userId: string) => {
    try {
      await userAPI.deleteUser(userId);
      message.success('Đã xóa người dùng thành công');
      await refreshUsers(); // Refresh the cached data after deletion
    } catch (error) {
      message.error('Không thể xóa người dùng');
    }
  };

  const handleEmailClick = (user: User) => {
    if (currentUser?.role === 'admin') {
      setEditingEmailUserId(user._id);
      setTempEmail(user.email);
    }
  };

  const handleEmailSave = async (userId: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempEmail)) {
      message.error('Email không hợp lệ');
      return;
    }

    try {
      await userAPI.updateUser(userId, { email: tempEmail });
      await refreshUsers(); // Refresh the cached data after update
      message.success('Cập nhật email thành công');
      setEditingEmailUserId(null);
      setTempEmail('');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật email');
    }
  };

  const handleEmailCancel = () => {
    setEditingEmailUserId(null);
    setTempEmail('');
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent, userId: string) => {
    if (e.key === 'Enter') {
      handleEmailSave(userId);
    } else if (e.key === 'Escape') {
      handleEmailCancel();
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<User> = [
    {
      title: 'Avatar',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 80,
      render: (avatar: string) => (
        <Avatar 
          size="large" 
          icon={<UserOutlined />} 
          src={avatar}
          className="user-avatar"
        />
      ),
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: (email: string, record: User) => {
        if (editingEmailUserId === record._id && currentUser?.role === 'admin') {
          return (
            <Input
              value={tempEmail}
              onChange={(e) => setTempEmail(e.target.value)}
              onBlur={() => handleEmailSave(record._id)}
              onKeyDown={(e) => handleEmailKeyPress(e, record._id)}
              style={{ 
                width: '100%', 
                border: '1px solid #1890ff',
                borderRadius: '4px',
                boxShadow: '0 0 4px rgba(24, 144, 255, 0.2)'
              }}
              placeholder="Nhập email..."
              autoFocus
            />
          );
        }
        
        return (
          <span
            onClick={() => handleEmailClick(record)}
            style={{
              cursor: currentUser?.role === 'admin' ? 'pointer' : 'default',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              display: 'block'
            }}
            className={currentUser?.role === 'admin' ? 'editable-email' : ''}
            title={currentUser?.role === 'admin' ? 'Click để chỉnh sửa email • Enter để lưu • Esc để hủy' : ''}
          >
            {email}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isOnline',
      key: 'isOnline',
      width: 120,
      render: (isOnline: boolean) => (
        <Tag 
          icon={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={isOnline ? 'success' : 'default'}
        >
          {isOnline ? 'Online' : 'Offline'}
        </Tag>
      ),
      filters: [
        { text: 'Online', value: true },
        { text: 'Offline', value: false },
      ],
      onFilter: (value, record) => record.isOnline === value,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? 'Admin' : 'User'}
        </Tag>
      ),
      filters: [
        { text: 'Admin', value: 'admin' },
        { text: 'User', value: 'user' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Hoạt động cuối',
      dataIndex: 'lastActive',
      key: 'lastActive',
      width: 150,
      render: (lastActive: string) => {
        if (!lastActive) return '-';
        return new Date(lastActive).toLocaleString('vi-VN');
      },
      sorter: (a, b) => {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 120,
      render: (_, record: User) => (
        <Space>
          {currentUser?.role === 'admin' && record._id !== currentUser._id && (
            <Popconfirm
              title="Xóa người dùng"
              description="Bạn có chắc chắn muốn xóa người dùng này?"
              onConfirm={() => handleDeleteUser(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okType="danger"
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                size="small"
                title="Xóa người dùng"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="users-page">
      <div className="users-header">
        <Title level={2}>Quản lý người dùng</Title>
        <div className="users-actions">
          <Search
            placeholder="Tìm kiếm theo tên hoặc email"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
      </div>

      <Card className="users-card">
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true,
            position: ['bottomLeft'],
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} người dùng`,
            size: "default"
          }}
          className="users-table"
          rowClassName={() => 'table-row'}
          bordered={false}
        />
      </Card>
    </div>
  );
};

export default Users;
