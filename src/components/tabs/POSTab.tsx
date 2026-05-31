import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CheckoutScreen } from './CheckoutScreen';
import { Search, ShoppingBag, Plus, Minus, Trash2, Loader2, Sparkles } from 'lucide-react';

interface POSTabProps {
  medicalId: string | null;
}

interface MedicineStockItem {
  id: string;
  medicine_name: string;
  generic_name: string;
  category: string;
  quantity: number;
  conversion_factor: number;
  price_per_unit: number;
}

interface CartItem {
  inventoryItem: MedicineStockItem;
  quantityNeeded: number;
}

export const POSTab: React.FC<POSTabProps> = ({ medicalId }) => {
  const [currentScreen, setCurrentScreen] = useState<'catalog' | 'checkout'>('catalog');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [inventory, setInventory] = useState<MedicineStockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  useEffect(() => {
    if (medicalId) fetchInventoryPool();
  }, [medicalId]);

  const fetchInventoryPool = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('inventory')
        .select('id, medicine_name, generic_name, category, quantity, conversion_factor, price_per_unit')
        .eq('medical_id', medicalId)
        .gt('quantity', 0)
        .order('medicine_name', { ascending: true });
      setInventory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MedicineStockItem) => {
    const existing = cart.find(c => c.inventoryItem.id === item.id);
    if (existing) return; // Managed by direct incrementors now

    if (item.quantity < 1) {
      alert("Out of stock units.");
      return;
    }
    setCart([...cart, { inventoryItem: item, quantityNeeded: 1 }]);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    const target = cart.find(c => c.inventoryItem.id === itemId);
    if (!target) return;

    const newQty = target.quantityNeeded + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.inventoryItem.id !== itemId));
      return;
    }

    if (newQty > target.inventoryItem.quantity) {
      alert(`Cannot exceed stock limit of ${target.inventoryItem.quantity} items.`);
      return;
    }

    setCart(cart.map(c => c.inventoryItem.id === itemId ? { ...c, quantityNeeded: newQty } : c));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.inventoryItem.id !== itemId));
  };

  // 🛠️ DELETE ALL ITEMS OPERATIONS
  const clearEntireBasket = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop parent trigger switches
    if (window.confirm("Are you sure you want to remove all items from your shopping basket?")) {
      setCart([]);
    }
  };

  const totalBillAmount = cart.reduce((sum, item) => sum + (item.quantityNeeded * item.inventoryItem.price_per_unit), 0);
  const totalBasketCount = cart.reduce((sum, c) => sum + c.quantityNeeded, 0);

  const handleFinalOrderCheckout = async () => {
    if (cart.length === 0) return;
    setActionLoading(true);

    try {
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ 
          medical_id: medicalId, 
          total_amount: totalBillAmount,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          payment_method: paymentMethod
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const batchPromises = cart.map(async (item) => {
        const { error: itemError } = await supabase
          .from('sale_items')
          .insert([{
            sale_id: saleData.id,
            inventory_id: item.inventoryItem.id,
            quantity: item.quantityNeeded,
            price_at_sale: item.inventoryItem.price_per_unit
          }]);
        if (itemError) throw itemError;

        const dynamicRemainingQty = item.inventoryItem.quantity - item.quantityNeeded;
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: dynamicRemainingQty })
          .eq('id', item.inventoryItem.id);
        if (updateError) throw updateError;
      });

      await Promise.all(batchPromises);

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setCurrentScreen('catalog');
      await fetchInventoryPool();
      alert('Invoice finalized successfully!');
    } catch (err: any) {
      alert(err.message || 'Database transaction error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts = inventory.filter(item => 
    item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.generic_name && item.generic_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/40 select-none pb-32">
      
      {currentScreen === 'catalog' ? (
        <div className="px-5 pt-6 space-y-5 animate-in fade-in duration-200">
          
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Counter Sales</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Store Inventory Registry</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-mono text-sm font-black shadow-md">
              POS
            </div>
          </div>

          {/* SEARCH FIELD BAR */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search items by composition or title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-2xl bg-white border-slate-200 shadow-sm text-sm font-medium text-slate-800 placeholder-slate-400 focus-visible:ring-indigo-500"
            />
          </div>

          {/* MEDICAL PRODUCT GRID MATRIX */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Available Medical Stock</Label>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold font-mono">{filteredProducts.length} Items</span>
            </div>

            {/* HIGH DENSITY RESPONSIVE SCROLL ZONE */}
            <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1 scrollbar-none pb-12">
              {filteredProducts.map(item => {
                const currentCartMatch = cart.find(c => c.inventoryItem.id === item.id);
                const totalStrips = Math.floor(item.quantity / item.conversion_factor);
                const individualLooseUnits = item.quantity % item.conversion_factor;

                return (
                  <div 
                    key={item.id}
                    className={`p-4 bg-white border rounded-2xl flex items-center justify-between shadow-sm transition-all group ${
                      currentCartMatch ? 'border-indigo-600 bg-indigo-50/5' : 'border-slate-200/70'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-[55%]">
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{item.medicine_name}</h4>
                      <p className="text-xs text-slate-400 font-medium tracking-tight truncate">{item.generic_name || 'No generic information logged'}</p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono uppercase">{item.category}</span>
                        <span className="text-[10px] font-extrabold bg-slate-50 border text-slate-500 px-2 py-0.5 rounded-md font-mono">
                          Pool: {totalStrips > 0 ? `${totalStrips}s` : ''}{totalStrips > 0 && individualLooseUnits > 0 ? ' + ' : ''}{individualLooseUnits > 0 || totalStrips === 0 ? `${individualLooseUnits}u` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-2.5 shrink-0 flex flex-col items-end justify-center">
                      <p className="text-sm font-black text-slate-900 font-mono">${item.price_per_unit.toFixed(2)}<span className="text-[10px] font-bold text-slate-400">/u</span></p>
                      
                      {/* 🛠️ INLINE QUANTITY ADJUSTER CONTROLS LAYER */}
                      {currentCartMatch ? (
                        <div className="flex items-center bg-slate-900 text-white rounded-xl h-8 p-0.5 shadow-sm">
                          <button 
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white transition-colors active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-black text-xs text-center px-2.5 min-w-[24px]">{currentCartMatch.quantityNeeded}</span>
                          <button 
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white transition-colors active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => addToCart(item)}
                          className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-slate-400 bg-white border border-dashed p-8 rounded-2xl text-center font-medium">No pharmacy matches located within current inventory.</p>
              )}
            </div>
          </div>

          {/* FLOATING E-COMMERCE SHOPPING BAG DRAWER WITH CLEAR BUTTON */}
          {cart.length > 0 && (
            <div className="fixed bottom-24 left-0 right-0 z-40 px-5 w-full max-w-md mx-auto pointer-events-none animate-in slide-in-from-bottom-8 duration-200">
              <div 
                onClick={() => setCurrentScreen('checkout')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-4 shadow-[0_12px_28px_rgba(79,70,229,0.3)] border border-indigo-500 flex items-center justify-between cursor-pointer pointer-events-auto transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-inner"><ShoppingBag className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-100">Review Basket Summary</h4>
                    <p className="text-sm font-extrabold">{totalBasketCount} {totalBasketCount === 1 ? 'item' : 'items'} ready</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  {/* 🛠️ DELETE ALL ITEMS BUTTON */}
                  <button 
                    onClick={clearEntireBasket}
                    title="Clear entire cart list"
                    className="w-8 h-8 rounded-xl bg-indigo-700/80 hover:bg-rose-600 text-indigo-200 hover:text-white flex items-center justify-center transition-all border border-indigo-500/20 active:scale-90 mr-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 font-mono font-black text-base bg-indigo-700 px-3.5 py-1.5 rounded-xl border border-indigo-500/40">
                    ${totalBillAmount.toFixed(2)}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      ) : (
        <CheckoutScreen 
          cart={cart}
          onBack={() => setCurrentScreen('catalog')}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          totalAmount={totalBillAmount}
          actionLoading={actionLoading}
          onSubmitOrder={handleFinalOrderCheckout}
        />
      )}

    </div>
  );
};