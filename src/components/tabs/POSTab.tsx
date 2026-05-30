import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  Search, ShoppingCart, Trash2, Loader2, Minus, Plus, 
  Printer, X, ChevronDown, ChevronUp, User, Phone 
} from 'lucide-react';

interface POSTabProps {
  medicalId: string | null;
}

interface MedicineItem {
  id: string;
  medicine_name: string;
  generic_name: string;
  category: string;
  batch_number: string;
  expiry_date: string;
  quantity: number; // total loose units/tablets
  conversion_factor: number;
  price_per_unit: number; // price per loose tablet/unit
}

interface CartItem {
  medicine: MedicineItem;
  selectedUnits: number; // exact sum of loose units added
}

export const POSTab: React.FC<POSTabProps> = ({ medicalId }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<MedicineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer Data States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);

  // Modal / Selection States
  const [selectedGroupMed, setSelectedGroupMed] = useState<MedicineItem[]>([]);
  const [activeMed, setActiveMed] = useState<MedicineItem | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [stripCount, setStripCount] = useState(0);
  const [pillCount, setPillCount] = useState(1);

  // Receipt States
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [invoicePayload, setInvoicePayload] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (medicalId) {
      fetchPOSInventory();
    }
  }, [medicalId]);

  const fetchPOSInventory = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('medical_id', medicalId)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true }); // Automatically indexes closest expiry first
    setInventory(data || []);
  };

  // Group items by name for the search dropdown summary lookups
  const uniqueMedicineGroups = inventory.reduce((acc: any, current) => {
    const key = current.medicine_name.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        name: current.medicine_name,
        generic: current.generic_name,
        totalStock: 0,
        batches: []
      };
    }
    acc[key].totalStock += current.quantity;
    acc[key].batches.push(current);
    return acc;
  }, {});

  const searchResults = Object.values(uniqueMedicineGroups).filter((med: any) => 
    searchQuery && (
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (med.generic && med.generic.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const handleSelectGroup = (batches: MedicineItem[]) => {
    setSelectedGroupMed(batches);
    // Auto-select the batch that is closest to expiring
    const optimalBatch = batches[0];
    setActiveMed(optimalBatch);
    setStripCount(0);
    setPillCount(1);
    setIsBatchModalOpen(true);
  };

  const handleAddToCart = () => {
    if (!activeMed) return;
    const totalRequestedUnits = (stripCount * activeMed.conversion_factor) + pillCount;

    if (totalRequestedUnits <= 0) {
      alert('Please select a valid quantity greater than zero.');
      return;
    }

    if (totalRequestedUnits > activeMed.quantity) {
      alert(`Insufficient stock! This batch only has ${activeMed.quantity} units available.`);
      return;
    }

    setCart(prev => {
      const filtered = prev.filter(item => item.medicine.id !== activeMed.id);
      return [...filtered, { medicine: activeMed, selectedUnits: totalRequestedUnits }];
    });

    setIsBatchModalOpen(false);
    setSearchQuery('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setActionLoading(true);

    try {
      const grandTotal = cart.reduce((sum, item) => sum + (item.medicine.price_per_unit * item.selectedUnits), 0);

      // 1. Log generic transaction reference parameters
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert([{
          medical_id: medicalId,
          sold_by: user?.id,
          total_amount: grandTotal,
          customer_name: customerName || 'Walk-in Customer',
          customer_phone: customerPhone || 'N/A'
        }])
        .select()
        .single();

      if (saleErr) throw saleErr;

      // 2. Loop through cart items to write entries and update inventory balances
      for (const item of cart) {
        await supabase.from('sale_items').insert([{
          sale_id: sale.id,
          inventory_id: item.medicine.id,
          quantity: item.selectedUnits,
          price_at_sale: item.medicine.price_per_unit
        }]);

        await supabase
          .from('inventory')
          .update({ quantity: item.medicine.quantity - item.selectedUnits })
          .eq('id', item.medicine.id);
      }

      // 3. Assemble invoice details for the thermal receipt view
      setInvoicePayload({
        id: sale.id.substring(0, 8).toUpperCase(),
        date: new Date().toLocaleString(),
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || 'N/A',
        items: cart,
        total: grandTotal
      });

      // Clear layout states
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setIsReceiptOpen(true);
      fetchPOSInventory(); // Refresh local stocks list arrays

    } catch (err: any) {
      alert(err.message || 'An error occurred during transaction logging processing.');
    } finally {
      setActionLoading(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.medicine.price_per_unit * item.selectedUnits), 0);

  return (
    <div className="flex flex-col justify-between min-h-[calc(100vh-8rem)] bg-slate-50 relative animate-in fade-in-50 duration-200">
      
      {/* SCROLLABLE APPARATUS MAIN CONTAINER FRAME */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-32">
        <div>
          <h1 className="text-xl font-black text-slate-900">Billing Counter</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fast Checkout Engine</p>
        </div>

        {/* TOP SEARCH BAR - STICKY PATTERN DROPDOWN HOOKS */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Type Brand Name or Formula Composition..." 
            className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-sm text-xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <div className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-slate-200/80 shadow-xl max-h-60 overflow-y-auto p-1.5 z-50 space-y-1">
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No matching medicines found in stock.</p>
              ) : (
                searchResults.map((med: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectGroup(med.batches)}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex justify-between items-center border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{med.name}</p>
                      <p className="text-[10px] text-slate-400 italic font-medium">{med.generic || 'Formula details unmapped'}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-mono">
                      Stock: {med.totalStock} u
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ACTIVE BASKET CART MATRIX SCRIPTS */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-3.5 bg-slate-900 text-white flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" /> Selected Cart Matrix
            </CardTitle>
            <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">{cart.length} lines</span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Cart is currently empty. Use the search bar above to look up medicines and add lines to the invoice.
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cart.map(item => {
                  const strips = Math.floor(item.selectedUnits / item.medicine.conversion_factor);
                  const pills = item.selectedUnits % item.medicine.conversion_factor;
                  
                  return (
                    <div key={item.medicine.id} className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-900">{item.medicine.medicine_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-medium">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Batch: {item.medicine.batch_number}</span>
                          <span className="text-indigo-600 font-bold">
                            {strips > 0 ? `${strips} Strip${strips > 1 ? 's' : ''}` : ''}
                            {strips > 0 && pills > 0 ? ' + ' : ''}
                            {pills > 0 ? `${pills} Tab${pills > 1 ? 's' : ''}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-slate-900">${(item.medicine.price_per_unit * item.selectedUnits).toFixed(2)}</span>
                        <button 
                          onClick={() => setCart(prev => prev.filter(c => c.medicine.id !== item.medicine.id))}
                          className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* COLLAPSIBLE CUSTOMER RECORDING FIELD DATA BLOCKS */}
        <Card className="border border-slate-200/60 shadow-sm bg-white rounded-xl overflow-hidden">
          <div 
            onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
            className="p-3 bg-slate-50 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-slate-700"
          >
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Customer Information Details (Optional)</span>
            {isCustomerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
          {isCustomerExpanded && (
            <CardContent className="p-4 grid grid-cols-2 gap-3 border-t border-slate-100 animate-in fade-in duration-150">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> Full Name</Label>
                <Input placeholder="Patient Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9 text-xs rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> Mobile Number</Label>
                <Input placeholder="WhatsApp / Contact" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-9 text-xs rounded-lg" />
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* FIXED FOOTER SUMMARY COMPILATION ROW SCREEN PANEL */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 bg-slate-900 text-white p-4 border-t border-slate-800 z-40 shadow-2xl max-w-md mx-auto rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Gross Balance:</span>
            <span className="text-xl font-black font-mono text-emerald-400">${cartTotal.toFixed(2)}</span>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={actionLoading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Complete Sale & Bill'}
          </Button>
        </div>
      )}

      {/* QUANTITY AND BATCH CONFIG SELECTOR BOTTOM SHEET MODAL */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl p-4 border-0 shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black text-slate-900">{activeMed?.medicine_name}</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400">
              Pick your batch line parameters below. The system automatically shifts and surfaces the closest expiry first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Batch Selection List */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Available Batch Vaults</Label>
              <select 
                value={activeMed?.id} 
                onChange={e => setActiveMed(selectedGroupMed.find(b => b.id === e.target.value) || null)}
                className="w-full h-10 border border-slate-200 rounded-xl px-2 text-xs font-medium bg-white"
              >
                {selectedGroupMed.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    Batch: {batch.batch_number} (Exp: {batch.expiry_date}) - Avail: {batch.quantity} u
                  </option>
                ))}
              </select>
            </div>

            {/* Incremental Counters layout cards */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Strips ({activeMed?.conversion_factor} u/strp)</Label>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-9 w-9 bg-white" onClick={() => setStripCount(prev => Math.max(0, prev - 1))}><Minus className="w-3 h-3" /></Button>
                  <Input type="number" min="0" value={stripCount} onChange={e => setStripCount(Math.max(0, parseInt(e.target.value) || 0))} className="h-9 text-center font-bold font-mono text-xs bg-white" />
                  <Button size="icon" variant="outline" className="h-9 w-9 bg-white" onClick={() => setStripCount(prev => prev + 1)}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Loose Units / Pills</Label>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-9 w-9 bg-white" onClick={() => setPillCount(prev => Math.max(0, prev - 1))}><Minus className="w-3 h-3" /></Button>
                  <Input type="number" min="0" value={pillCount} onChange={e => setPillCount(Math.max(0, parseInt(e.target.value) || 0))} className="h-9 text-center font-bold font-mono text-xs bg-white" />
                  <Button size="icon" variant="outline" className="h-9 w-9 bg-white" onClick={() => setPillCount(prev => prev + 1)}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>

            <Button onClick={handleAddToCart} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
              Commit Package Items to Basket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SIMULATED MOBILE FORMATTED THERMAL SLIP RECEIPT POPUP */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl p-4 border-0 bg-white">
          <div className="border border-dashed border-slate-300 p-4 rounded-xl space-y-4 font-mono text-[11px] text-slate-800 bg-amber-50/10 shadow-inner print:p-0 print:border-0 print:bg-white">
            <div className="text-center space-y-1 border-b border-dashed border-slate-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Medical Pharmacy</h3>
              <p className="text-[9px] text-slate-400">Tax Invoice Receipt Slip</p>
              <p className="text-[10px] font-bold text-slate-700 pt-1">INV: #{invoicePayload?.id}</p>
            </div>
            
            <div className="space-y-0.5 text-slate-600 text-[10px]">
              <p><span className="text-slate-400">Date:</span> {invoicePayload?.date}</p>
              <p><span className="text-slate-400">Patient:</span> {invoicePayload?.customerName}</p>
              <p><span className="text-slate-400">Mobile:</span> {invoicePayload?.customerPhone}</p>
            </div>

            <div className="border-b border-dashed border-slate-200 pb-2 space-y-2">
              <div className="flex justify-between text-slate-400 font-bold text-[9px]">
                <span>PARTICULARS [QTY]</span>
                <span>SUBTOTAL</span>
              </div>
              {invoicePayload?.items.map((line: any, idx: number) => {
                const s = Math.floor(line.selectedUnits / line.medicine.conversion_factor);
                const p = line.selectedUnits % line.medicine.conversion_factor;
                return (
                  <div key={idx} className="flex justify-between items-start text-slate-900 font-semibold leading-tight">
                    <div>
                      <p className="max-w-47.5 truncate uppercase">{line.medicine.medicine_name}</p>
                      <p className="text-[9px] text-slate-400 italic font-medium">
                        ({s > 0 ? `${s}strp` : ''}{s > 0 && p > 0 ? '+' : ''}{p > 0 ? `${p}u` : ''})
                      </p>
                    </div>
                    <span>${(line.medicine.price_per_unit * line.selectedUnits).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
              <span>NET GRAND TOTAL:</span>
              <span>${invoicePayload?.total.toFixed(2)}</span>
            </div>

            <div className="text-center text-[9px] text-slate-400 pt-4 uppercase tracking-widest font-sans font-bold">
              Get well soon!
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => window.print()} className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
              <Printer className="w-4 h-4" /> System Print
            </Button>
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)} className="h-10 rounded-xl text-xs font-bold px-3 border-slate-200 text-slate-500">
              <X className="w-4 h-4" /> Dismiss
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};