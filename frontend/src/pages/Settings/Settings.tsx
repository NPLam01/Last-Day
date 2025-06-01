import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Avatar, 
  Upload, 
  Row, 
  Col, 
  Typography, 
  Divider,
  DatePicker,
  Select,
  Space,
  App
} from 'antd';
import { 
  UserOutlined, 
  SaveOutlined, 
  LockOutlined,
  CameraOutlined,
  PhoneOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import { User } from '../../types';
import dayjs from 'dayjs';
import './Settings.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  return (
    <App>
      <SettingsContent />
    </App>
  );
};

const SettingsContent: React.FC = () => {
  const { user, login, token } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData(user);
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        gender: user.gender || '',
        birthDate: user.birthDate ? dayjs(user.birthDate) : null,
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user, form]);

  const handleAvatarChange = async (info: any) => {
    if (info.file.status === 'uploading') {
      setAvatarLoading(true);
      return;
    }

    if (info.file.status === 'done' || info.file.originFileObj) {
      const file = info.file.originFileObj || info.file;
      
      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        message.error('Kích thước ảnh không được vượt quá 1MB!');
        setAvatarLoading(false);
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          await userAPI.updateProfile({ avatar: base64 });
          
          // Update user context
          if (user) {
            const updatedUser = { ...user, avatar: base64 };
            login(updatedUser, token!);
            setProfileData(updatedUser);
          }
          
          message.success('Cập nhật avatar thành công!');
        } catch (error) {
          message.error('Không thể cập nhật avatar!');
        } finally {
          setAvatarLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const handleProfileUpdate = async (values: any) => {
    try {
      setLoading(true);
      
      // Prepare update data with all available fields
      const updateData: any = {
        username: values.username,
        gender: values.gender,
        birthDate: values.birthDate ? values.birthDate.toISOString() : null,
        phone: values.phone,
        address: values.address
      };

      // Only admin can update email
      if (user?.role === 'admin') {
        updateData.email = values.email;
      }

      // Handle password update if provided
      if (values.password && values.password.trim()) {
        updateData.password = values.password;
      }

      await userAPI.updateProfile(updateData);
      
      // Update user context (exclude password from context)
      if (user) {
        const updatedUser = { ...user, ...updateData };
        delete updatedUser.password; // Don't store password in context
        login(updatedUser, token!);
        setProfileData(updatedUser);
      }
      
      message.success('Cập nhật thông tin thành công!');
      
      // Clear password field after successful update
      if (values.password) {
        form.setFieldValue('password', '');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật thông tin!');
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Chỉ được tải lên file ảnh!');
      return false;
    }
    
    const isLt1M = file.size / 1024 / 1024 < 1;
    if (!isLt1M) {
      message.error('Kích thước ảnh phải nhỏ hơn 1MB!');
      return false;
    }
    
    return true;
  };

  if (!profileData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <Title level={2}>
          <UserOutlined /> Cài đặt tài khoản
        </Title>
        <Text type="secondary">
          Quản lý thông tin cá nhân và cài đặt tài khoản của bạn
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card className="avatar-card">
            <div className="avatar-section">
              <Avatar
                size={120}
                src={profileData.avatar}
                icon={<UserOutlined />}
                className="user-avatar"
              />
              <Upload
                name="avatar"
                showUploadList={false}
                beforeUpload={beforeUpload}
                onChange={handleAvatarChange}
                accept="image/*"
              >
                <Button 
                  icon={<CameraOutlined />} 
                  loading={avatarLoading}
                  className="upload-btn"
                >
                  Thay đổi ảnh đại diện
                </Button>
              </Upload>              <div className="user-info">
                <Text type="secondary">
                  Vai trò: {profileData.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Thông tin cá nhân" className="profile-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileUpdate}
              requiredMark={false}
            >              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Tên đăng nhập"
                    name="username"
                    rules={[
                      { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
                      { min: 6, message: 'Tên đăng nhập phải có ít nhất 6 ký tự!' },
                      { max: 20, message: 'Tên đăng nhập không được vượt quá 20 ký tự!' }
                    ]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="Nhập tên đăng nhập"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="Nhập email"
                      disabled={user?.role !== 'admin'}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Giới tính"
                    name="gender"
                  >
                    <Select placeholder="Chọn giới tính" allowClear>
                      <Option value="male">Nam</Option>
                      <Option value="female">Nữ</Option>
                      <Option value="other">Khác</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Ngày sinh"
                    name="birthDate"
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      placeholder="Chọn ngày sinh"
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Số điện thoại"
                    name="phone"
                    rules={[
                      {
                        pattern: /^[0-9]{10,11}$/,
                        message: 'Số điện thoại phải có 10-11 chữ số!'
                      }
                    ]}
                  >
                    <Input 
                      prefix={<PhoneOutlined />} 
                      placeholder="Nhập số điện thoại"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Quê quán"
                    name="address"
                    rules={[
                      {
                        max: 200,
                        message: 'Quê quán không được vượt quá 200 ký tự!'
                      }
                    ]}
                  >
                    <Input 
                      prefix={<EnvironmentOutlined />} 
                      placeholder="Nhập quê quán"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    label="Mật khẩu"
                    name="password"
                    help="Để trống nếu không muốn thay đổi mật khẩu"
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="Nhập mật khẩu mới (tùy chọn)"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                    size="large"
                  >
                    Lưu thay đổi
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
