import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { HomeTab } from './tabs/HomeTab';
import { POSTab } from './tabs/POSTab';
import { InventoryTab } from './tabs/InventoryTab';
import { MoreTab } from './tabs/MoreTab';
import { LayoutDashboard, ShoppingCart, Package, Menu } from 'lucide-react';

export const MedicalDashboard: React.FC = () => {
  const { medicalId, isMedicalEnabled } = useAuth();

  // Guard Clause: If the admin has suspended this specific pharmacy terminal, lock down access screens
  if (!isMedicalEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto border-x border-slate-200">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <Package className="w-8 h-8" />
        </div>
        <h1 className="text-base font-black text-slate-900">Terminal Suspended</h1>
        <p className="text-xs text-slate-400 font-medium mt-1.5 max-w-70">
          Access to this pharmacy workspace branch has been temporarily frozen by central headquarters. Please contact your system Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto border-x border-slate-200 shadow-xl relative">
      
      {/* FULL RESPONSIVE NAVIGATION WRAPPER MATRIX */}
      <Tabs defaultValue="dashboard" className="w-full flex-1 flex flex-col justify-between">
        
        {/* VIEWPORTS CONTAINER MOUNT POINTS */}
        <div className="flex-1 pb-16">
          
          {/* TAB 1: DIAGNOSTICS & ALERTS HOME PANEL */}
          <TabsContent value="dashboard" className="m-0 p-0">
            <HomeTab medicalId={medicalId} />
          </TabsContent>

          {/* TAB 2: MOBILE FAST-BILLING POS CHECKOUT */}
          <TabsContent value="checkout" className="m-0 p-0">
            <POSTab medicalId={medicalId} />
          </TabsContent>

          {/* TAB 3: STEPPED STOCK REGISTRY ROOM */}
          <TabsContent value="inventory" className="m-0 p-0">
            <InventoryTab medicalId={medicalId} />
          </TabsContent>

          {/* TAB 4: APPLE/GOOGLE STYLE SETTINGS & FINANCIAL REPORTS */}
          <TabsContent value="more" className="m-0 p-0">
            <MoreTab medicalId={medicalId} />
          </TabsContent>

        </div>

        {/* PERSISTENT SYSTEM TAB NAVIGATION NAV BAR BAR ANCHOR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-2 py-1.5 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] max-w-md mx-auto">
          <TabsList className="grid grid-cols-4 w-full bg-slate-100/80 h-11 p-1 rounded-xl border-0">
            
            <TabsTrigger 
              value="dashboard" 
              className="rounded-lg text-[10px] font-black data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex flex-col items-center justify-center gap-0.5 h-full border-0 transition-all text-slate-400"
            >
              <LayoutDashboard className="w-4 h-4" /> Home
            </TabsTrigger>

            <TabsTrigger 
              value="checkout" 
              className="rounded-lg text-[10px] font-black data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex flex-col items-center justify-center gap-0.5 h-full border-0 transition-all text-slate-400"
            >
              <ShoppingCart className="w-4 h-4" /> POS
            </TabsTrigger>

            <TabsTrigger 
              value="inventory" 
              className="rounded-lg text-[10px] font-black data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex flex-col items-center justify-center gap-0.5 h-full border-0 transition-all text-slate-400"
            >
              <Package className="w-4 h-4" /> Stock
            </TabsTrigger>

            <TabsTrigger 
              value="more" 
              className="rounded-lg text-[10px] font-black data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex flex-col items-center justify-center gap-0.5 h-full border-0 transition-all text-slate-400"
            >
              <Menu className="w-4 h-4" /> More
            </TabsTrigger>

          </TabsList>
        </div>

      </Tabs>
    </div>
  );
};