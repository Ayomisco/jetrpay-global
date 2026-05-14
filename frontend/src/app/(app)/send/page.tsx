'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSendP2P, useSendBank, useWallets } from '@/lib/queries';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

type Tab = 'p2p' | 'bank';

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank' },
  { code: '050', name: 'EcoBank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '014', name: 'Mainstreet Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'ProvidusBank' },
  { code: '039', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'SunTrust Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export default function SendPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('p2p');
  const { data: wallets } = useWallets();
  const walletList = wallets || [];
  const defaultWallet = walletList[0];

  // P2P
  const [p2pForm, setP2pForm] = useState({ recipientEmail: '', amount: '', description: '' });
  const [p2pErrors, setP2pErrors] = useState<Record<string, string>>({});
  const sendP2P = useSendP2P();

  // Bank
  const [bankForm, setBankForm] = useState({
    recipientAccountNumber: '', recipientBankCode: '', recipientAccountName: '', amount: '', narration: '',
  });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const sendBank = useSendBank();

  const handleP2P = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!p2pForm.recipientEmail) errs.recipientEmail = 'Enter recipient email or phone';
    if (!p2pForm.amount || +p2pForm.amount <= 0) errs.amount = 'Enter a valid amount';
    if (Object.keys(errs).length) { setP2pErrors(errs); return; }
    setP2pErrors({});

    try {
      if (!defaultWallet?.id) { toast('No wallet available to send from', 'error'); return; }
      await sendP2P.mutateAsync({
        senderWalletId: defaultWallet.id,
        recipientEmail: p2pForm.recipientEmail,
        amount: parseFloat(p2pForm.amount),
        currency: defaultWallet.currency,
        description: p2pForm.description,
      });
      toast('Transfer sent successfully!', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Transfer failed. Please try again.', 'error');
    }
  };

  const handleBankSubmit = async () => {
    try {
      await sendBank.mutateAsync({
        recipientAccountNumber: bankForm.recipientAccountNumber,
        recipientBankCode: bankForm.recipientBankCode,
        recipientAccountName: bankForm.recipientAccountName,
        amount: parseFloat(bankForm.amount),
        currency: defaultWallet?.currency || 'NGN',
        narration: bankForm.narration,
      });
      toast('Bank transfer initiated! Arrives in 15–60 minutes.', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Transfer failed. Please try again.', 'error');
    }
    setShowConfirm(false);
  };

  const validateBank = () => {
    const errs: Record<string, string> = {};
    if (!bankForm.recipientAccountNumber) errs.recipientAccountNumber = 'Account number is required';
    if (!bankForm.recipientBankCode) errs.recipientBankCode = 'Select a bank';
    if (!bankForm.recipientAccountName) errs.recipientAccountName = 'Account name is required';
    if (!bankForm.amount || +bankForm.amount <= 0) errs.amount = 'Enter a valid amount';
    if (Object.keys(errs).length) { setBankErrors(errs); return false; }
    setBankErrors({});
    return true;
  };

  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankForm.recipientBankCode);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Send Money</h1>
        <p className="text-white/50 text-sm">Transfer to a JetrPay user or any bank account</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        {[{ id: 'p2p', label: 'To JetrPay user' }, { id: 'bank', label: 'To bank account' }].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-gradient-brand text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'p2p' ? (
        <Card>
          <form onSubmit={handleP2P} className="flex flex-col gap-4">
            <Input
              label="Recipient email or phone"
              placeholder="friend@email.com"
              value={p2pForm.recipientEmail}
              onChange={(e) => setP2pForm((f) => ({ ...f, recipientEmail: e.target.value }))}
              error={p2pErrors.recipientEmail}
            />
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              value={p2pForm.amount}
              onChange={(e) => setP2pForm((f) => ({ ...f, amount: e.target.value }))}
              error={p2pErrors.amount}
              prefix={<span className="text-sm">{defaultWallet?.currency || '$'}</span>}
            />
            <Input
              label="Note (optional)"
              placeholder="What's this for?"
              value={p2pForm.description}
              onChange={(e) => setP2pForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="glass-dark rounded-xl px-4 py-3 text-xs text-white/40">
              ✓ Instant • ✓ Free • ✓ No limits between JetrPay users
            </div>
            <Button type="submit" loading={sendP2P.isPending} className="w-full py-3.5">
              Send money →
            </Button>
          </form>
        </Card>
      ) : (
        <>
          {!showConfirm ? (
            <Card>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-white/70">Bank</label>
                  <select
                    value={bankForm.recipientBankCode}
                    onChange={(e) => setBankForm((f) => ({ ...f, recipientBankCode: e.target.value }))}
                    className={`input-glass px-4 py-3 text-sm ${bankErrors.recipientBankCode ? 'border-rose-500/50' : ''}`}
                  >
                    <option value="">Select bank</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                  {bankErrors.recipientBankCode && <p className="text-xs text-rose-400">{bankErrors.recipientBankCode}</p>}
                </div>
                <Input
                  label="Account number"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="0123456789"
                  value={bankForm.recipientAccountNumber}
                  onChange={(e) => setBankForm((f) => ({ ...f, recipientAccountNumber: e.target.value.replace(/\D/g, '') }))}
                  error={bankErrors.recipientAccountNumber}
                />
                <Input
                  label="Account name"
                  placeholder="Ayomide Johnson"
                  value={bankForm.recipientAccountName}
                  onChange={(e) => setBankForm((f) => ({ ...f, recipientAccountName: e.target.value }))}
                  error={bankErrors.recipientAccountName}
                />
                <Input
                  label="Amount (USDC)"
                  type="number"
                  placeholder="0.00"
                  value={bankForm.amount}
                  onChange={(e) => setBankForm((f) => ({ ...f, amount: e.target.value }))}
                  error={bankErrors.amount}
                  prefix="$"
                />
                <Input
                  label="Narration (optional)"
                  placeholder="School fees, rent..."
                  value={bankForm.narration}
                  onChange={(e) => setBankForm((f) => ({ ...f, narration: e.target.value }))}
                />
                <div className="glass-dark rounded-xl px-4 py-3 text-xs text-white/40 leading-relaxed">
                  ⏱ Arrives in 15–60 minutes via Zynta rails • Fees embedded in exchange rate
                </div>
                <Button className="w-full py-3.5" onClick={() => { if (validateBank()) setShowConfirm(true); }}>
                  Review transfer →
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="animate-slide-up">
              <h2 className="font-semibold text-white mb-4">Confirm transfer</h2>
              <div className="flex flex-col gap-3 mb-6">
                {[
                  ['Bank', selectedBank?.name || bankForm.recipientBankCode],
                  ['Account', bankForm.recipientAccountNumber],
                  ['Name', bankForm.recipientAccountName],
                  ['Amount', formatCurrency(+bankForm.amount, 'USD')],
                  ['Narration', bankForm.narration || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 py-3" onClick={() => setShowConfirm(false)}>
                  Edit
                </Button>
                <Button className="flex-1 py-3" loading={sendBank.isPending} onClick={handleBankSubmit}>
                  Confirm & send
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
