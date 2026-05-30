import { AuthProvider, useAuth } from './context/AuthContext';
import { MobileGuard } from './components/MobileGuard';
import { LoginScreen } from './components/LoginScreen';
import { SuperadminDashboard } from './components/SuperadminDashboard';
import { Button } from './components/ui/button';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { MedicalDashboard } from './components/MedicalDashboard';
function AppContent() {
  const { user, role, isMedicalEnabled, loading, signOut } = useAuth();

  // 1. Global Loading State Spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // 2. Unauthenticated Gate (Redirects to Login if no token exists)
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Security Gate: Check for Suspended / Disabled Medical Store Accounts
  if (role === 'medical_owner' && !isMedicalEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Terminal Suspended</h1>
        <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed">
          Your access privileges for this medical terminal have been disabled by the system administrator. Please contact support.
        </p>
        <Button onClick={signOut} variant="outline" className="mt-6 w-full max-w-xs h-11 rounded-xl">
          <LogOut className="w-4 h-4 mr-2" /> Back to Login
        </Button>
      </div>
    );
  }

  // 4. Authenticated View Gateway: Superadmin Route
  if (role === 'superadmin') {
    return <SuperadminDashboard />;
  }

  // 5. Authenticated View Gateway: Medical Owner Route (Staged for Phase 5)
  return <MedicalDashboard />;
  // return (
  //   <div className="p-6 min-h-screen bg-slate-50 flex flex-col justify-between">
  //     <div className="space-y-2">
  //       <span className="text-xs font-semibold tracking-wider uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
  //         Store Active
  //       </span>
  //       <h1 className="text-2xl font-bold text-slate-900 pt-2">Medical Store Terminal</h1>
  //       <p className="text-xs text-slate-500">Secure store operations workspace coming next.</p>
  //     </div>

  //     <Button onClick={signOut} className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium">
  //       <LogOut className="w-4 h-4 mr-2" /> Terminate Session
  //     </Button>
  //   </div>
  // );
}

function App() {
  return (
    <AuthProvider>
      <MobileGuard>
        <AppContent />
      </MobileGuard>
    </AuthProvider>
  );
}

export default App;