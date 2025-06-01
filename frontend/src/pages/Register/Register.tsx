import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { RegisterFormData } from '../../types';
import './Register.css';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();  const onFinish = async (values: RegisterFormData) => {
    try {
      setLoading(true);
      // Remove confirmPassword before sending to server
      const { confirmPassword: _, ...registerData } = values;
      await authAPI.register(registerData);
      message.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error(error.response?.data?.message);
      } else {
        message.error(
          error.response?.data?.message || 
          'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!'
        );
      }
      console.error('Register error:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        <Card className="register-card">
          <div className="register-header">
            <img src="/logo-evine.png" alt="Evine Logo" className="register-logo" />
            <Title level={2} className="register-title">Đăng ký</Title>
            <Text type="secondary">Tạo tài khoản mới!</Text>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            size="large"
            className="register-form"
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
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Vui lòng nhập email hợp lệ!' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
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

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Xác nhận mật khẩu"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="register-button"
                loading={loading}
                block
              >
                Đăng ký
              </Button>
            </Form.Item>

            <div className="login-link">
              Đã có tài khoản? <Link to="/login">Đăng nhập ngay!</Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
