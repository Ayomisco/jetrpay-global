# JetRPay Mobile UI & Component Library

---

## Design Philosophy

**Principles**:
1. **Mobile-First**: Design for smallest screen first, scale up
2. **Accessible**: WCAG AA compliance, 4.5:1 contrast ratio
3. **Intuitive**: Minimal gestures, clear affordances
4. **Fast**: < 1s page transitions, smooth 60fps animations
5. **Delightful**: Micro-interactions, feedback on every action

**Target Devices**:
- iPhone 12 - iPhone 15 (375px - 430px width)
- Samsung Galaxy S21 - S24 (360px - 412px width)
- iPad (10.2" - 12.9", landscape/portrait)
- Web (responsive: 375px - 1920px)

---

## Color Palette

### Primary Colors
```
Brand Teal:    #0DB9D4 (Primary actions)
Navy:          #0F172A (Text, headers)
Light Gray:    #F3F4F6 (Backgrounds)
White:         #FFFFFF (Surfaces)
```

### State Colors
```
Success:       #10B981 (Positive, completed)
Warning:       #F59E0B (Caution, pending)
Error:         #EF4444 (Negative, failed)
Info:          #3B82F6 (Information)
```

### Text Colors
```
Primary:       #0F172A (Headlines, labels)
Secondary:     #6B7280 (Body text)
Tertiary:      #9CA3AF (Helper text)
Disabled:      #D1D5DB (Disabled state)
```

---

## Typography

### Font Stack
```
Headers:    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto"
Body:       -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto"
Mono:       "SF Mono", Monaco, "Courier New", Courier
```

### Scale (Mobile)
```
H1:  32px, 700, line-height 1.2 (Headers)
H2:  24px, 700, line-height 1.3 (Section titles)
H3:  20px, 600, line-height 1.4 (Subsections)
Body:  16px, 400, line-height 1.5 (Main text)
Small: 14px, 400, line-height 1.5 (Captions)
Tiny:  12px, 400, line-height 1.4 (Helper text)
```

### Scale (Web/Desktop)
```
H1:  40px, 700, line-height 1.2
H2:  32px, 700, line-height 1.3
H3:  24px, 600, line-height 1.4
Body: 16px, 400, line-height 1.5
Small: 14px, 400, line-height 1.5
```

---

## Spacing Scale

```
xs:  4px
sm:  8px
md:  12px
lg:  16px
xl:  24px
2xl: 32px
3xl: 48px
4xl: 64px

Usage:
├─ Margins: lg, xl, 2xl
├─ Padding: sm, md, lg, xl
├─ Gaps: sm, md, lg
└─ Radius: 2px (small), 8px (medium), 16px (large)
```

---

## Core Components

### 1. Button

**Variants**: Primary, Secondary, Danger, Ghost

```jsx
// Primary (CTA)
<Button variant="primary" size="lg">
  Send Money
</Button>

// Properties
{
  size: 'sm' | 'md' | 'lg',              // 40px | 48px | 56px height
  variant: 'primary' | 'secondary' | 'danger' | 'ghost',
  state: 'default' | 'hover' | 'active' | 'disabled',
  fullWidth: boolean,
  loading: boolean,
  icon: React.ReactNode,
  onClick: () => void
}

// Mobile: 56px height, full width
// Hover: Translate -2px, box-shadow
// Active: Translate 0px, darker background
// Disabled: Opacity 0.5, cursor not-allowed
```

**Styles**:
```css
/* Primary Button */
background: #0DB9D4;
color: white;
border-radius: 12px;
padding: 16px 24px;
font-weight: 600;
transition: all 200ms ease;

&:hover { 
  background: #0a9fb7;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(13, 185, 212, 0.3);
}

&:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(13, 185, 212, 0.2);
}

/* Secondary Button */
background: transparent;
border: 2px solid #E5E7EB;
color: #0F172A;

&:hover {
  background: #F3F4F6;
  border-color: #D1D5DB;
}
```

---

### 2. Card

**Used for**: Transaction items, account summaries, features

```jsx
<Card>
  <Card.Header>
    <Text variant="h3">Send Money</Text>
  </Card.Header>
  <Card.Body>
    <Text>You can send money to any JetRPay user instantly.</Text>
  </Card.Body>
  <Card.Footer>
    <Button>Start Transfer</Button>
  </Card.Footer>
</Card>

// Properties
{
  variant: 'elevated' | 'filled' | 'outlined',
  clickable: boolean,
  onClick: () => void,
  padding: 'sm' | 'md' | 'lg'
}
```

**Styles**:
```css
background: white;
border-radius: 16px;
padding: 20px;
border: 1px solid #E5E7EB;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

&:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #D1D5DB;
  cursor: pointer;
}
```

---

### 3. BalanceCard

**Special card showing wallet balance**

```jsx
<BalanceCard 
  balance={1234.56}
  currency="USD"
  walletName="Spending"
  backgroundColor="#0DB9D4"
/>

// Visual hierarchy
┌────────────────────────────┐
│ Spending      [EYE ICON]   │  ← Label + show/hide balance
├────────────────────────────┤
│                            │
│   $1,234.56               │  ← Large amount
│   USD Balance             │  ← Currency label
│                            │
├────────────────────────────┤
│ [Send] [Request] [More]   │  ← Quick actions
└────────────────────────────┘
```

---

### 4. Tab Navigation

**Bottom tabs (mobile) / Top tabs (web)**

```jsx
<TabNavigation>
  <Tab icon={HomeIcon} label="Home" path="/" active={true} />
  <Tab icon={SendIcon} label="Send" path="/send" />
  <Tab icon={CardIcon} label="Cards" path="/cards" />
  <Tab icon={SettingsIcon} label="Settings" path="/settings" />
</TabNavigation>

// Mobile: Fixed at bottom, 56px height
// Labels visible (not just icons)
// Safe area padding for notch
// Active: Teal text + icon
// Inactive: Gray text + icon
```

---

### 5. Input Field

**Text, Email, Phone, Password**

```jsx
<Input
  type="email"
  label="Email Address"
  placeholder="you@example.com"
  error="Invalid email format"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  rightIcon={<CheckIcon />}
  disabled={false}
/>

// Properties
{
  type: 'text' | 'email' | 'phone' | 'password' | 'number',
  label: string,
  placeholder: string,
  error: string | null,
  success: boolean,
  value: string,
  disabled: boolean,
  leftIcon: React.ReactNode,
  rightIcon: React.ReactNode,
  maxLength: number,
  autoCapitalize: 'none' | 'sentences' | 'words'
}

// Styles
border: 1px solid #E5E7EB;
border-radius: 12px;
padding: 12px 16px;
font-size: 16px;
transition: all 200ms ease;

&:focus {
  border-color: #0DB9D4;
  box-shadow: 0 0 0 3px rgba(13, 185, 212, 0.1);
  outline: none;
}

&:error {
  border-color: #EF4444;
  background: rgba(239, 68, 68, 0.05);
}
```

---

### 6. Modal / Sheet

**For forms, confirmations**

```jsx
<BottomSheet 
  isOpen={isOpen}
  onClose={onClose}
  title="Send Money"
  height="auto"
>
  <Form>
    <Input label="Recipient" />
    <Input label="Amount" type="number" />
    <Button fullWidth variant="primary">Send</Button>
  </Form>
</BottomSheet>

// Mobile: Bottom sheet (slides up from bottom)
// Web: Modal (centered on screen)
// Backdrop: Blurred, clickable to close (mobile)
// Safe area: Padding for notch/home indicator
```

---

### 7. List Item

**For transactions, contacts, settings**

```jsx
<ListItem
  avatar={<Avatar initials="AY" />}
  title="Ayo Misco"
  subtitle="Sent you $50"
  rightText="$50"
  rightColor="success"
  timestamp="2 hours ago"
  clickable={true}
  onClick={() => navigate('/transaction/123')}
/>

// Structure
┌──────────────────────────────────────┐
│ [AV] Title          timestamp   $50  │
│      Subtitle       rightColor  icon │
└──────────────────────────────────────┘

// Properties
{
  avatar: React.ReactNode,
  title: string,
  subtitle: string,
  rightText: string | React.ReactNode,
  rightColor: 'default' | 'success' | 'warning' | 'error',
  timestamp: string,
  clickable: boolean,
  badge: string | number,
  divider: boolean
}
```

---

### 8. Status Badge

**For transaction status, KYC level**

```jsx
// Transaction status
<Badge status="completed" label="Completed" />
<Badge status="pending" label="Processing" />
<Badge status="failed" label="Failed" />

// KYC level
<Badge level="1" label="Level 1" variant="info" />
<Badge level="2" label="Level 2" variant="success" />

// Styles
{
  'completed': { bg: '#ECFDF5', text: '#065F46', icon: '✓' },
  'pending':   { bg: '#FFFBEB', text: '#92400E', icon: '⏱' },
  'failed':    { bg: '#FEF2F2', text: '#7F1D1D', icon: '✗' }
}
```

---

### 9. Currency Input

**Special input for amount entry**

```jsx
<CurrencyInput
  value={amount}
  onChange={setAmount}
  currency="USD"
  onCurrencyChange={setCurrency}
  availableBalance={1234.56}
  showBalance={true}
/>

// Features
├─ Dollar sign prefix: $
├─ Comma separation: 1,234.56
├─ Decimals: 2
├─ Currency selector (tap to change)
├─ Available balance below (gray)
├─ Quick amount buttons: [X10] [X50] [MAX]
└─ Keyboard: Numeric with decimal

// Visual
┌─────────────────────────────────┐
│ USD        $              [v]   │ ← Currency picker
├─────────────────────────────────┤
│ $1,234.56                       │ ← Main input
├─────────────────────────────────┤
│ Available: $5,000 | [MAX]       │ ← Balance + quick action
└─────────────────────────────────┘
```

---

### 10. Toast / Snackbar

**For notifications**

```jsx
<Toast 
  type="success"
  message="Money sent successfully"
  duration={3000}
  action={{ label: "Undo", onClick: handleUndo }}
/>

// Types
{
  'success': { bg: '#ECFDF5', text: '#065F46', icon: '✓' },
  'error':   { bg: '#FEF2F2', text: '#7F1D1D', icon: '✗' },
  'info':    { bg: '#EFF6FF', text: '#0C4A6E', icon: 'ℹ' },
  'warning': { bg: '#FFFBEB', text: '#92400E', icon: '⚠' }
}

// Position: Bottom (mobile), bottom-right (web)
// Animation: Slide up, fade out
// Auto-dismiss: 3-5 seconds
// Swipe to dismiss (mobile)
```

---

## Screen Layouts

### 1. Dashboard/Home Screen

```
┌─────────────────────────────────┐
│ 11:45                      ⚙️   │ ← Status bar
├─────────────────────────────────┤
│ Good morning, Ayo!              │ ← Greeting
│                                 │
│ ┌─────────────────────────────┐ │
│ │ USD          💰             │ │ ← Balance card
│ ├─────────────────────────────┤ │
│ │   $1,234.56                 │ │
│ │   Available Balance         │ │
│ ├─────────────────────────────┤ │
│ │ [💸 Send] [💰 Request]     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Recent Transactions             │ ← Section header
│ ┌──────────────────────────────┐│
│ │[AV] John                $50 ✓││ ← List item
│ │    Sent you            5m ago││
│ └──────────────────────────────┘│
│ ┌──────────────────────────────┐│
│ │[AV] ATM Withdrawal       $200││
│ │    Pending            1h ago ││
│ └──────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│ [🏠] [💳] [📤] [⚙️]           │ ← Bottom tabs
└─────────────────────────────────┘
```

### 2. Send Money Screen

```
┌─────────────────────────────────┐
│ ◀ Send Money                    │ ← Header
├─────────────────────────────────┤
│                                 │
│ Choose Recipient                │ ← Section
│ [Phone] [Email] [Saved]        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Enter phone number          │ │ ← Input
│ │ +234 |                      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ USD        $          [v]   │ │ ← Currency input
│ ├─────────────────────────────┤ │
│ │ $100.00                     │ │
│ ├─────────────────────────────┤ │
│ │ Available: $1,234.56 [MAX]  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Fee: $0.00 (Free for P2P)      │ ← Breakdown
│ You will send: $100.00         │
│                                 │
│ [               Continue       ]│ ← CTA
│                                 │
└─────────────────────────────────┘
```

### 3. Transaction Details

```
┌─────────────────────────────────┐
│ ◀ Transaction Details           │
├─────────────────────────────────┤
│                                 │
│           ✓ COMPLETED           │ ← Status badge
│                                 │
│        You sent $100.00        │ ← Description
│                                 │
│        2 hours ago             │ ← Time
│                                 │
│ ┌─────────────────────────────┐ │
│ │ To                          │ │ ← Details
│ │ Ayo Misco                   │ │
│ ├─────────────────────────────┤ │
│ │ Amount                      │ │
│ │ $100.00 USD                 │ │
│ ├─────────────────────────────┤ │
│ │ Fee                         │ │
│ │ $0.00                       │ │
│ ├─────────────────────────────┤ │
│ │ Reference                   │ │
│ │ TXN-2026-0428-00012         │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Download Receipt] [Share]     │ ← Actions
│                                 │
└─────────────────────────────────┘
```

### 4. Cards Screen

```
┌─────────────────────────────────┐
│ Cards                      [+]  │ ← Header with add button
├─────────────────────────────────┤
│                                 │
│ Virtual Cards                   │ ← Section
│ ┌─────────────────────────────┐ │
│ │    VISA Card                │ │
│ │                             │ │
│ │ 4242 ●●●● ●●●● ●●●● Exp:07│ │
│ │                             │ │
│ │ $5,000/day limit       [>]  │ │ ← Card component
│ └─────────────────────────────┘ │
│                                 │
│ Physical Cards                  │ ← Section
│ ┌─────────────────────────────┐ │
│ │ Order Status:               │ │
│ │ ⏱ Processing (Est. 7 days) │ │
│ │ Tracking: #RMZ2026...      │ │
│ └─────────────────────────────┘ │
│                                 │
│ [+ Add Card]                   │ ← CTA
│                                 │
└─────────────────────────────────┘
```

---

## Animations & Micro-Interactions

### Page Transitions
```
Entrance:  Fade in + slide up 12px (200ms ease-out)
Exit:      Fade out + slide down 12px (150ms ease-in)
```

### Button States
```
Tap:       Scale 0.98 (100ms)
Loading:   Spinner overlay + disabled state
Success:   Checkmark animation (500ms)
```

### Transaction Entry
```
List item appears:  Fade in + slide from right (300ms)
On scroll:          Parallax (scroll * 0.1)
On tap:             Highlight (100ms), then nav
```

### Form Validation
```
Error:     Border turns red, text shakes (200ms)
Success:   Green border + checkmark icon (200ms)
```

---

## Accessibility

### Guidelines
- **Contrast**: Minimum 4.5:1 text-to-background
- **Touch targets**: Minimum 44x44px (48px preferred)
- **Keyboard**: All interactive elements keyboard-accessible
- **Screen readers**: Proper ARIA labels, landmarks
- **Reduced motion**: Respect `prefers-reduced-motion`

### Implementation
```jsx
// ARIA labels
<button aria-label="Send money to contact">
  <SendIcon />
</button>

// Semantic HTML
<nav role="navigation">...</nav>
<main role="main">...</main>
<section role="region" aria-label="Transactions">...</section>

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

// Focus visible
button:focus-visible {
  outline: 2px solid #0DB9D4;
  outline-offset: 2px;
}
```

---

## Responsive Breakpoints

```
Mobile:  375px - 640px  (iPhone, small Android)
Tablet:  641px - 1024px (iPad, large Android)
Desktop: 1025px+        (Web, Mac, Windows)

Media queries:
@media (max-width: 640px) { /* Mobile styles */ }
@media (min-width: 641px) and (max-width: 1024px) { /* Tablet */ }
@media (min-width: 1025px) { /* Desktop */ }
```

---

## Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0F172A;
    --bg-secondary: #1F2937;
    --text-primary: #F9FAFB;
    --text-secondary: #D1D5DB;
    --border: #374151;
  }
}
```

---

## Performance Targets

- **Time to Interactive**: < 2 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Cumulative Layout Shift**: < 0.1
- **Frame rate**: Consistent 60fps
- **Memory**: < 100MB app size

---

## Component Implementation Path

**Phase 1**: Core components (Button, Input, Card, List, Badge)  
**Phase 2**: Layout components (Modal, BottomSheet, Tab, Header)  
**Phase 3**: Feature components (CurrencyInput, BalanceCard, BalanceCard)  
**Phase 4**: Advanced (Charts, DataTable, Calendar)  

