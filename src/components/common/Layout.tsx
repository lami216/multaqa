import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
    <Header />
    <main className="container-balanced py-6 space-y-6">{children}</main>
    <BottomNav />
  </div>
);

export default Layout;
