import React from 'react';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import CreatePostPage from './pages/CreatePostPage';
import PostsFeedPage from './pages/PostsFeedPage';
import PostDetailsPage from './pages/PostDetailsPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';

interface RouteItem {
  path: string;
  name: string;
  element: React.ReactElement;
  visible?: boolean;
}

const wrap = (node: React.ReactElement) => <Layout>{node}</Layout>;

const routes: RouteItem[] = [
  { path: '/', name: 'Accueil', element: wrap(<HomePage />) },
  { path: '/posts', name: 'Posts', element: wrap(<PostsFeedPage />) },
  { path: '/posts/new', name: 'Créer un post', element: wrap(<CreatePostPage />), visible: false },
  { path: '/posts/:id', name: 'Détail du post', element: wrap(<PostDetailsPage />), visible: false },
  { path: '/profile', name: 'Profil', element: wrap(<ProfilePage />) },
  { path: '/profile/edit', name: 'Modifier profil', element: wrap(<EditProfilePage />), visible: false },
  { path: '/messages', name: 'Messages', element: wrap(<MessagesPage />) },
  { path: '/notifications', name: 'Notifications', element: wrap(<NotificationsPage />) },
  { path: '/admin', name: 'Admin', element: wrap(<AdminDashboardPage />), visible: false },
  { path: '/login', name: 'Connexion', element: wrap(<LoginPage />), visible: false },
  { path: '/register', name: 'Inscription', element: wrap(<RegisterPage />), visible: false },
  { path: '/forgot', name: 'Mot de passe oublié', element: wrap(<ForgotPasswordPage />), visible: false },
  { path: '/reset', name: 'Réinitialiser', element: wrap(<ResetPasswordPage />), visible: false },
];

export default routes;
