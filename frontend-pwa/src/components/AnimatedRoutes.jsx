import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './common/PageTransition';
import Layout from './common/Layout';
import Home from '../pages/Home';
import PublicHome from '../pages/PublicHome';
import Login from '../pages/Login';
import KakaoOAuth from '../components/auth/KakaoOAuth';
import Exam from '../pages/Exam';
import MyExams from '../pages/MyExams';
import NotFound from '../pages/NotFound';
import PrivateRoute from './common/PrivateRoute';
import WebSocketTest from './WebSocketTest';
// Admin pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import NFCTagManagement from '../pages/admin/NFCTagManagement';
import QueueMonitoring from '../pages/admin/QueueMonitoring';
import AnalyticsDashboard from '../pages/admin/AnalyticsDashboard';
import ChatbotTest from '../pages/ChatbotTest';
import MapTest from '../pages/MapTest';
import MapEditor from '../pages/MapEditor';

export default function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* 비로그인 사용자를 위한 홈 화면 - Layout 밖에 배치 */}
        <Route path="/" element={
          <PageTransition>
            <PublicHome />
          </PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition>
            <Login />
          </PageTransition>
        } />
        <Route path="/oauth/kakao" element={
          <PageTransition>
            <KakaoOAuth />
          </PageTransition>
        } />
        <Route path="/chatbot-test" element={
          <PageTransition>
            <ChatbotTest />
          </PageTransition>
        } />
        <Route path="/map-test" element={
          <PageTransition>
            <MapTest />
          </PageTransition>
        } />
        <Route path="/map-editor" element={
          <PageTransition>
            <MapEditor />
          </PageTransition>
        } />
        {/* Public NFC route - no authentication required */}
        <Route path="/nfc/:tagId" element={
          <PageTransition>
            <Home />
          </PageTransition>
        } />
        
        <Route element={<Layout />}>
          {/* 로그인 사용자를 위한 홈 화면 */}
          <Route path="/home" element={
            <PrivateRoute>
              <PageTransition>
                <Home />
              </PageTransition>
            </PrivateRoute>
          } />
          <Route path="/exam/:examId" element={
            <PrivateRoute>
              <PageTransition>
                <Exam />
              </PageTransition>
            </PrivateRoute>
          } />
          <Route path="/my-exams" element={
            <PrivateRoute>
              <PageTransition>
                <MyExams />
              </PageTransition>
            </PrivateRoute>
          } />
          
          {/* Admin Dashboard routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <PageTransition>
                <AdminDashboard />
              </PageTransition>
            </PrivateRoute>
          } />
          <Route path="/dashboard/nfc-tags" element={
            <PrivateRoute>
              <PageTransition>
                <NFCTagManagement />
              </PageTransition>
            </PrivateRoute>
          } />
          <Route path="/dashboard/queue-monitoring" element={
            <PrivateRoute>
              <PageTransition>
                <QueueMonitoring />
              </PageTransition>
            </PrivateRoute>
          } />
          <Route path="/dashboard/analytics" element={
            <PrivateRoute>
              <PageTransition>
                <AnalyticsDashboard />
              </PageTransition>
            </PrivateRoute>
          } />
          
          {/* Test routes */}
          <Route path="/ws-test" element={
            <PageTransition>
              <WebSocketTest />
            </PageTransition>
          } />
        </Route>
        
        {/* 404 페이지는 항상 마지막에 */}
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
}