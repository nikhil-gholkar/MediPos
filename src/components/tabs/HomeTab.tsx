import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, AlertCircle, Package, TrendingUp, DollarSign, Sparkles, Flame } from 'lucide-react';

interface HomeTabProps {
  medicalId: string | null;
}

export const HomeTab: React.FC<HomeTabProps> = ({ medicalId }) => {
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('Pharmacy');
  const [stats, setStats] = useState({ salesToday: 0, profitToday: 0, lowStock: 0, nearExpiry: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (medicalId) loadAppHomeData();
  }, [medicalId]);

  // Helper function to extract initials dynamically from any shop name string
  const getShopInitials = (name: string) => {
    if (!name) return 'RX';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const loadAppHomeData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const trailingSevenDaysAgo = new Date();
      trailingSevenDaysAgo.setDate(trailingSevenDaysAgo.getDate() - 6);
      trailingSevenDaysAgo.setHours(0, 0, 0, 0);

      // 1. Concurrently fetch profile info alongside inventory status and sales records
      const [shopRes, invRes, salesRes] = await Promise.all([
        supabase.from('medicals').select('name').eq('id', medicalId).single(),
        supabase.from('inventory').select('*').eq('medical_id', medicalId),
        supabase
          .from('sales')
          .select('*, sale_items(*)')
          .eq('medical_id', medicalId)
          .gte('created_at', trailingSevenDaysAgo.toISOString())
          .order('created_at', { ascending: true })
      ]);

      if (shopRes.data?.name) {
        setShopName(shopRes.data.name);
      }

      const rawInv = invRes.data || [];
      const historicalSales = salesRes.data || [];

      // Process Alert Lists
      const processedLowStock = rawInv.filter(i => i.quantity <= (i.min_stock_limit || 10));
      const processedExpiry = rawInv.map(i => {
        const days = Math.ceil((new Date(i.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return { ...i, days };
      }).filter(i => i.days > 0 && i.days <= 60).sort((a,b) => a.days - b.days);

      // Compute Real-Time Today's Revenue and Profit Calculations
      let salesTodaySum = 0; 
      let profitTodaySum = 0;
      
      historicalSales.forEach((s: any) => {
        const isSaleFromToday = s.created_at.split('T')[0] === todayStr;
        
        if (isSaleFromToday) {
          salesTodaySum += Number(s.total_amount);
        }

        s.sale_items?.forEach((item: any) => {
          const matchedItem = rawInv.find(i => i.id === item.inventory_id);
          const baseUnitCost = matchedItem ? Number(matchedItem.purchase_price) : 0;
          
          if (isSaleFromToday) {
            profitTodaySum += (Number(item.price_at_sale) - baseUnitCost) * Number(item.quantity);
          }
        });
      });

      // Group Historical Sales into the Trailing 7-Day Timeline Matrix
      const daysOfWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      const integratedWeeklyChartGrid = Array.from({ length: 7 }).map((_, step) => {
        const targetCalendarDay = new Date();
        targetCalendarDay.setDate(targetCalendarDay.getDate() - (6 - step));
        const targetDayISOString = targetCalendarDay.toISOString().split('T')[0];

        const dayTotalRevenue = historicalSales
          .filter((sale: any) => sale.created_at.split('T')[0] === targetDayISOString)
          .reduce((acc, sale) => acc + Number(sale.total_amount), 0);

        return {
          name: daysOfWeekLabels[targetCalendarDay.getDay()],
          dateLabel: targetDayISOString,
          revenue: dayTotalRevenue
        };
      });

      setWeeklyData(integratedWeeklyChartGrid);
      setLowStockAlerts(processedLowStock);
      setExpiryAlerts(processedExpiry);
      setStats({ 
        salesToday: salesTodaySum, 
        profitToday: profitTodaySum, 
        lowStock: processedLowStock.length, 
        nearExpiry: processedExpiry.length 
      });
    } catch (err) {
      console.error('An error occurred during dashboard pipeline synchronization:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-28 space-y-5 bg-slate-50/40 min-h-screen">
      
      {/* BRAND HEADER BAR */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5 max-w-[75%]">
          <div className="flex items-center gap-1 text-indigo-600 font-bold text-[10px] bg-indigo-50 w-fit px-2.5 py-0.5 rounded-full border border-indigo-100">
            <Sparkles className="w-2.5 h-2.5" /> Live Terminal
          </div>
          {/* Dynamic shop name display */}
          <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{shopName}</h1>
        </div>
        
        {/* DYNAMIC SHIFT INITIALS PROFILE CONTAINER */}
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-black text-white text-xs border shadow-sm tracking-wider shrink-0">
          {getShopInitials(shopName)}
        </div>
      </div>

      {/* DYNAMIC REAL-TIME AREA SPLINE CHART */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Weekly Revenue Analytics</h2>
          <p className="text-[10px] text-slate-400 font-medium">Live 7-day rolling store sales data</p>
        </div>
        <div className="w-full h-40 -ml-6 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
              <Tooltip 
                contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', padding: '6px 10px' }} 
                labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700 }}
                itemStyle={{ color: '#34d399', fontSize: '11px', fontWeight: 800 }}
              />
              <defs>
                <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#chartColor)" dot={{ r: 3, stroke: '#ffffff', strokeWidth: 1.5, fill: '#4f46e5' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CORE METRICS GRID TRACKERS */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><DollarSign className="w-4 h-4" /></div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Today's Sales</p>
            <p className="text-sm font-black text-slate-900 font-mono">${stats.salesToday.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Today's Profit</p>
            <p className="text-sm font-black text-emerald-600 font-mono">${stats.profitToday.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Package className="w-4 h-4" /></div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Low Stock</p>
            <p className="text-sm font-black text-amber-600 font-mono">{stats.lowStock}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="w-4 h-4" /></div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Near Expiry</p>
            <p className="text-sm font-black text-rose-500 font-mono">{stats.nearExpiry}</p>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS CONTAINER FEEDS */}
      <div className="space-y-4">
        
        {/* CRITICAL EXPIRY METRICS */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-black uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 animate-pulse" /> Critical Near-Expiry Alerts
          </div>
          <div className="space-y-1.5">
            {expiryAlerts.map(item => (
              <div key={item.id} className="p-3 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between shadow-sm text-xs transition-all">
                <div>
                  <h4 className="font-bold text-slate-800">{item.medicine_name}</h4>
                  <p className="text-[9px] text-slate-400 font-mono">Batch: {item.batch_number}</p>
                </div>
                <span className="text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-0.5 rounded-lg font-mono">
                  {item.days} days left
                </span>
              </div>
            ))}
            {expiryAlerts.length === 0 && <p className="text-center py-5 text-xs text-slate-400 bg-white border border-dashed rounded-xl">No immediate expiry threats discovered.</p>}
          </div>
        </div>

        {/* LOW STOCK ALERTS */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-black uppercase tracking-wider">
            <Package className="w-3.5 h-3.5" /> Low Stock Alerts
          </div>
          <div className="space-y-1.5">
            {lowStockAlerts.map(item => {
              const strips = Math.floor(item.quantity / item.conversion_factor);
              return (
                <div key={item.id} className="p-3 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between shadow-sm text-xs transition-all">
                  <div>
                    <h4 className="font-bold text-slate-800">{item.medicine_name}</h4>
                    <p className="text-[9px] text-slate-400 font-medium">Available: {item.quantity} loose units</p>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-lg font-mono">
                    Only {strips > 0 ? `${strips} strips` : `${item.quantity} tabs`} left
                  </span>
                </div>
              );
            })}
            {lowStockAlerts.length === 0 && <p className="text-center py-5 text-xs text-slate-400 bg-white border border-dashed rounded-xl">All inventory reserves are completely healthy.</p>}
          </div>
        </div>

      </div>

    </div>
  );
};