import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ProfileEditGuard from './components/common/ProfileEditGuard';
import HomePage from './pages/HomePage';
import PostsFeedPage from './pages/PostsFeedPage';
import PostDetailsPage from './pages/PostDetailsPage';
import CreatePostPage from './pages/CreatePostPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import MessagesPage from './pages/MessagesPage';
import ConversationPage from './pages/ConversationPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { LoginPage, SignupPage } from './pages/AuthPages';

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <div className="flex flex-col min-h-screen bg-slate-50">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <HomePage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/posts"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <PostsFeedPage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/posts/new"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <CreatePostPage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/posts/:id"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <PostDetailsPage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/messages"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <MessagesPage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/messages/:conversationId"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <ConversationPage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/notifications"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <NotificationsPage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/profile"
                element={(
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/profile/edit"
                element={(
                  <ProtectedRoute>
                    <ProfileEditGuard>
                      <Layout>
                        <EditProfilePage />
                      </Layout>
                    </ProfileEditGuard>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/admin"
                element={(
                  <ProtectedRoute>
                    <AdminRoute>
                      <Layout>
                        <AdminDashboardPage />
                      </Layout>
                    </AdminRoute>
                  </ProtectedRoute>
                )}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
