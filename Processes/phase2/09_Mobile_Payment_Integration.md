# 💳 Mobile Payment Integration — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**Payment Provider:** Stripe (Primary) + PromptPay (Thai QR)

---

## 1. Payment Architecture

### 1.1 System Overview

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Mobile App  │─────────│  API Server  │─────────│   Stripe     │
│              │         │              │         │              │
│ Stripe SDK   │  HTTPS  │ Payment      │  API    │ Payment      │
│ PromptPay    │◄───────►│ Controller   │◄───────►│ Processing   │
│ Apple Pay    │         │              │         │              │
│ Google Pay   │         │ Webhook      │         │ Webhooks     │
└──────────────┘         └──────────────┘         └──────────────┘
```

### 1.2 Supported Payment Methods

| Method | iOS | Android | Description |
|--------|:---:|:-------:|-------------|
| Credit/Debit Card | ✅ | ✅ | Visa, Mastercard, JCB |
| PromptPay QR | ✅ | ✅ | Thai QR payment |
| Apple Pay | ✅ | ❌ | Native iOS payment |
| Google Pay | ❌ | ✅ | Native Android payment |
| TrueMoney Wallet | ✅ | ✅ | Phase 2.2 |
| Mobile Banking | ✅ | ✅ | Deep link to bank app |

---

## 2. Payment Flow

### 2.1 Consultation Fee Payment (During Booking)

```
Appointment Confirmation Screen
              │
              ▼
┌─────────────────────────────┐
│  💳 ชำระค่าบริการ            │
│                             │
│  ── รายละเอียด ──           │
│  👨‍⚕️ นพ.สมชาย รักษา        │
│  📅 20 ก.พ. 2026 14:00     │
│  🏥 ปรึกษาออนไลน์ (30 นาที)│
│                             │
│  ── ค่าบริการ ──            │
│  ค่าปรึกษาแพทย์   ฿400     │
│  ค่าบริการระบบ     ฿100     │
│  ─────────────────          │
│  รวม             ฿500      │
│                             │
│  ── วิธีชำระเงิน ──         │
│  ┌──────────────────────┐   │
│  │ ○ 💳 บัตรเครดิต/เดบิต │   │
│  │   **** **** **** 4242 │   │
│  │   [เปลี่ยนบัตร]       │   │
│  ├──────────────────────┤   │
│  │ ○ 📱 PromptPay        │   │
│  │   สแกน QR Code       │   │
│  ├──────────────────────┤   │
│  │ ○  Apple Pay         │   │
│  │   Pay with Face ID   │   │
│  └──────────────────────┘   │
│                             │
│  [ชำระเงิน ฿500]            │
└──────────┬──────────────────┘
           │
           ▼ (Card selected)
┌─────────────────────────────┐
│  Stripe Payment Sheet       │
│  (Native UI)                │
│                             │
│  Card: 4242 •••• •••• 4242 │
│  Exp:  12/27               │
│  CVC:  ***                 │
│                             │
│  ☑️ Save card for future   │
│                             │
│  [Pay ฿500]                │
└──────────┬──────────────────┘
           │
           ▼ (PromptPay selected)
┌─────────────────────────────┐
│  PromptPay QR Payment       │
│                             │
│  ┌────────────────────┐     │
│  │  ██████████████████ │     │
│  │  ██  QR Code     ██ │     │
│  │  ██  PromptPay   ██ │     │
│  │  ██████████████████ │     │
│  └────────────────────┘     │
│                             │
│  จำนวน: ฿500                │
│  หมดอายุใน: 14:55           │
│                             │
│  📲 สแกนด้วยแอปธนาคาร      │
│  หรือ                       │
│  [เปิดแอปธนาคาร]            │
│                             │
│  ⏳ รอการชำระ...             │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  ✅ ชำระเงินสำเร็จ!          │
│                             │
│  Transaction: TXN-20260220 │
│  Amount: ฿500              │
│  Method: Credit Card       │
│  Date: 20 ก.พ. 2026 13:30 │
│                             │
│  [📥 ดาวน์โหลดใบเสร็จ]     │
│  [📋 ดูนัดหมาย]             │
│  [🏠 กลับหน้าหลัก]         │
└─────────────────────────────┘
```

### 2.2 Implementation

```typescript
// Using @stripe/stripe-react-native
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

// App wrapper
function App() {
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.izara.patient"
      urlScheme="izara-patient"
    >
      <AppContent />
    </StripeProvider>
  );
}

// Payment hook
export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const payForAppointment = async (appointmentId: string, amount: number): Promise<PaymentResult> => {
    // 1. Create payment intent on server
    const { data } = await mobileApi.createPaymentIntent({
      appointment_id: appointmentId,
      amount: amount * 100,  // Convert to satang
      currency: 'THB',
      payment_method: 'card',
    });

    // 2. Initialize payment sheet
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: data.client_secret,
      merchantDisplayName: 'Izara Dr. Anywhere',
      defaultBillingDetails: {
        name: user.name,
        email: user.email,
      },
      applePay: { merchantCountryCode: 'TH' },
      googlePay: { merchantCountryCode: 'TH', testEnv: __DEV__ },
      style: 'automatic',
      returnURL: 'izara-patient://payment-complete',
    });

    if (initError) throw new Error(initError.message);

    // 3. Present payment sheet
    const { error: presentError } = await presentPaymentSheet();
    
    if (presentError) {
      if (presentError.code === 'Canceled') {
        return { status: 'cancelled' };
      }
      throw new Error(presentError.message);
    }

    // 4. Confirm with server
    const result = await mobileApi.confirmPayment(data.payment_id);
    return result;
  };

  return { payForAppointment };
}
```

### 2.3 PromptPay QR Implementation

```typescript
// PromptPay via Stripe (Thai payment method)
export async function createPromptPayPayment(
  appointmentId: string, 
  amount: number
): Promise<PromptPayResult> {
  // 1. Create PromptPay source on server
  const { data } = await mobileApi.createPaymentIntent({
    appointment_id: appointmentId,
    amount: amount * 100,
    currency: 'THB',
    payment_method: 'promptpay',
  });

  // 2. Display QR code
  // data.qr_code_url contains the QR image
  return {
    qr_code_url: data.qr_code_url,
    expires_at: data.expires_at,
    payment_id: data.payment_id,
  };
}

// Poll for PromptPay completion
export function usePromptPayStatus(paymentId: string) {
  return useQuery(
    ['promptpay-status', paymentId],
    () => mobileApi.getPaymentDetails(paymentId),
    {
      refetchInterval: 3000,  // Poll every 3 seconds
      enabled: !!paymentId,
    }
  );
}
```

---

## 3. Payment History & Receipts

### 3.1 Payment History Screen

```
Profile → Payment History
         │
         ▼
┌─────────────────────────────┐
│  💳 ประวัติการชำระเงิน       │
│                             │
│  ── กุมภาพันธ์ 2026 ──     │
│                             │
│  ✅ 20 ก.พ. — ฿500         │
│  ├─ นพ.สมชาย | ปรึกษา     │
│  ├─ Credit Card *4242      │
│  └─ [📥 ใบเสร็จ]           │
│                             │
│  ✅ 10 ก.พ. — ฿800         │
│  ├─ พญ.สมหญิง | ตรวจร่างกาย│
│  ├─ PromptPay              │
│  └─ [📥 ใบเสร็จ]           │
│                             │
│  ── มกราคม 2026 ──         │
│  ...                        │
│                             │
│  Summary:                   │
│  💰 Total this month: ฿1,300│
│  📊 3 transactions          │
└─────────────────────────────┘
```

### 3.2 Receipt Generation

```typescript
// Download receipt as PDF
export async function downloadReceipt(paymentId: string): Promise<void> {
  const receiptData = await mobileApi.getReceipt(paymentId);
  
  // Generate PDF using react-native-pdf-lib or server-side
  const pdfUri = await generateReceiptPDF(receiptData);
  
  // Share or save
  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'ใบเสร็จ Izara Dr. Anywhere',
  });
}
```

---

## 4. Refund Policy

### 4.1 Refund Rules

| Scenario | Refund Amount | Processing Time |
|----------|:------------:|:---------------:|
| Cancel > 24h before | 100% | 3-5 business days |
| Cancel 12-24h before | 50% | 3-5 business days |
| Cancel < 12h before | 0% | N/A |
| Doctor cancels | 100% | 1-2 business days |
| Technical failure | 100% | 1-2 business days |
| Service unsatisfactory | Case-by-case | 5-7 business days |

### 4.2 Refund Flow

```
Payment Detail → [ขอคืนเงิน]
              │
              ▼
┌─────────────────────────────┐
│  ขอคืนเงิน                  │
│                             │
│  Transaction: TXN-20260220 │
│  Amount: ฿500              │
│                             │
│  เหตุผล:                    │
│  ○ ยกเลิกนัดหมาย           │
│  ○ ปัญหาทางเทคนิค          │
│  ○ ไม่พอใจบริการ            │
│  ○ อื่นๆ                   │
│                             │
│  รายละเอียด:                │
│  ┌─────────────────────┐    │
│  │ อธิบายเพิ่มเติม...   │    │
│  └─────────────────────┘    │
│                             │
│  [ส่งคำขอคืนเงิน]          │
└─────────────────────────────┘
```

---

## 5. Server-Side Payment Integration

### 5.1 Backend Webhook Handler

```typescript
// server/routes/webhooks.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object);
      break;
  }

  res.json({ received: true });
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const appointmentId = paymentIntent.metadata.appointment_id;
  
  // Update payment status
  await db.query(
    `UPDATE payment_transactions SET status = 'succeeded', completed_at = NOW() WHERE stripe_payment_intent_id = $1`,
    [paymentIntent.id]
  );
  
  // Update appointment to paid
  await db.query(
    `UPDATE appointments SET payment_status = 'paid' WHERE id = $1`,
    [appointmentId]
  );
  
  // Send push notification
  const patientId = paymentIntent.metadata.patient_id;
  await pushService.sendToUser(parseInt(patientId), {
    type: 'payment_success',
    title: '💳 ชำระเงินสำเร็จ',
    body: `ชำระค่าบริการ ฿${paymentIntent.amount / 100} สำเร็จ`,
    data: { paymentId: paymentIntent.metadata.payment_id, screen: '/(tabs)/profile/payments' },
    channelId: 'payments',
  });
}
```

---

### End of Mobile Payment Integration — February 2026
