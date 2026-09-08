'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Tv, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('media.manager@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xs p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold mx-auto shadow-xs">
            <Tv className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MOMS Platform</h1>
          <p className="text-xs text-slate-500">Media Operations Management System</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Fill Demo Credentials */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Select Demo Role Account (Password: Password123!)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickFill('media.manager@example.com')}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-900 text-left transition-colors"
            >
              <div className="font-bold">Media Manager</div>
              <div className="text-[10px] text-purple-600">media.manager@...</div>
            </button>

            <button
              type="button"
              onClick={() => quickFill('technical.manager@example.com')}
              className="p-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100/80 border border-cyan-200 text-cyan-900 text-left transition-colors"
            >
              <div className="font-bold">Tech Manager</div>
              <div className="text-[10px] text-cyan-600">technical.manager@...</div>
            </button>

            <button
              type="button"
              onClick={() => quickFill('smm@example.com')}
              className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 text-left transition-colors"
            >
              <div className="font-bold">Social Media Mgr</div>
              <div className="text-[10px] text-blue-600">smm@example.com</div>
            </button>

            <button
              type="button"
              onClick={() => quickFill('marketing.manager@example.com')}
              className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-left transition-colors"
            >
              <div className="font-bold">Marketing Mgr (Client)</div>
              <div className="text-[10px] text-amber-600">marketing.manager@...</div>
            </button>

            <button
              type="button"
              onClick={() => quickFill('staff1@example.com')}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-left transition-colors col-span-2"
            >
              <div className="font-bold">Staff: Ahmed Khan (Video Editor)</div>
              <div className="text-[10px] text-emerald-600">staff1@example.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
