# JetRPay User Flows & Journey Maps

---

## 1. Onboarding Flow (0-5 minutes)

```
┌─────────────────────────────────────────────────────────────┐
│                    START: User sees app                     │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Sign Up     │
                    │ or Login?   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼─────┐            ┌─────▼────┐
         │ Sign Up  │            │  Login   │
         │ (new)    │            │ (exist)  │
         └────┬─────┘            └─────┬────┘
              │                        │
    ┌─────────▼────────┐              │
    │ Enter phone      │              │
    │ number           │              │
    └────────┬─────────┘              │
             │                        │
    ┌────────▼────────────┐           │
    │ Verify via SMS OTP  │           │
    │ (2-3 min)          │           │
    └────────┬────────────┘           │
             │                        │
    ┌────────▼────────────┐     ┌─────▼────────┐
    │ Create password     │     │ Enter password│
    │ (6+ chars, strong)  │     └─────┬────────┘
    └────────┬────────────┘           │
             │                        │
    ┌────────▼────────────┐           │
    │ Enter basic info:   │           │
    │ • Full name         │           │
    │ • Email             │           │
    │ • Date of birth     │           │
    │ • Country/Currency  │           │
    └────────┬────────────┘           │
             │                        │
    ┌────────▼────────────────────────┘
    │
    ├─→ Choose currency wallet (USD/EUR/NGN/etc.)
    │
    ├─→ KYC LEVEL 1
    │   ├─ Take selfie (liveness check)
    │   ├─ Scan ID document
    │   ├─ Send to Smile Identity
    │   └─ Wait for verification (usually < 2 min)
    │       ├─ Verified → Continue
    │       ├─ Partial → Resubmit
    │       └─ Failed → Show error, retry
    │
    ├─→ Sanctions/PEP screening
    │   └─ Auto-checked by Smile Identity
    │       ├─ Clear → Continue
    │       ├─ PEP/fuzzy → Manual review (notify later)
    │       └─ Sanctions hit → BLOCK (show error)
    │
    ├─→ Set security
    │   ├─ Create 4-digit PIN
    │   ├─ Enable biometric (optional)
    │   └─ Confirm device
    │
    ├─→ Enable notifications
    │   ├─ Push notifications
    │   ├─ Email
    │   └─ SMS
    │
    └─→ ✅ Dashboard (Ready to use!)

Timeline:
├─ Signup: 30-60 sec
├─ KYC verification: 60-120 sec
├─ Security setup: 30 sec
└─ Total: 2-5 minutes
```

---

## 2. Send Money (P2P) Flow

```
USER INITIATES
    │
    └─→ Dashboard → "Send Money" button
         │
    ┌────▼─────────────────────┐
    │ Choose recipient method  │
    ├────┬────────────┬────────┤
    │    │            │        │
  Phone Email  Saved Contact Username
    │    │            │        │
    └────┴───────┬────┴────────┘
                 │
         ┌───────▼───────┐
         │ Enter amount  │
         │ & verify fee  │
         └───────┬───────┘
                 │
         ┌───────▼──────────────────┐
         │ Check balance            │
         │ Verify not on blocklist  │
         │ Check daily limit        │
         └───────┬──────────────────┘
                 │
           ┌─────▼────┐
           │ Confirm  │
           │ with PIN │
           └─────┬────┘
                 │
         ┌───────▼──────────────────────┐
         │ Debit sender wallet          │
         │ Credit recipient wallet      │
         │ Create transaction record    │
         │ Status: COMPLETED            │
         └───────┬──────────────────────┘
                 │
         ┌───────▼──────────────────────┐
         │ Show success screen          │
         │ • Amount sent                │
         │ • Recipient name             │
         │ • Transaction ID             │
         │ • Share receipt (optional)   │
         └───────┬──────────────────────┘
                 │
         ┌───────▼──────────────────────┐
         │ Background jobs:             │
         │ • Send email to sender       │
         │ • Send SMS to recipient      │
         │ • Send push notification     │
         │ • Record to analytics        │
         └──────────────────────────────┘

Timeline:
├─ Recipient selection: 10-15 sec
├─ Amount entry: 5-10 sec
├─ PIN confirmation: 5 sec
├─ Processing: < 1 sec
└─ Total: 25-30 sec
```

---

## 3. Bank Transfer (Outbound) Flow

Powered by **Zynta Last-Mile off-ramp** (USDC → NGN/KES/GHS → bank).
Fees are embedded in the exchange rate — no separate fee field shown to backend.

```
USER INITIATES
    │
    └─→ Dashboard → "Send to Bank" button
         │
    ┌────▼──────────────────────────┐
    │ Select bank + enter account # │
    │ GTB, Access, Zenith, etc.     │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Enter amount (USDC/USDT)       │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │ BACKEND: Get Zynta FX quote               │
    │ POST /api/v1/quotes                        │
    │ → destinationAmount: ₦159,224             │
    │ → rate: 1592.24 (fees already embedded)   │
    │ Show user: "Recipient gets ₦159,224"      │
    │ (no fee breakdown — Yellow Card model)    │
    └────┬──────────────────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Check wallet balance           │
    │ Review + confirm with PIN      │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────────────────┐
    │ BACKEND: Zynta off-ramp                        │
    │ 1. Register recipient (idempotent)             │
    │    POST /api/v1/recipients/individual          │
    │ 2. Lock quote                                  │
    │    POST /api/v1/quotes (+ Idempotency-Key)     │
    │ 3. Create transfer                             │
    │    POST /api/v1/off-ramp                       │
    │    { quoteId, recipientId,                     │
    │      source: "partner_pool",                   │
    │      clientReference: "BT-uuid" }             │
    │ 4. Debit user's internal wallet                │
    │ Status: PENDING                                │
    └────┬──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Show user: "Processing..."     │
    │ • Expected: 15-60 minutes      │
    │ • Check status anytime         │
    └────┬──────────────────────────┘
         │
    [ZYNTA processes — draws from JetrPay DFNS pool → Ledig converts → bank payout]
         │
    ┌────▼──────────────────────────────────────┐
    │ Webhook from Zynta:                        │
    │ { eventType: "transfer.completed",         │
    │   payload: { clientReference: "BT-uuid" } }│
    │ → Mark transaction COMPLETED              │
    └────┬──────────────────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ USER NOTIFICATION:             │
    │ • Push: Money sent!            │
    │ • Email: Receipt + proof       │
    └────────────────────────────────┘

Timeline:
├─ Selection & entry: 1-2 min
├─ Review & confirm: 30 sec
├─ Backend processing: < 5 sec
├─ Queue to Zynta: Immediate
├─ Bank settlement: 2-4 hours
└─ User notified: When complete
```

---

## 4. Card Issuance Flow

### Virtual Card (Instant)

```
USER INITIATES
    │
    └─→ Dashboard → "Cards" → "Create Virtual Card"
         │
    ┌────▼──────────────────────────┐
    │ Card Details                   │
    │ ├─ Select wallet (currency)    │
    │ ├─ Set daily limit             │
    │ ├─ Set single transaction limit│
    │ └─ Name on card                │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Confirm with PIN               │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ Backend: Issue card via processor     │
    │ • Generate card number (tokenized)    │
    │ • Generate CVV                        │
    │ • Set expiry (3 years)                │
    │ • Store securely in DB                │
    └────┬──────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ ✅ Card Details Shown:                 │
    │ • Card number (masked, show last 4)   │
    │ • CVV (show once, then hide)          │
    │ • Expiry                              │
    │ • Daily limit                         │
    │                                        │
    │ Actions available:                     │
    │ • Copy card number                    │
    │ • Add to Apple Pay / Google Pay       │
    │ • Download as PDF                     │
    └────────────────────────────────────────┘

Timeline: < 5 seconds from request to card ready
```

### Physical Card (1-2 weeks)

```
USER INITIATES
    │
    └─→ Dashboard → "Cards" → "Order Physical Card"
         │
    ┌────▼──────────────────────────────────┐
    │ Verify shipping address                │
    │ ├─ From user profile                   │
    │ └─ Can update if needed                │
    └────┬──────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ Confirm details                        │
    │ ├─ Card design (standard/premium)      │
    │ ├─ Delivery timeline                   │
    │ └─ Confirm with PIN                    │
    └────┬──────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │ Backend: Create physical card order       │
    │ • Call card issuance provider             │
    │ • Get order ID & tracking                 │
    │ • Store in DB: status = "pending_shipment"
    └────┬──────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ Show user: "Card ordered"              │
    │ ├─ Tracking number (if available)      │
    │ ├─ Expected delivery: 7-14 days        │
    │ └─ Push notification sent              │
    └────┬──────────────────────────────────┘
         │
    [Provider ships card]
         │
    ┌────▼──────────────────────────────────┐
    │ Webhook received: "Card.shipped"       │
    │ └─ Update DB: status = "shipped"       │
    │ └─ Send SMS with tracking link         │
    └────┬──────────────────────────────────┘
         │
    [User receives card]
         │
    ┌────▼──────────────────────────────────┐
    │ User taps "Activate Card" in app       │
    │ └─ Enter 3D secure code from card      │
    │ └─ Status: ACTIVATED                   │
    └────┬──────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ ✅ Card ready to use!                  │
    │ ├─ Tap to add to Apple Pay             │
    │ ├─ Use at ATM to withdraw              │
    │ └─ Use online/offline payments         │
    └────────────────────────────────────────┘

Timeline:
├─ Order placement: 5 min
├─ Shipping to address: 7-14 days
├─ Activation: 2 min
└─ Total: 1-2 weeks
```

---

## 5. KYC Tier Upgrade Flow

```
USER INITIATES
    │
    └─→ Profile → "Upgrade Account" button
         │
    ┌────▼──────────────────────────┐
    │ Show benefits of Level 2:      │
    │ ├─ Higher daily limits         │
    │ ├─ Physical card eligible      │
    │ ├─ Merchant features           │
    │ └─ "Upgrade Now" button        │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ KYC Form (Smile Identity)          │
    │ ├─ Proof of address document       │
    │ │  (utility bill, bank statement)  │
    │ ├─ Additional ID (if needed)       │
    │ └─ Employment/Income documentation │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Upload documents                   │
    │ ├─ Take photos or upload scans     │
    │ ├─ Auto-check document quality     │
    │ └─ Confirm upload                  │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Submit to Smile Identity           │
    │ └─ KYC submission created          │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ User sees: "Verification in       │
    │            progress..."           │
    │ └─ Check status anytime            │
    └────┬──────────────────────────────┘
         │
    [Smile Identity processes]
         │
    ┌────▼──────────────────────────────────────┐
    │ Webhook: KYC verification completed       │
    │ Status options:                            │
    │ ├─ Verified → Level 2 unlocked            │
    │ ├─ Partial → Ask for resubmission         │
    │ └─ Rejected → Show error, can retry       │
    └────┬──────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────────┐
    │ ✅ Account Upgraded!                     │
    │ ├─ Daily limit now: $5,000 (vs $500)    │
    │ ├─ Physical card now available          │
    │ ├─ Merchant features unlocked           │
    │ └─ Celebration screen + confetti!       │
    └─────────────────────────────────────────┘

Timeline:
├─ Form completion: 2-3 min
├─ Document upload: 1-2 min
├─ Smile processing: 1-5 min
└─ Total: 5-15 minutes
```

---

## 6. Card Spending Flow

```
USER AT MERCHANT
    │
    └─→ [Physical Card / Virtual Card]
         │
    ┌────▼────────────────────────────────┐
    │ Card presented (online/offline)     │
    │ └─ Card processor validates        │
    │    • Card number                   │
    │    • Expiry                        │
    │    • CVV (if online)               │
    │    • Card not frozen/closed        │
    └────┬────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │ Check spending limits               │
    │ ├─ Available balance > amount?      │
    │ ├─ Daily limit not exceeded?        │
    │ ├─ Single transaction limit?        │
    │ └─ Card not locked for fraud?       │
    └────┬────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │ Fraud detection (real-time ML)      │
    │ ├─ Location anomaly?                │
    │ ├─ Amount unusual?                  │
    │ ├─ Velocity check (too many txns?)  │
    │ ├─ Merchant category unusual?       │
    │ └─ Status: Approved/Declined        │
    └────┬────────────────────────────────┘
         │
         ├─ If APPROVED:
         │  ├─ Instantly debit wallet
         │  ├─ Confirm to merchant
         │  └─ Return auth code
         │
         └─ If DECLINED:
            ├─ Notify user (SMS + push)
            ├─ Show reason (insufficient funds/limit/fraud)
            └─ Suggest action (load wallet / contact support)
                 │
         ┌───────▼──────────────────────────┐
         │ Post-transaction actions:         │
         │ ├─ Push: "Card charged $45.99"   │
         │ ├─ Email: Transaction receipt    │
         │ ├─ Log to transaction history    │
         │ ├─ Update analytics/budgeting    │
         │ └─ Check for dispute opportunity │
         └───────────────────────────────────┘

Timeline:
├─ Authorization: < 100ms
├─ User notification: < 5 sec
└─ Total: Real-time
```

---

## 7. Request Money Flow

```
USER INITIATES
    │
    └─→ Dashboard → "Request Money"
         │
    ┌────▼──────────────────────────┐
    │ Select payee                   │
    │ ├─ Saved contact               │
    │ ├─ By phone/email              │
    │ └─ From contacts list          │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Enter amount & note            │
    │ └─ "For lunch on 29th"        │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Create money request record    │
    │ Status: PENDING                │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ Send notification to payee:            │
    │ ├─ SMS: "Ayo is requesting $50"       │
    │ ├─ Email: Request details              │
    │ ├─ Push: If they have app              │
    │ └─ Deep link: Opens request in app     │
    └────┬──────────────────────────────────┘
         │
    [Payee decides]
         │
         ├─ If ACCEPTED:
         │  ├─ Payee taps "Pay Now"
         │  ├─ Shows P2P transfer form
         │  ├─ Completes transfer
         │  ├─ Request status: ACCEPTED
         │  └─ Requester notified instantly
         │
         └─ If DECLINED/IGNORED:
            ├─ Payee taps "Decline"
            ├─ Request status: DECLINED
            └─ Requester notified
                 │
         ┌───────▼──────────────────────────┐
         │ Requester dashboard:              │
         │ ├─ Outstanding requests section   │
         │ ├─ See who paid & who didn't      │
         │ ├─ Resend reminder (1x/week)      │
         │ └─ Cancel request option          │
         └───────────────────────────────────┘

Timeline:
├─ Create request: 30 sec
├─ Notification sent: Instant
├─ Payee action: 1 min - 7 days
└─ Payment: 30 sec (if accepted)
```

---

## 8. Account Recovery (Lost Phone/Compromised)

```
USER VISITS LOGIN SCREEN
    │
    └─→ "Can't access account?" link
         │
    ┌────▼──────────────────────────┐
    │ Enter phone number / email     │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Multi-step verification:           │
    │ ├─ SMS OTP to registered phone     │
    │ └─ Email verification link         │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ If on trusted device:              │
    │ └─ Biometric auth alone OK         │
    │                                    │
    │ If on new device:                  │
    │ └─ SMS + Email verification needed │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Fraud check:                       │
    │ ├─ Device fingerprint              │
    │ ├─ Location check                  │
    │ ├─ Time-since-last-login           │
    │ └─ If high risk: Additional 2FA    │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ If successful: Reset password      │
    │ ├─ New password required           │
    │ ├─ 2FA disabled temporarily        │
    │ └─ Reactivate 2FA in settings      │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ ✅ Access restored                 │
    │ ├─ Recent activity check           │
    │ ├─ Flag suspicious activity        │
    │ └─ Suggest security review         │
    └────────────────────────────────────┘
```

---

## Summary: User Journey Timelines

| Flow | Time to Complete | Frequency |
|---|---|---|
| Onboarding | 2-5 min | Once |
| Send Money (P2P) | 30 sec | Daily |
| Bank Transfer | 5 min + 2-4h wait | Weekly |
| Virtual Card | < 5 sec | Few times |
| Physical Card | 1-2 weeks | Once/twice |
| KYC Upgrade | 5-15 min | Few times |
| Card Spending | Real-time | Daily |
| Request Money | 1 min | As needed |
| Account Recovery | 5-10 min | If needed |

