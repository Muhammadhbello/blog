'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

type LoginType = 'user' | 'business' | 'consultant';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>('user');

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'business' || type === 'consultant') {
      setLoginType(type);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (loginType === 'user') {
        // Regular user login via AuthContext
        const response = await login(email, password);
        const userRole = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').role : null;
        
        if (userRole === 'super_admin') {
          router.push('/platform');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Business or Consultant login via direct API
        const response = await apiClient.post('/auth/login', {
          email,
          password,
          login_type: loginType,
        });

        const { user, token, login_type } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('login_type', login_type);

        // Redirect based on login type
        if (login_type === 'business') {
          router.push('/business-portal');
        } else if (login_type === 'consultant') {
          router.push('/consultant-portal');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const getLoginConfig = () => {
    switch (loginType) {
      case 'business':
        return {
          title: 'Business Portal',
          subtitle: 'View your invoices and payment status',
          gradient: 'from-emerald-600 to-teal-600',
          bgGradient: 'from-emerald-50 via-teal-50 to-cyan-50',
          placeholder: 'business@example.com',
        };
      case 'consultant':
        return {
          title: 'Consultant Portal',
          subtitle: 'Manage your collections and closings',
          gradient: 'from-indigo-600 to-purple-600',
          bgGradient: 'from-indigo-50 via-purple-50 to-pink-50',
          placeholder: 'consultant@example.com',
        };
      default:
        return {
          title: 'FlexCloud',
          subtitle: 'Multi-Tenant Revenue Intelligence System',
          gradient: 'from-blue-600 to-purple-600',
          bgGradient: 'from-blue-50 via-indigo-50 to-purple-50',
          placeholder: 'chairman@demo-lga.gov',
        };
    }
  };

  const config = getLoginConfig();

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.bgGradient}`}>
      <div className="max-w-md w-full space-y-8 p-10 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
        {/* Login Type Tabs */}
        <div className="flex border-b border-gray-200">
          {(['user', 'business', 'consultant'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setLoginType(type)}
              className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                loginType === type
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {type === 'user' ? 'Staff' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div>
          <h2 className={`text-center text-4xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            {config.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {config.subtitle}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded" data-testid="login-error">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder={config.placeholder}
                data-testid="login-email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="password123"
                data-testid="login-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            data-testid="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {loginType === 'user' && (
            <div className="text-sm text-center text-gray-600">
              <p className="mt-4 font-semibold">Platform Admin:</p>
              <p className="text-xs mt-1">admin@flexcloud.com / password123</p>
              <p className="mt-3 font-semibold">Tenant Users:</p>
              <p className="text-xs mt-1">Chairman: chairman@demo-lga.gov / password123</p>
              <p className="text-xs">Treasurer: treasurer@demo-lga.gov / password123</p>
            </div>
          )}

          {loginType === 'business' && (
            <div className="text-sm text-center text-gray-600">
              <p className="mt-4 font-semibold">Business Account:</p>
              <p className="text-xs mt-1">Login with your registered business email</p>
              <p className="text-xs mt-1">to view invoices and payment history</p>
            </div>
          )}

          {loginType === 'consultant' && (
            <div className="text-sm text-center text-gray-600">
              <p className="mt-4 font-semibold">Consultant Account:</p>
              <p className="text-xs mt-1">Login to access your assigned revenue points</p>
              <p className="text-xs mt-1">and manage daily collections</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
