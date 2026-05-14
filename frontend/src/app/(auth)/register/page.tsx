'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';

type Step = 'info' | 'otp' | 'success';
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export default function RegisterPage() {
  const router = useRouter();
  const { signup, completeOtp } = useAuthStore();
  const [step, setStep] = useState<Step>('info');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '', country: 'NG',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.fullName)  newErrors.fullName = 'Full name is required';
    if (!form.email)     newErrors.email = 'Email is required';
    if (!form.phone)     newErrors.phone = 'Phone number is required';
    if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      await signup({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password, country: form.country });
      setRegisteredEmail(form.email);
      setStep('otp');
      toast('Account created! Check your email for the verification code.', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErrors({ otp: 'Enter the 6-digit code' }); return; }
    setLoading(true);
    try {
      await completeOtp(registeredEmail, otp);
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid code';
      toast(msg, 'error');
      setErrors({ otp: msg });
    } finally {
      setLoading(false);
    }
  };

  if (step === ('success' as Step)) return (
    <div className="glass p-8 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h1>
      <p className="text-white/50 text-sm mb-6">Your JetrPay account is ready. Start sending money across Africa.</p>
      <Button className="w-full py-3.5" onClick={() => router.replace('/dashboard')}>
        Go to Dashboard
      </Button>
    </div>
  );

  return (
    <div className="glass p-7 animate-slide-up">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['info', 'otp'].map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step === s || (step === 'success') || (i === 0 && step === 'otp') ? 'bg-gradient-brand' : 'bg-white/10'}`} />
        ))}
      </div>

      {step === 'info' ? (
        <>
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-sm text-white/50 mb-6">Fast, secure money transfers across Africa</p>
          <form onSubmit={handleInfo} className="flex flex-col gap-4">
            <Input label="Full name" placeholder="Ayomide Johnson" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} error={errors.fullName} />
            <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
            <Input label="Phone number" type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => update('phone', e.target.value)} error={errors.phone} />
            <Input label="Password" type="password" placeholder="Min. 8 characters" value={form.password} onChange={(e) => update('password', e.target.value)} error={errors.password} />
            <Input label="Confirm password" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} error={errors.confirmPassword} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/70">Country</label>
              <select
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className="input-glass px-4 py-3 text-sm"
              >
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="KE">🇰🇪 Kenya</option>
                <option value="GH">🇬🇭 Ghana</option>
                <option value="ZA">🇿🇦 South Africa</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="US">🇺🇸 United States</option>
              </select>
            </div>

            <Button type="submit" loading={loading} className="w-full py-3.5">
              Create account →
            </Button>
          </form>
          <p className="text-center text-sm text-white/40 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">Sign in</Link>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-white mb-1">Verify your email</h1>
          <p className="text-sm text-white/50 mb-6">
            We sent a 6-digit code to <span className="text-white font-medium">{registeredEmail}</span>
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
              Verify email
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
