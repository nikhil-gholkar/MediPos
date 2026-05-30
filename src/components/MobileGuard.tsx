import React, { useState, useEffect } from 'react';

interface MobileGuardProps {
  children: React.ReactNode;
}

export const MobileGuard: React.FC<MobileGuardProps> = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      // Blocking anything wider than a typical tablet/large mobile breakdown (768px)
      setIsDesktop(window.innerWidth > 768);
    };

    // Check initial load
    checkScreenSize();

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isDesktop) {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-5xl">📱</div>
          <h1 className="text-2xl font-bold tracking-tight">Desktop Not Supported</h1>
          <p className="text-slate-400 text-sm">
            This Medical POS system is optimized exclusively for mobile devices. Please open this application on a smartphone or switch to mobile view in your browser developer tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white max-w-md mx-auto shadow-xl relative">
      {children}
    </div>
  );
};