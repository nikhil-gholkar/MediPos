import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Loader2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full border-0 shadow-none bg-transparent">
        <CardHeader className="space-y-2 text-center pt-0 px-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            MediPOS Terminal
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Enter your credentials to access your terminal session
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium animate-fade-in">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-slate-600 font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@medical.com"
                  className="pl-9 h-11 rounded-xl border-slate-200 focus-visible:ring-emerald-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-slate-600 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-11 rounded-xl border-slate-200 focus-visible:ring-emerald-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-900 font-medium text-white shadow-sm mt-2 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </span>
              ) : (
                "Sign In to Terminal"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};