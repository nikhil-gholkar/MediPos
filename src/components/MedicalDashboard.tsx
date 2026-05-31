import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { HomeTab } from './tabs/HomeTab';
import { POSTab } from './tabs/POSTab';
import { InventoryTab } from './tabs/InventoryTab';
import { MoreTab } from './tabs/MoreTab';
import { LayoutDashboard, ShoppingCart, Package, Menu, ShieldAlert } from 'lucide-react';

export const MedicalDashboard: React.FC = () => {
  const { medicalId, isMedicalEnabled } = useAuth();

  // Guard Clause: Frozen State Layout
  if (!isMedicalEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto border-x border-slate-200/60">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-base font-black text-slate-900 tracking-tight">Terminal Frozen</h1>
        <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed max-w-62.5">
          Access to this local branch instance has been suspended by corporate headquarters. Please reach out to your systems administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 max-w-sm mx-auto border-x border-slate-200/80 shadow-2xl relative flex flex-col overflow-hidden">
      
      {/* NATIVE SYSTEM TABS ROUTER CONTAINER LAYER */}
      <Tabs defaultValue="dashboard" className="w-full flex-1 flex flex-col justify-between">
        
        {/* INTERMEDIARY SCROLLABLE HOOD CONTROLLER */}
        <div className="flex-1 overflow-y-auto pb-24">
          <TabsContent value="dashboard" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <HomeTab medicalId={medicalId} />
          </TabsContent>
          <TabsContent value="checkout" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <POSTab medicalId={medicalId} />
          </TabsContent>
          <TabsContent value="inventory" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <InventoryTab medicalId={medicalId} />
          </TabsContent>
          <TabsContent value="more" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <MoreTab medicalId={medicalId} />
          </TabsContent>
        </div>

        {/* FIXED PERMANENT BOTTOM APP NAV DOCK */}
        {/* 'fixed' locks it to the viewport, 'w-full max-w-sm' matches the mobile layout frame width */}
        <div className="fixed bottom-4 left-0 right-0 z-50 px-4 w-full max-w-sm mx-auto pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.24)] pointer-events-auto">
            <TabsList className="grid grid-cols-4 w-full h-11 bg-transparent border-0 p-0 gap-1">
              
              {/* Trigger Item 1: Home Dashboard */}
              <TabsTrigger 
                value="dashboard" 
                className="rounded-xl text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-200 border-0 text-slate-400 hover:text-slate-200 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:scale-[1.02] shadow-none"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Home</span>
              </TabsTrigger>

              {/* Trigger Item 2: POS Billing Checkout */}
              <TabsTrigger 
                value="checkout" 
                className="rounded-xl text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-200 border-0 text-slate-400 hover:text-slate-200 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:scale-[1.02] shadow-none"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>POS</span>
              </TabsTrigger>

              {/* Trigger Item 3: Stock Inventory Manager */}
              <TabsTrigger 
                value="inventory" 
                className="rounded-xl text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-200 border-0 text-slate-400 hover:text-slate-200 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:scale-[1.02] shadow-none"
              >
                <Package className="w-4 h-4" />
                <span>Stock</span>
              </TabsTrigger>

              {/* Trigger Item 4: More Option Menus */}
              <TabsTrigger 
                value="more" 
                className="rounded-xl text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-200 border-0 text-slate-400 hover:text-slate-200 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:scale-[1.02] shadow-none"
              >
                <Menu className="w-4 h-4" />
                <span>More</span>
              </TabsTrigger>

            </TabsList>
          </div>
        </div>

      </Tabs>
    </div>
  );
};