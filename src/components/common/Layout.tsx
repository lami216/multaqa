import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { useLanguage } from '../../context/LanguageContext';
import { Toaster } from '../ui/sonner';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();

  return (
    <div className={`min-h-screen pb-28 md:pb-0 app-shell ${language === 'ar' ? 'rtl-mode' : ''}`}>
      <Header />
      <main className="container-balanced space-y-6 py-5 sm:py-7">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
};

export default Layout;
