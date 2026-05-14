'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi, setTokens } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';

type Step = 'credentials' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { login, completeOtp } = useAuthStore();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email) { setErrors({ email: 'Email is required' }); return; }
    if (!password) { setErrors({ password: 'Password is required' }); return; }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requiresOtp) {
        setStep('otp');
        toast('Check your email for a verification code', 'info');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid credentials';
      toast(msg, 'error');
      setErrors({ password: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErrors({ otp: 'Enter the 6-digit code' }); return; }
    setLoading(true);
    try {
      await completeOtp(email, otp);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid code';
      toast(msg, 'error');
      setErrors({ otp: msg });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      await authApi.resendOtp(email);
      toast('New code sent to your email', 'success');
    } catch {
      toast('Could not resend code. Try again.', 'error');
    }
  };

  return (
    <div className="glass p-7 animate-slide-up">
      {step === 'credentials' ? (
        <>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-white/50 mb-6">Sign in to your JetrPay account</p>
          <form onSubmit={handleCredentials} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <button type="button" className="text-xs text-orange-400 hover:text-orange-300">
                Forgot password?
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full py-3.5">
              Sign in
            </Button>
          </form>
          <p className="text-center text-sm text-white/40 mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium">
              Create one
            </Link>
          </p>
        </>
      ) : (
        <>
          <button onClick={() => setStep('credentials')} className="text-sm text-white/40 hover:text-white mb-4 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white mb-1">Verify your identity</h1>
          <p className="text-sm text-white/50 mb-6">
            Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>
          </p>
          <form onSubmit={handleOtp} className="flex flex-col gap-4">
            <Input
              label="Verification code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              error={errors.otp}
              className="tracking-[0.5em] text-center text-lg"
            />
            <Button type="submit" loading={loading} className="w-full py-3.5">
              Verify & sign in
            </Button>
          </form>
          <p className="text-center text-sm text-white/40 mt-4">
            Didn&apos;t receive it?{' '}
            <button onClick={resendOtp} className="text-orange-400 hover:text-orange-300 font-medium">
              Resend code
            </button>
          </p>
        </>
      )}
    </div>
  );
}
