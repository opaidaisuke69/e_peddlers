import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, ArrowLeft, Loader2, FilePlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import logo from '../../assets/logo.png';

const formatPeddlerId = (input, prevVal = '') => {
  if (!input) return '';
  const isDeleting = input.length < prevVal.length;
  const val = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!val) return '';

  if (val.startsWith('P') || val.startsWith('PE') || val.startsWith('PED')) {
    let rest = '';
    if (val.startsWith('PED')) {
      rest = val.slice(3);
    } else {
      return val;
    }

    rest = rest.replace(/[^0-9]/g, '').slice(0, 9);
    if (!rest) {
      return isDeleting ? 'PED' : 'PED-';
    }

    const yearPart = rest.slice(0, 4);
    const seqPart = rest.slice(4);

    if (rest.length < 4) {
      return `PED-${yearPart}`;
    }

    if (rest.length === 4) {
      return isDeleting ? `PED-${yearPart}` : `PED-${yearPart}-`;
    }

    return `PED-${yearPart}-${seqPart}`;
  }

  // If user started typing digits directly (e.g. 2026...)
  const digits = val.replace(/[^0-9]/g, '').slice(0, 9);
  if (digits.length <= 4) {
    if (digits.length === 4 && !isDeleting) {
      return `PED-${digits}-`;
    }
    return `PED-${digits}`;
  }

  const year = digits.slice(0, 4);
  const seq = digits.slice(4);
  return `PED-${year}-${seq}`;
};

export default function PeddlerLogin() {
  const [peddlerId, setPeddlerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { loginPeddler } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const id = peddlerId.trim().toUpperCase();
    if (!id) {
      setErrorMsg('Please enter your Peddler ID.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const user = await loginPeddler(id);
      success(`Welcome back, ${user.first_name}!`);
      navigate('/peddler');
    } catch (err) {
      setErrorMsg(err.message || 'Peddler ID not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-[760px] bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-emerald-100 overflow-hidden flex flex-col md:grid md:grid-cols-12">
        {/* Left Emerald Panel matching the Landing Page Hero */}
        <div className="md:col-span-5 relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <img
            src={logo}
            alt="City of La Carlota Official Seal"
            className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 md:w-52 md:h-52 object-contain rounded-full bg-white p-1 shadow-lg"
          />
          <div className="relative z-10 mt-3 md:hidden">
            <h2 className="text-sm font-bold text-white tracking-wide">City Government of La Carlota</h2>
            <p className="text-[11px] text-emerald-200">Registered Peddler Portal</p>
          </div>
        </div>

        {/* Right Form Panel - Peddler ID Only */}
        <div className="md:col-span-7 p-6 sm:p-8 md:p-12 flex flex-col justify-center">
          <h1 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4 sm:mb-6">Sign in</h1>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label
                htmlFor="peddlerId"
                className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2"
              >
                Peddler ID
              </label>
              <input
                id="peddlerId"
                type="text"
                value={peddlerId}
                onChange={(e) => {
                  const formatted = formatPeddlerId(e.target.value, peddlerId);
                  setPeddlerId(formatted);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="e.g. PED-2026-12345"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className={`w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all font-mono uppercase ${
                  errorMsg
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-500/25'
                }`}
              />
              {errorMsg && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">{errorMsg}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
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

          {/* Bottom Actions: Submit New Application & Back to site */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
            <Link
              to="/apply-online"
              className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors py-1"
            >
              <FilePlus className="w-4 h-4" />
              <span>Submit New Application</span>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-800 transition-colors py-1"
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
