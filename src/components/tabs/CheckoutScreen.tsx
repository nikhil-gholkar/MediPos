import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Plus, Minus, Trash2, ArrowLeft, Loader2, 
  CheckCircle2, User, Phone, CreditCard, Wallet, QrCode 
} from 'lucide-react';

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

interface CheckoutScreenProps {
  cart: CartItem[];
  onBack: () => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  paymentMethod: 'cash' | 'upi' | 'card';
  setPaymentMethod: (val: 'cash' | 'upi' | 'card') => void;
  totalAmount: number;
  actionLoading: boolean;
  onSubmitOrder: () => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart,
  onBack,
  onUpdateQuantity,
  onRemoveItem,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  paymentMethod,
  setPaymentMethod,
  totalAmount,
  actionLoading,
  onSubmitOrder,
}) => {
  return (
    <div className="px-5 pt-6 space-y-5 animate-in slide-in-from-right-4 duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
        <button 
          onClick={onBack}
          className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Checkout Ledger</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Finalize Transaction Parameters</p>
        </div>
      </div>

      {/* ITEM BASKET SUMMARY GRID */}
      <div className="space-y-2.5">
        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-0.5">Line Items Summary</Label>
        
        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
          {cart.map(item => (
            <div key={item.inventoryItem.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1 max-w-[50%]">
                <h4 className="font-extrabold text-slate-900 text-sm truncate">{item.inventoryItem.medicine_name}</h4>
                <p className="text-xs font-mono font-bold text-indigo-600">${(item.inventoryItem.price_per_unit * item.quantityNeeded).toFixed(2)}</p>
              </div>

              {/* TACTILE QUANTITY COUNTERS */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onUpdateQuantity(item.inventoryItem.id, -1)}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold active:scale-90 transition-transform"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-black font-mono text-sm text-slate-900 w-6 text-center">{item.quantityNeeded}</span>
                <button 
                  onClick={() => onUpdateQuantity(item.inventoryItem.id, 1)}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold active:scale-90 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => onRemoveItem(item.inventoryItem.id)}
                  className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center ml-1 active:scale-90 transition-transform"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OPTIONAL CUSTOMER DATA FIELDS */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-4 shadow-sm space-y-3">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest pl-0.5">Customer Information (Optional)</p>
        
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1"><User className="w-3 h-3" /> Full Name</Label>
            <Input 
              placeholder="e.g. John Doe" 
              value={customerName} 
              onChange={e => setCustomerName(e.target.value)} 
              className="h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Mobile Phone</Label>
            <Input 
              type="tel"
              placeholder="e.g. 9876543210" 
              value={customerPhone} 
              onChange={e => setCustomerPhone(e.target.value)} 
              className="h-10 text-xs rounded-xl border-slate-200 font-mono focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* PAYMENT SELECTION CHANNEL */}
      <div className="space-y-2.5">
        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-0.5">Select Settlement Channel</Label>
        <div className="grid grid-cols-3 gap-2">
          
          <button 
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              paymentMethod === 'cash' 
                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">Cash</span>
          </button>

          <button 
            type="button"
            onClick={() => setPaymentMethod('upi')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              paymentMethod === 'upi' 
                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">UPI App</span>
          </button>

          <button 
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              paymentMethod === 'card' 
                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">Swipe Card</span>
          </button>

        </div>
      </div>

      {/* INVOICE CHECKOUT PANEL */}
      <div className="bg-slate-950 text-white rounded-3xl p-5 shadow-[0_-8px_32px_rgba(15,23,42,0.18)] space-y-4 pt-4 mt-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Payable Remittance</span>
          <span className="text-2xl font-black font-mono text-emerald-400">${totalAmount.toFixed(2)}</span>
        </div>

        <Button 
          onClick={onSubmitOrder}
          disabled={actionLoading}
          className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" /> Confirm Receipt Payment
            </>
          )}
        </Button>
      </div>

    </div>
  );
};