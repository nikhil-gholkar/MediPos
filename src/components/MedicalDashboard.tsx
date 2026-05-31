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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center w-full max-w-md mx-auto">
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
    // 1. RE-ENGINEERED ROOT WRAPPER: Removed strict max-w-sm restriction to let it breathe natively on phone viewports
    <div className="min-h-screen bg-slate-50/50 w-full max-w-md mx-auto shadow-none relative flex flex-col overflow-x-hidden">
      
      {/* NATIVE SYSTEM TABS ROUTER CONTAINER LAYER */}
      <Tabs defaultValue="dashboard" className="w-full flex-1 flex flex-col justify-between">
        
        {/* INTERMEDIARY SCROLLABLE HOOD CONTROLLER */}
        {/* Expanded padding-bottom so content never hides behind the floating navigation island */}
        <div className="flex-1 overflow-y-auto pb-32">
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

   {/* FIXED PERMANENT NATIVE BOTTOM APP NAV DOCK */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 w-full max-w-md mx-auto bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.28)] pointer-events-auto">
            
            {/* 🛠️ ALIGNMENT TRACK FIX: Explicitly centered with structural flex resets */}
            <TabsList className="grid grid-cols-4 w-full h-14 bg-transparent border-0 p-0 gap-1 items-center justify-items-stretch overflow-hidden">
              
              {/* Trigger Item 1: Home Dashboard */}
              {/* 🛠️ UNEVEN CAPSULE FIX: Standardized height using inline-flex and forced uniform padding controls */}
              <TabsTrigger 
                value="dashboard" 
                className="rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 w-full h-full p-0 border-0 text-slate-400 hover:text-slate-200 shadow-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-0 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:inline-flex data-[state=active]:h-full data-[state=active]:items-center data-[state=active]:justify-center data-[state=active]:p-0 data-[state=active]:scale-100"
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className="block text-center leading-none tracking-tight font-extrabold mt-0.5">Home</span>
              </TabsTrigger>

              {/* Trigger Item 2: POS Billing */}
              <TabsTrigger 
                value="checkout" 
                className="rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 w-full h-full p-0 border-0 text-slate-400 hover:text-slate-200 shadow-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-0 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:inline-flex data-[state=active]:h-full data-[state=active]:items-center data-[state=active]:justify-center data-[state=active]:p-0 data-[state=active]:scale-100"
              >
                <ShoppingCart className="w-5 h-5 shrink-0" />
                <span className="block text-center leading-none tracking-tight font-extrabold mt-0.5">POS</span>
              </TabsTrigger>

              {/* Trigger Item 3: Stock */}
              <TabsTrigger 
                value="inventory" 
                className="rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 w-full h-full p-0 border-0 text-slate-400 hover:text-slate-200 shadow-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-0 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:inline-flex data-[state=active]:h-full data-[state=active]:items-center data-[state=active]:justify-center data-[state=active]:p-0 data-[state=active]:scale-100"
              >
                <Package className="w-5 h-5 shrink-0" />
                <span className="block text-center leading-none tracking-tight font-extrabold mt-0.5">Stock</span>
              </TabsTrigger>

              {/* Trigger Item 4: More */}
              <TabsTrigger 
                value="more" 
                className="rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 w-full h-full p-0 border-0 text-slate-400 hover:text-slate-200 shadow-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-0 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:inline-flex data-[state=active]:h-full data-[state=active]:items-center data-[state=active]:justify-center data-[state=active]:p-0 data-[state=active]:scale-100"
              >
                <Menu className="w-5 h-5 shrink-0" />
                <span className="block text-center leading-none tracking-tight font-extrabold mt-0.5">More</span>
              </TabsTrigger>

            </TabsList>
          </div>
        </div>
      </Tabs>
    </div>
  );
};