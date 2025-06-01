import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import useResponsive from '../../hooks/useResponsive';
import './MainLayout.css';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = useResponsive();

  const handleCollapse = (collapsed: boolean) => {
    setCollapsed(collapsed);
  };

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
      setMobileMenuOpen(false);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };  return (
    <Layout className="main-layout">      <Sidebar 
        collapsed={collapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapse={handleCollapse}
      />
      <Layout className={`layout-content ${collapsed ? 'collapsed' : ''}`}>        <div className="header-wrapper">
          <Header />
        </div>
        <Content className="content">
          <div className="content-wrapper">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
