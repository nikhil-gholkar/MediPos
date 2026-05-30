import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, Plus, Power, PowerOff, ShieldCheck, Store } from 'lucide-react';

interface MedicalStore {
  id: string;
  name: string;
  license_number: string;
  is_enabled: boolean;
  owner_id: string;
  created_at: string;
}

// 1. HEADLESS CONNECTION ENGINE FACTORY
// This operates inside isolated memory, ensuring account registration 
// NEVER updates or hijacks your active browser session tokens.
const createHeadlessClient = () => {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false, // CRITICAL: Completely prevents local session switching
        autoRefreshToken: false,
      },
    }
  );
};

export const SuperadminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [stores, setStores] = useState<MedicalStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [shopName, setShopName] = useState('');
  const [license, setLicense] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchMedicalStores();
  }, []);

  const fetchMedicalStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medicals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (err: any) {
      console.error('Error fetching storefronts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      // Initialize an isolated, headless connection client instance
      const headlessClient = createHeadlessClient();

      // 1. Register the credentials inside the Auth schema through the headless channel
      const { data: authData, error: authError } = await headlessClient.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'medical_owner' }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Isolated auth engine failed to instantiate workspace credentials.');

      // 2. Directly write the medical shop row utilizing active Superadmin authorization privileges
      const { error: medError } = await supabase
        .from('medicals')
        .insert([{
          owner_id: authData.user.id,
          name: shopName,
          license_number: license,
          is_enabled: true
        }]);

      if (medError) throw medError;

      alert('Medical Store registered successfully! You remain logged in securely as Superadmin.');
      
      // Smooth reset fields
      setShopName('');
      setLicense('');
      setEmail('');
      setPassword('');
      setIsDialogOpen(false);
      fetchMedicalStores();

    } catch (err: any) {
      alert(err.message || 'An error occurred during pharmacy profile allocations.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('medicals')
        .update({ is_enabled: !currentStatus })
        .eq('id', storeId);

      if (error) throw error;
      fetchMedicalStores();
    } catch (err: any) {
      alert(err.message || 'Could not alter execution privilege matrix status.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      {/* Upper Control Bar Block Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">HQ Control Panel</h1>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{user?.email}</p>
          </div>
        </div>

        <Button onClick={signOut} variant="ghost" size="sm" className="text-xs text-red-500 hover:bg-red-50 h-9 px-3 rounded-xl font-medium">
          Exit Session
        </Button>
      </div>

      {/* Terminal Registration Hub Block */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Managed Terminals</h2>
          <p className="text-[10px] text-slate-400 font-medium">Active operational workspace instances</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl h-9 px-3 gap-1 shadow-sm">
              <Plus className="w-4 h-4" /> Provision Shop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl p-5 border-0 shadow-lg">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-bold text-slate-900">Provision Terminal Branch</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">Initialize official pharmacy accounts instantly without email confirmations.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateMedical} className="space-y-3.5 mt-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-500">Pharmacy Name</Label>
                <Input required value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Apollo Pharmacy Ltd" className="h-10 rounded-xl border-slate-200" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-500">Government Drug License Number</Label>
                <Input required value={license} onChange={e => setLicense(e.target.value)} placeholder="DL-92841/X" className="h-10 rounded-xl border-slate-200" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-500">Manager Login Email</Label>
                <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@pharmacy.com" className="h-10 rounded-xl border-slate-200" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-500">Terminal Access Password</Label>
                <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-xl border-slate-200" />
              </div>

              <Button type="submit" disabled={actionLoading} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm mt-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Instantiate Workspace Profile'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid Dashboard View Loop Layout */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 bg-white border rounded-2xl p-4 shadow-sm">
            No dynamic storefront records indexed inside system schemas yet.
          </div>
        ) : (
          stores.map(store => (
            <Card key={store.id} className="border-0 shadow-sm rounded-xl overflow-hidden bg-white border-l-4 border-l-slate-200">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-1 max-w-[180px]">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                    <h3 className="font-bold text-slate-900 truncate">{store.name}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium font-mono">Lic: {store.license_number}</p>
                  <p className="text-[9px] text-slate-400">UUID: {store.owner_id.substring(0,8)}...</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${store.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {store.is_enabled ? 'Operational' : 'Suspended'}
                  </span>
                  
                  <Button 
                    size="sm"
                    variant={store.is_enabled ? "destructive" : "default"}
                    onClick={() => toggleStoreStatus(store.id, store.is_enabled)}
                    className={`h-8 px-2.5 rounded-lg text-[10px] font-medium ${!store.is_enabled && 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                  >
                    {store.is_enabled ? <><PowerOff className="w-3 h-3 mr-1" /> Freeze</> : <><Power className="w-3 h-3 mr-1" /> Unfreeze</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};