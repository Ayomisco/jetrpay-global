'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '@/store/auth';
import { useWallets } from '@/lib/queries';
import { toast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';

export default function ReceivePage() {
  const { user } = useAuthStore();
  const { data: wallets } = useWallets();
  const [copied, setCopied] = useState<string | null>(null);
  const primaryWallet = wallets?.[0];

  const paymentLink = `https://jetrpay.io/pay/${user?.id || 'your-id'}`;
  const email = user?.email || '';

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const shareOptions = [
    { label: 'Payment link', value: paymentLink, key: 'link', icon: '🔗' },
    { label: 'Email', value: email, key: 'email', icon: '✉️' },
    ...(primaryWallet ? [{ label: `${primaryWallet.currency} wallet`, value: primaryWallet.id, key: 'wallet', icon: '💳' }] : []),
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Receive Money</h1>
        <p className="text-white/50 text-sm">Share your details to receive payments</p>
      </div>

      {/* QR Card */}
      <Card className="flex flex-col items-center py-8 gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mb-1">
          J
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">{user?.fullName || 'Your Account'}</p>
          <p className="text-white/40 text-sm">{user?.email}</p>
        </div>

        {/* QR Code */}
        <div className="p-4 rounded-2xl bg-white">
          <QRCodeSVG value={paymentLink} size={160} level="H" />
        </div>
        <p className="text-xs text-white/30 text-center">Scan to pay with JetrPay</p>
      </Card>

      {/* Share options */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Share details</h2>
        {shareOptions.map(({ label, value, key, icon }) => (
          <Card
            key={key}
            className="flex items-center gap-4"
            onClick={() => copy(value, key)}
          >
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-0.5">{label}</p>
              <p className="text-sm text-white font-medium truncate">{value}</p>
            </div>
            <span className="text-xs text-indigo-400 flex-shrink-0">
              {copied === key ? '✓ Copied' : 'Copy'}
            </span>
          </Card>
        ))}
      </div>

      {/* Info */}
      <div className="glass rounded-2xl px-4 py-3 text-xs text-white/40 leading-relaxed">
        💡 P2P transfers from JetrPay users are instant and free. Bank transfers from external accounts arrive via Zynta rails in 15–60 minutes.
      </div>
    </div>
  );
}
