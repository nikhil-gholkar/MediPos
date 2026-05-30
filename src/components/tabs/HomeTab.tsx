import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import { Loader2, AlertCircle, Package, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';

interface HomeTabProps {
  medicalId: string | null;
}

interface StatMetrics {
  todaySales: number;
  todayProfit: number;
  lowStockCount: number;
  nearExpiryCount: number;
}

interface ExpiryAlertItem {
  id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  days_remaining: number;
}

interface LowStockAlertItem {
  id: string;
  medicine_name: string;
  quantity: number;
  min_stock_limit: number;
  conversion_factor: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({ medicalId }) => {
  const [metrics, setMetrics] = useState<StatMetrics>({ todaySales: 0, todayProfit: 0, lowStockCount: 0, nearExpiryCount: 0 });
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (medicalId) {
      loadDashboardData();
    }
  }, [medicalId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch Inventory for Low Stock & Near Expiry Alerts calculation
      const { data: inventoryData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('medical_id', medicalId);

      if (invError) throw invError;
      const rawInventory = inventoryData || [];

      // 2. Fetch Today's Sales & Line Items for Profit calculation
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          sale_items (
            quantity,
            price_at_sale,
            inventory_id
          )
        `)
        .eq('medical_id', medicalId)
        .gte('created_at', `${todayStr}T00:00:00.000Z`);

      if (salesError) throw salesError;
      const rawSales = salesData || [];

      // --- MATHEMATICS PROCESSING LAYER ---
      
      // Calculate Low Stock Alerts (Stock units <= Minimum Limit)
      const computedLowStock = rawInventory
        .filter(item => item.quantity <= (item.min_stock_limit || 10))
        .map(item => ({
          id: item.id,
          medicine_name: item.medicine_name,
          quantity: item.quantity,
          min_stock_limit: item.min_stock_limit || 10,
          conversion_factor: item.conversion_factor || 10
        }));

      // Calculate Near Expiry Alerts (Expiring within next 60 days)
      const computedExpiry = rawInventory
        .map(item => {
          const days = Math.ceil((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          return {
            id: item.id,
            medicine_name: item.medicine_name,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            days_remaining: days
          };
        })
        .filter(item => item.days_remaining > 0 && item.days_remaining <= 60)
        .sort((a, b) => a.days_remaining - b.days_remaining);

      // Calculate Revenue & Profit Accumulations
      let totalSalesToday = 0;
      let totalProfitToday = 0;

      rawSales.forEach((sale: any) => {
        totalSalesToday += Number(sale.total_amount);

        if (sale.sale_items) {
          sale.sale_items.forEach((item: any) => {
            const matchedInv = rawInventory.find(inv => inv.id === item.inventory_id);
            const unitPurchaseCost = matchedInv ? Number(matchedInv.purchase_price) : 0;
            const unitSellingPrice = Number(item.price_at_sale);
            
            // Profit = (Selling Price - Purchase Cost) * Quantity Sold
            totalProfitToday += (unitSellingPrice - unitPurchaseCost) * Number(item.quantity);
          });
        }
      });

      // Update State arrays
      setExpiryAlerts(computedExpiry);
      setLowStockAlerts(computedLowStock);
      setMetrics({
        todaySales: totalSalesToday,
        todayProfit: totalProfitToday,
        lowStockCount: computedLowStock.length,
        nearExpiryCount: computedExpiry.length
      });

    } catch (err: any) {
      console.error('Critical telemetry synchronization fault:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 animate-in fade-in-50 duration-200">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Home</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Live Terminal Diagnostics
        </p>
      </div>

      {/* TOP STATS: 2X2 GRID */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Today's Sales */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Today's Sales</p>
              <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">${metrics.todaySales.toFixed(2)}</p>
          </CardContent>
        </Card>

        {/* Today's Profit */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Today's Profit</p>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-lg font-black text-emerald-600 font-mono">${metrics.todayProfit.toFixed(2)}</p>
          </CardContent>
        </Card>

        {/* Low Stock Counter */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Low Stock Lines</p>
              <Package className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-black text-amber-600 font-mono">{metrics.lowStockCount}</p>
          </CardContent>
        </Card>

        {/* Near Expiry Counter */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Near Expiry</p>
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <p className="text-lg font-black text-red-500 font-mono">{metrics.nearExpiryCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: CRITICAL NEAR-EXPIRY ALERTS */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> Critical Near-Expiry Alerts
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {expiryAlerts.map(alert => (
            <div 
              key={alert.id} 
              className="p-3.5 bg-red-50/60 border border-red-100/80 rounded-xl flex items-center justify-between text-xs shadow-inner"
            >
              <div className="space-y-0.5">
                <p className="font-bold text-red-950">{alert.medicine_name}</p>
                <p className="text-[10px] text-red-700 font-mono font-medium">Batch: {alert.batch_number}</p>
              </div>
              <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-1 rounded-lg font-mono whitespace-nowrap">
                Expiring in {alert.days_remaining} days
              </span>
            </div>
          ))}
          {expiryAlerts.length === 0 && (
            <p className="text-xs text-slate-400 bg-white border p-5 rounded-xl text-center shadow-sm">
              No immediate expiry locks flagged within the 60-day window.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 2: LOW STOCK ALERTS */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 text-amber-600">
          <Package className="w-3.5 h-3.5" /> Depleted Stock Alerts
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {lowStockAlerts.map(alert => {
            // Convert total loose pills back into strips/units for consumer presentation
            const stripsLeft = Math.floor(alert.quantity / alert.conversion_factor);
            const remainingLooseUnits = alert.quantity % alert.conversion_factor;
            
            return (
              <div 
                key={alert.id} 
                className="p-3.5 bg-amber-50/60 border border-amber-100/80 rounded-xl flex items-center justify-between text-xs shadow-inner"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">{alert.medicine_name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Current Balance: <span className="font-mono font-bold text-slate-600">{alert.quantity} units</span>
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-1 rounded-lg font-mono text-right">
                  {stripsLeft > 0 
                    ? `Only ${stripsLeft} strip${stripsLeft > 1 ? 's' : ''} left` 
                    : `Only ${remainingLooseUnits} unit${remainingLooseUnits > 1 ? 's' : ''} left`
                  }
                </span>
              </div>
            );
          })}
          {lowStockAlerts.length === 0 && (
            <p className="text-xs text-slate-400 bg-white border p-5 rounded-xl text-center shadow-sm">
              All inventory nodes have healthy stock reserves.
            </p>
          )}
        </div>
      </div>

    </div>
  );
};