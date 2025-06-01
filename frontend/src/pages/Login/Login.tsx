import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { LoginFormData } from '../../types';
import './Login.css';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onFinish = async (values: LoginFormData) => {
    if (loading) return; // Prevent multiple submissions
    setLoading(true);
      try {
      const response = await authAPI.login(values);
      if (!response.accessToken) {
        throw new Error('Token không hợp lệ');
      }
      await login(response, response.accessToken);
      message.success('Đăng nhập thành công!');
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = 
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập!';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <Card className="login-card">
          <div className="login-header">
            <img src="/logo-evine.png" alt="Evine Logo" className="login-logo" />
            <Title level={2} className="login-title">Đăng nhập</Title>
            <Text type="secondary">Chào mừng bạn quay trở lại!</Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            className="login-form"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
                { min: 6, message: 'Tên đăng nhập phải có ít nhất 6 ký tự!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Tên đăng nhập"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Mật khẩu"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="login-button"
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <Space>
              <Text type="secondary">Chưa có tài khoản?</Text>
              <Button type="link" href="/register">
                Đăng ký ngay
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
