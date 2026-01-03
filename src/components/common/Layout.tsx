import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { useLanguage } from '../../context/LanguageContext';
import { Toaster } from '../ui/sonner';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();

  return (
    <div className={`min-h-screen bg-slate-50 pb-20 md:pb-0 app-shell ${language === 'ar' ? 'rtl-mode' : ''}`}>
      <Header />
      <main className="container-balanced py-6 space-y-6">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
};

export default Layout;
