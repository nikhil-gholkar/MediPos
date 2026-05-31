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

      if (shopRes.data?.name) setShopName(shopRes.data.name);

      const rawInv = invRes.data || [];
      const historicalSales = salesRes.data || [];

      const processedLowStock = rawInv.filter(i => i.quantity <= (i.min_stock_limit || 10));
      const processedExpiry = rawInv.map(i => {
        const days = Math.ceil((new Date(i.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return { ...i, days };
      }).filter(i => i.days > 0 && i.days <= 60).sort((a,b) => a.days - b.days);

      let salesTodaySum = 0; 
      let profitTodaySum = 0;
      
      historicalSales.forEach((s: any) => {
        const isSaleFromToday = s.created_at.split('T')[0] === todayStr;
        if (isSaleFromToday) salesTodaySum += Number(s.total_amount);

        s.sale_items?.forEach((item: any) => {
          const matchedItem = rawInv.find(i => i.id === item.inventory_id);
          const baseUnitCost = matchedItem ? Number(matchedItem.purchase_price) : 0;
          if (isSaleFromToday) {
            profitTodaySum += (Number(item.price_at_sale) - baseUnitCost) * Number(item.quantity);
          }
        });
      });

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
          revenue: dayTotalRevenue
        };
      });

      setWeeklyData(integratedWeeklyChartGrid);
      setLowStockAlerts(processedLowStock);
      setExpiryAlerts(processedExpiry);
      setStats({ salesToday: salesTodaySum, profitToday: profitTodaySum, lowStock: processedLowStock.length, nearExpiry: processedExpiry.length });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    // 🛠️ MOBILE APPARATUS SCALING: Increased core edge paddings to p-5 for better structural balance
    <div className="px-5 pt-6 pb-32 space-y-6 bg-slate-50/40 min-h-screen select-none">
      
      {/* BRAND HEADER BAR */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-1 max-w-[75%]">
          <div className="flex items-center gap-1.5 text-indigo-600 font-extrabold text-[11px] bg-indigo-50 w-fit px-3 py-1 rounded-full border border-indigo-100/80">
            <Sparkles className="w-3 h-3" /> Live Terminal
          </div>
          {/* 🛠️ NATIVE TEXT UPGRADE: Enlarged shop header sizes to text-2xl with black font weights */}
          <h1 className="text-2xl font-black text-slate-900 tracking-tight capitalize truncate">{shopName}</h1>
        </div>
        
        {/* ENLARGED SHAPE AVATAR BULLET */}
        <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-white text-sm border-2 border-white shadow-md tracking-wider shrink-0">
          {getShopInitials(shopName)}
        </div>
      </div>

      {/* RECHARTS ANALYTICS CONTAINER CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/70 p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Weekly Revenue</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Rolling 7-day operational timeline analytics</p>
        </div>
        {/* Adjusted chart view height scales to 180px */}
        <div className="w-full h-44 -ml-5 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
              <Tooltip 
                contentStyle={{ background: '#0f172a', borderRadius: '14px', border: 'none', padding: '8px 12px' }} 
                labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700 }}
                itemStyle={{ color: '#34d399', fontSize: '12px', fontWeight: 800 }}
              />
              <defs>
                <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#chartColor)" dot={{ r: 3.5, stroke: '#ffffff', strokeWidth: 2, fill: '#4f46e5' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2X2 METRICS GRID SCALE ADJUSTMENT */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Card 1: Today's Sales */}
        <div className="bg-white border border-slate-200/70 p-4.5 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Today's Sales</p>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono tracking-tight">${stats.salesToday.toFixed(2)}</p>
        </div>

        {/* Card 2: Today's Profit */}
        <div className="bg-white border border-slate-200/70 p-4.5 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Today's Profit</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-black text-emerald-600 font-mono tracking-tight">${stats.profitToday.toFixed(2)}</p>
        </div>

        {/* Card 3: Low Stock Count */}
        <div className="bg-white border border-slate-200/70 p-4.5 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Low Stock</p>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><Package className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-black text-amber-600 font-mono tracking-tight">{stats.lowStock}</p>
        </div>

        {/* Card 4: Near Expiry Count */}
        <div className="bg-white border border-slate-200/70 p-4.5 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Near Expiry</p>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-black text-rose-500 font-mono tracking-tight">{stats.nearExpiry}</p>
        </div>
      </div>

      {/* NOTIFICATIONS CONTAINER FEEDS */}
      <div className="space-y-5 pt-1">
        
        {/* FEED SECTOR 1: CRITICAL NEAR-EXPIRY CORES */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-rose-600 text-xs font-black uppercase tracking-wider">
            <Flame className="w-4 h-4 animate-pulse" /> Critical Near-Expiry Alerts
          </div>
          <div className="space-y-2">
            {expiryAlerts.map(item => (
              // Increased padding to p-4 for a native feel
              <div key={item.id} className="p-4 bg-white border border-slate-200/70 rounded-2xl flex items-center justify-between shadow-sm text-sm">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-900 text-sm">{item.medicine_name}</h4>
                  <p className="text-xs text-slate-400 font-mono font-semibold">Batch No: {item.batch_number}</p>
                </div>
                <span className="text-xs font-bold bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1 rounded-xl font-mono">
                  {item.days} days left
                </span>
              </div>
            ))}
            {expiryAlerts.length === 0 && (
              <p className="text-sm text-slate-400 bg-white border border-dashed p-6 rounded-2xl text-center font-medium">
                No immediate expiry threats discovered.
              </p>
            )}
          </div>
        </div>

        {/* FEED SECTOR 2: LOW STOCK RESERVES */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-amber-600 text-xs font-black uppercase tracking-wider">
            <Package className="w-4 h-4" /> Low Stock Alerts
          </div>
          <div className="space-y-2">
            {lowStockAlerts.map(item => {
              const strips = Math.floor(item.quantity / item.conversion_factor);
              return (
                <div key={item.id} className="p-4 bg-white border border-slate-200/70 rounded-2xl flex items-center justify-between shadow-sm text-sm">
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-slate-900 text-sm">{item.medicine_name}</h4>
                    <p className="text-xs text-slate-400 font-medium">In Stock Pool: {item.quantity} units</p>
                  </div>
                  <span className="text-xs font-bold bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded-xl font-mono">
                    Only {strips > 0 ? `${strips} strips` : `${item.quantity} tabs`} left
                  </span>
                </div>
              );
            })}
            {lowStockAlerts.length === 0 && (
              <p className="text-sm text-slate-400 bg-white border border-dashed p-6 rounded-2xl text-center font-medium">
                All inventory reserves are completely healthy.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};