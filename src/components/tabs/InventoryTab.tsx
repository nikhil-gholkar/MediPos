import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Plus, Search, Package, ChevronDown, ChevronUp, 
  MapPin, Calendar, DollarSign, Layers, Loader2, Info 
} from 'lucide-react';

interface InventoryTabProps {
  medicalId: string | null;
}

interface MedicineStockItem {
  id: string;
  medicine_name: string;
  generic_name: string;
  category: string;
  batch_number: string;
  expiry_date: string;
  quantity: number; // total loose units inside database
  conversion_factor: number;
  price_per_unit: number; 
  purchase_price: number; 
  rack_location: string;
  min_stock_limit: number;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ medicalId }) => {
  const [inventory, setInventory] = useState<MedicineStockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Modal & Form Step States
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);
  const [formStep, setFormStep] = useState(1); // Step 1: Base Medicine Profile, Step 2: Batch Configuration
  const [actionLoading, setActionLoading] = useState(false);

  // Form State Elements
  const [medName, setMedName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('Tablets');
  const [rackLocation, setRackLocation] = useState('');
  const [conversionFactor, setConversionFactor] = useState('10');
  const [minStockLimit, setMinStockLimit] = useState('10');
  
  // Sub-Form Batch State Elements
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [inputStrips, setInputStrips] = useState('');
  const [costPerStrip, setCostPerStrip] = useState('');
  const [sellPerStrip, setSellPerStrip] = useState('');

  useEffect(() => {
    if (medicalId) {
      fetchInventoryStock();
    }
  }, [medicalId]);

  const fetchInventoryStock = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('medical_id', medicalId)
      .order('medicine_name', { ascending: true });
    setInventory(data || []);
  };

  const handleFormNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      alert('Please fill out the Medicine Name before moving forward.');
      return;
    }
    setFormStep(2);
  };

  const handleCommitStockSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const factor = parseInt(conversionFactor) || 1;
      const totalLooseUnits = (parseInt(inputStrips) || 0) * factor;
      const calculatedPurchasePricePerUnit = (parseFloat(costPerStrip) || 0) / factor;
      const calculatedSellingPricePerUnit = (parseFloat(sellPerStrip) || 0) / factor;

      const { error } = await supabase
        .from('inventory')
        .insert([{
          medical_id: medicalId,
          medicine_name: medName,
          generic_name: genericName || null,
          category: category,
          batch_number: batchNumber,
          expiry_date: expiryDate,
          quantity: totalLooseUnits,
          conversion_factor: factor,
          purchase_price: calculatedPurchasePricePerUnit,
          price_per_unit: calculatedSellingPricePerUnit,
          rack_location: rackLocation || null,
          min_stock_limit: parseInt(minStockLimit) || 10
        }]);

      if (error) throw error;

      // Close modal and reset fields
      setIsFabModalOpen(false);
      setFormStep(1);
      setMedName(''); setGenericName(''); setCategory('Tablets'); setRackLocation('');
      setConversionFactor('10'); setMinStockLimit('10'); setBatchNumber('');
      setExpiryDate(''); setInputStrips(''); setCostPerStrip(''); setSellPerStrip('');
      
      fetchInventoryStock();
      alert('Stock record initialized and saved successfully!');

    } catch (err: any) {
      alert(err.message || 'An error occurred while executing the inventory insert transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter and compute active presentation inventory values
  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.generic_name && item.generic_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 relative p-4 space-y-4 animate-in fade-in-50 duration-200">
      
      {/* TITLE VIEW */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Stock Room</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vault Inventory Trackers</p>
      </div>

      {/* TOP STICKY LOOKUP SEARCH BAR FIELD */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Filter Vault by Brand or Chemical layout..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-sm text-xs"
        />
      </div>

      {/* HORIZONTAL CATEGORY CHIP SLIDERS BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['All', 'Tablets', 'Syrups', 'Injections', 'Others'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-[10px] font-black uppercase px-3.5 py-2 rounded-full transition-all border whitespace-nowrap ${
              selectedCategory === cat 
                ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* COMPACT MED STOCK FEED GRID */}
      <div className="space-y-2 pb-24">
        {filteredInventory.map(item => {
          const isCardExpanded = expandedCardId === item.id;
          const totalStrips = Math.floor(item.quantity / item.conversion_factor);
          const remainingLooseUnits = item.quantity % item.conversion_factor;

          return (
            <div 
              key={item.id} 
              className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-150"
            >
              {/* Visible Header Card Block */}
              <div 
                onClick={() => setExpandedCardId(isCardExpanded ? null : item.id)}
                className="p-3.5 flex items-center justify-between text-xs cursor-pointer select-none hover:bg-slate-50/40"
              >
                <div className="space-y-0.5 max-w-[220px]">
                  <h3 className="font-bold text-slate-900 truncate">{item.medicine_name}</h3>
                  <p className="text-[10px] text-slate-400 italic truncate">{item.generic_name || 'No compound details mapped'}</p>
                </div>
                
                <div className="flex items-center gap-2.5 pl-2">
                  <div className="text-right whitespace-nowrap">
                    <p className="font-black text-slate-800 font-mono">
                      {totalStrips > 0 ? `${totalStrips}s` : ''}
                      {totalStrips > 0 && remainingLooseUnits > 0 ? ' + ' : ''}
                      {remainingLooseUnits > 0 || totalStrips === 0 ? `${remainingLooseUnits}u` : ''}
                    </p>
                    <p className="text-[9px] text-indigo-500 font-bold uppercase font-mono tracking-wider">{item.category}</p>
                  </div>
                  {isCardExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Collapsible Expanded Detailed Batch Specifications Section */}
              {isCardExpanded && (
                <div className="bg-slate-50/60 p-3.5 border-t border-slate-100 grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-mono text-slate-600 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-slate-400" /> <span>Batch: <b className="text-slate-800">{item.batch_number}</b></span></div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> <span>Location: <b className="text-slate-800">{item.rack_location || 'N/A'}</b></span></div>
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> <span>Expiry: <b className="text-slate-800">{item.expiry_date}</b></span></div>
                  <div className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-slate-400" /> <span>Factor: <b className="text-slate-800">{item.conversion_factor} u/strp</b></span></div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> <span>Unit Cost: <b className="text-slate-800">${item.purchase_price.toFixed(2)}</b></span></div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> <span>Unit Retail: <b className="text-emerald-600">${item.price_per_unit.toFixed(2)}</b></span></div>
                </div>
              )}
            </div>
          );
        })}

        {filteredInventory.length === 0 && (
          <div className="text-center py-16 text-xs text-slate-400 bg-white border border-dashed rounded-xl p-4">
            No stock listings discovered in this filter view category level.
          </div>
        )}
      </div>

      {/* POSITIONED FLOATING ACTION BUTTON (FAB) TRIGGER */}
      <Button 
        onClick={() => { setFormStep(1); setIsFabModalOpen(true); }}
        className="fixed bottom-18 right-4 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl z-40 p-0 flex items-center justify-center transition-transform active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* THE CLEAN STEPPED FORM MODAL POPUP DIALOG */}
      <Dialog open={isFabModalOpen} onOpenChange={setIsFabModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl p-5 border-0 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black text-slate-900">
              {formStep === 1 ? 'Step 1: Medicine Profile' : 'Step 2: Batch Configuration'}
            </DialogTitle>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {formStep === 1 ? 'Configure core product identification variables' : 'Input structural unit metrics and ledger configurations'}
            </p>
          </DialogHeader>

          {/* STEP 1 LAYOUT: INITIAL PROFILE FORM SUBMISSION */}
          {formStep === 1 ? (
            <form onSubmit={handleFormNextStep} className="space-y-3.5 pt-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500">Medicine Brand Name</Label>
                <Input required placeholder="E.g., Augmentin 625 DUO" value={medName} onChange={e => setMedName(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500">Generic Formula Composition</Label>
                <Input placeholder="E.g., Amoxicillin + Clavulanic Acid" value={genericName} onChange={e => setGenericName(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">Form Category</Label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-2.5 text-xs font-medium bg-white shadow-sm"
                  >
                    <option value="Tablets">Tablets</option>
                    <option value="Syrups">Syrups</option>
                    <option value="Injections">Injections</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">Shelf Rack Location</Label>
                  <Input placeholder="E.g., Box A-4" value={rackLocation} onChange={e => setRackLocation(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Pills Per Strip Factor</Label>
                  <Input required type="number" min="1" value={conversionFactor} onChange={e => setConversionFactor(e.target.value)} className="h-9 font-bold font-mono text-xs bg-white border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Low Stock Limit (u)</Label>
                  <Input required type="number" min="1" value={minStockLimit} onChange={e => setMinStockLimit(e.target.value)} className="h-9 font-bold font-mono text-xs bg-white border-slate-200" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl mt-2 transition-all shadow-md">
                Proceed to Batch Registry →
              </Button>
            </form>
          ) : (
            
            /* STEP 2 LAYOUT: DETAILED BATCH METRICS */
            <form onSubmit={handleCommitStockSubmission} className="space-y-3.5 pt-2 text-xs animate-in slide-in-from-right-4 duration-200">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">Batch Identifier Code</Label>
                  <Input required placeholder="E.g., BT-X902" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">Expiration Lock Date</Label>
                  <Input required type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 shadow-sm font-mono" />
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">Total Strip/Box Quantity Received</Label>
                  <Input required type="number" min="1" placeholder="E.g., 25" value={inputStrips} onChange={e => setInputStrips(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">Purchase Cost (Per Strip)</Label>
                    <Input required type="number" step="0.01" min="0" placeholder="0.00" value={costPerStrip} onChange={e => setCostPerStrip(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 bg-white font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">Retail Price (Per Strip)</Label>
                    <Input required type="number" step="0.01" min="0" placeholder="0.00" value={sellPerStrip} onChange={e => setSellPerStrip(e.target.value)} className="h-10 text-xs rounded-xl border-slate-200 bg-white font-mono" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormStep(1)} className="h-11 rounded-xl font-bold px-4 border-slate-200 text-slate-500">
                  ← Back
                </Button>
                <Button type="submit" disabled={actionLoading} className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-md">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Commit Stock Entry'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};