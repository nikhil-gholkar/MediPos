import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { 
  FileText, Users, ShieldCheck, LogOut, Smartphone, 
  ChevronRight, ArrowLeft, TrendingUp 
} from 'lucide-react';

interface MoreTabProps {
  medicalId: string | null;
}

interface SupplierItem {
  id: string;
  name: string;
  phone: string;
}

interface HistoricSale {
  id: string;
  total_amount: number;
  created_at: string;
}

export const MoreTab: React.FC<MoreTabProps> = ({ medicalId }) => {
  const { user, signOut } = useAuth();
  const [activeSubView, setActiveSubView] = useState<'menu' | 'reports' | 'suppliers' | 'profile'>('menu');
  
  // Data States
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<HistoricSale[]>([]);
  
  // Form/Filter States
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    if (medicalId) {
      fetchSuppliers();
      fetchSalesHistory();
    }
  }, [medicalId]);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').eq('medical_id', medicalId);
    setSuppliers(data || []);
  };

  const fetchSalesHistory = async () => {
    const { data } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .eq('medical_id', medicalId)
      .order('created_at', { ascending: false });
    setSalesHistory(data || []);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .insert([{ medical_id: medicalId, name: supName, phone: supPhone }]);
      
      if (error) throw error;
      setSupName('');
      setSupPhone('');
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter Sales Logic
  const getFilteredSales = () => {
    const targetDate = new Date(selectedDate);
    return salesHistory.filter(sale => {
      const saleDate = new Date(sale.created_at);
      
      if (reportPeriod === 'day') {
        return saleDate.toDateString() === targetDate.toDateString();
      } else if (reportPeriod === 'week') {
        const diffTime = Math.abs(targetDate.getTime() - saleDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else {
        return saleDate.getMonth() === targetDate.getMonth() && 
               saleDate.getFullYear() === targetDate.getFullYear();
      }
    });
  };

  const filteredSales = getFilteredSales();
  const totalPeriodRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <div className="p-4 flex flex-col justify-between min-h-[calc(100vh-8rem)] bg-slate-50 animate-in fade-in-50 duration-200 pb-20">
      
      {/* 1. VIEWPORT SUB-ROUTING LAYER CONTROLLERS */}
      
      {/* SUB-VIEW: SALES ANALYTICS AUDIT LEDGERS */}
      {activeSubView === 'reports' && (
        <div className="space-y-4 animate-in slide-in-from-right-5 duration-200 w-full">
          <div className="flex items-center gap-2 border-b pb-3">
            <button onClick={() => setActiveSubView('menu')} className="text-slate-400 font-bold hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></button>
            <h2 className="text-sm font-black text-slate-900">Sales Reports</h2>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-black text-slate-400">Baseline Target Date</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-10 rounded-xl border-slate-200 text-xs font-mono" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(['day', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`text-[10px] font-black uppercase py-2 rounded-xl border transition-all ${
                    reportPeriod === period 
                      ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Gross Summary revenue totals */}
          <Card className="border-0 shadow-sm bg-linear-to-br from-indigo-900 to-slate-950 text-white rounded-2xl">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Period Gross Revenue</p>
              <p className="text-2xl font-black font-mono text-emerald-400">${totalPeriodRevenue.toFixed(2)}</p>
              <p className="text-[9px] text-slate-400 font-medium">Calculated across {filteredSales.length} checked out transaction line units.</p>
            </CardContent>
          </Card>

          {/* Statement breakdown scroll lists */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Statement Line Registry</Label>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {filteredSales.map(sale => (
                <div key={sale.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-sm font-mono">
                  <div>
                    <p className="font-bold text-slate-800">INV-#{sale.id.substring(0,6).toUpperCase()}</p>
                    <p className="text-[9px] text-slate-400">{new Date(sale.created_at).toLocaleTimeString()}</p>
                  </div>
                  <span className="font-black text-emerald-600">${Number(sale.total_amount).toFixed(2)}</span>
                </div>
              ))}
              {filteredSales.length === 0 && (
                <p className="text-xs text-slate-400 bg-white border border-dashed p-6 rounded-xl text-center">No transactions recorded matching this date configuration.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW: WHOLESALE SUPPLIERS REGISTER LIST */}
      {activeSubView === 'suppliers' && (
        <div className="space-y-4 animate-in slide-in-from-right-5 duration-200 w-full">
          <div className="flex items-center gap-2 border-b pb-3">
            <button onClick={() => setActiveSubView('menu')} className="text-slate-400 font-bold hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></button>
            <h2 className="text-sm font-black text-slate-900">Supplier Management</h2>
          </div>

          <form onSubmit={handleCreateSupplier} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Log Wholesale Distributor</p>
            <div className="grid grid-cols-2 gap-2">
              <Input required placeholder="Supplier Name" value={supName} onChange={e => setSupName(e.target.value)} className="h-10 text-xs rounded-xl" />
              <Input required placeholder="Contact Phone" value={supPhone} onChange={e => setSupPhone(e.target.value)} className="h-10 text-xs rounded-xl" />
            </div>
            <Button type="submit" size="sm" className="w-full bg-slate-950 text-white text-xs h-10 rounded-xl font-bold">
              Register Supplier Contact
            </Button>
          </form>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {suppliers.map(sup => (
              <div key={sup.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-sm">
                <div>
                  <span className="font-bold text-slate-800">{sup.name}</span>
                  <p className="text-[9px] text-slate-400 font-medium">Verified Logistics Nodes</p>
                </div>
                <a href={`tel:${sup.phone}`} className="text-[10px] text-indigo-600 font-bold font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all active:scale-95">
                  <Smartphone className="w-3.5 h-3.5" /> {sup.phone}
                </a>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="text-xs text-slate-400 bg-white border border-dashed p-6 rounded-xl text-center">No suppliers mapped to this active workspace terminal branch yet.</p>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW: SHOP PROFILE SYSTEM REGISTRIES STATUS */}
      {activeSubView === 'profile' && (
        <div className="space-y-4 animate-in slide-in-from-right-5 duration-200 w-full">
          <div className="flex items-center gap-2 border-b pb-3">
            <button onClick={() => setActiveSubView('menu')} className="text-slate-400 font-bold hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></button>
            <h2 className="text-sm font-black text-slate-900">Shop Profile</h2>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-4 space-y-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-3 border-b pb-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-xs">PH</div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Active Medical Workspace</h4>
                  <p className="text-[10px] text-slate-400 font-mono">ID: #{medicalId?.substring(0,8).toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-2.5 font-mono text-[11px]">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-400">Operator Session:</span>
                  <span className="text-slate-800 font-bold">{user?.email}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-400">Subscription Status:</span>
                  <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                    ● Premium Active License
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database Engine:</span>
                  <span className="text-slate-800 font-bold">Supabase Cloud Live</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BASE ROOT MENU: SYSTEM ROW LAYOUT SETTINGS (APPLE / GOOGLE STYLE ROW CORES) */}
      {activeSubView === 'menu' && (
        <div className="w-full flex-1 flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <div>
              <h1 className="text-xl font-black text-slate-900">Settings</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Backoffice Logs & Configuration Panels</p>
            </div>

            {/* Structured divide rows groupings container */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100 w-full">
              
              {/* Row Target Item 1: Sales reports summaries */}
              <div 
                onClick={() => setActiveSubView('reports')}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Sales Reports</p>
                    <p className="text-[10px] text-slate-400 font-medium">Audit checkout totals by Day, Week, or Month</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Row Target Item 2: Wholesale log providers */}
              <div 
                onClick={() => setActiveSubView('suppliers')}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Supplier Management</p>
                    <p className="text-[10px] text-slate-400 font-medium">Log wholesalers and contact mobile grids</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Row Target Item 3: Shop profile account subscription verifications */}
              <div 
                onClick={() => setActiveSubView('profile')}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Shop Profile</p>
                    <p className="text-[10px] text-slate-400 font-medium">Verify system branch account verification tags</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </div>

            </div>
          </div>

          {/* ABSOLUTE RED DISCONNECT SESSIONS ROW RENDER ANCHOR */}
          <Button 
            onClick={signOut} 
            variant="outline" 
            className="w-full h-11 border-red-200 hover:bg-red-50 text-red-600 font-black text-xs rounded-xl gap-2 shadow-sm bg-white mt-8 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminate Secure Session
          </Button>
        </div>
      )}

    </div>
  );
};