import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import logo from '../../assets/logo.png';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginStaff } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const user = await loginStaff(email, password);
      success(`Welcome back, ${user.first_name}!`);

      const role = user.role_name?.toLowerCase();
      if (role === 'admin') navigate('/admin');
      else if (role === 'treasury') navigate('/treasury');
      else navigate('/');
    } catch (err) {
      error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[760px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-emerald-100 overflow-hidden grid md:grid-cols-12">
        {/* Left Emerald Panel matching the Landing Page Hero */}
        <div className="md:col-span-5 relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 p-8 md:p-10 flex items-center justify-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <img
            src={logo}
            alt="City of La Carlota Official Seal"
            className="relative z-10 w-44 h-44 md:w-52 md:h-52 object-contain rounded-full bg-white p-1 shadow-lg"
          />
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-8 sm:p-10 md:p-12 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-emerald-900 mb-6">Sign in</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="staffEmail"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Username or Email
              </label>
              <input
                id="staffEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lacarlota.gov.ph"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="staffPassword"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="staffPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to site</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
