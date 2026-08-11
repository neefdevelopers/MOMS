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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold mx-auto shadow-lg shadow-blue-500/30">
            <Tv className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MOMS Platform</h1>
          <p className="text-xs text-gray-400">Media Operations Management System — V1 MVP</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-200 pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-200 pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Fill Demo Credentials */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Select Demo Role Account (Password: Password123!)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => quickFill('media.manager@example.com')}
              className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 text-left hover:border-purple-600 transition-colors"
            >
              <div className="font-bold">Media Manager</div>
              <div className="text-[10px] text-gray-400">media.manager@...</div>
            </button>

            <button
              onClick={() => quickFill('technical.manager@example.com')}
              className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-left hover:border-cyan-600 transition-colors"
            >
              <div className="font-bold">Tech Manager</div>
              <div className="text-[10px] text-gray-400">technical.manager@...</div>
            </button>

            <button
              onClick={() => quickFill('staff1@example.com')}
              className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-left hover:border-emerald-600 transition-colors col-span-2"
            >
              <div className="font-bold">Staff: Ahmed Khan (Video Editor)</div>
              <div className="text-[10px] text-gray-400">staff1@example.com (Overloaded 9.5h test user)</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
