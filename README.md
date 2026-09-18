# 🛍️ AURA STUDIO | E-Commerce Apparel Store & Payment Testbed

A modern, luxury minimalist clothing e-commerce demo website designed specifically to simulate **failed, stuck (pending hang), and unsuccessful payment gateway scenarios** for prototyping and demonstrating payment recovery solutions.

---

## 🌟 Overview & Purpose

When designing automated payment reconciliation, webhook retry mechanisms, or fallback recovery engines, having a realistic single-page e-commerce frontend is crucial. 

This project provides:
1. **Curated Apparel Store**: Responsive product catalog with size selections, cart drawer with real-time totals, discount codes, and seamless checkout.
2. **Interactive Payment Simulator**:
   - ⏳ **Stuck in Pending (Hang)**: Simulates an acquirer network freeze where payment stays in `PROCESSING` indefinitely without bank confirmation or webhook.
   - 🛑 **Card Declined (402)**: Simulates insufficient funds or card risk refusal with clear error codes.
   - ⏱️ **Bank 504 Gateway Timeout**: Simulates network timeout after a realistic processing delay.
   - 🔒 **3DS / OTP Verification Failure**: Simulates authentication challenge rejection.
   - ✅ **Payment Success (200 OK)**: Standard authorized payment flow for baseline testing.
3. **Recovery & Resolution Workbench**:
   - **Simulate Solution Reconciled**: Demonstrates marking a stuck transaction as `PAID` via webhook replay or recovery worker.
   - **Simulate Auto-Cancellation**: Demonstrates releasing holds on expired pending orders.
   - **Global Event Dispatcher & Window API**: Emits `payment_event` DOM events with payloads for external recovery scripts to hook into.
   - **Live Diagnostics Console**: Built-in JSON event logger with copy/export functionality.

---

## 🚀 Getting Started

No build tools or heavy node dependencies required! It runs natively on any modern browser.

### Option 1: Run with Python / Simple HTTP Server
```bash
# In the project directory:
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 2: Run with Node/npx (Optional)
```bash
npx serve .
```

### Option 3: Direct File Open
Simply double-click `index.html` in your file explorer.

---

## 🧪 Payment Simulation Scenarios

You can switch scenarios in three ways:
1. **In the Checkout Modal**: Choose your test scenario using the radio options before clicking **"Authorize Payment"**.
2. **From the Simulator Guide Section**: Click **"Select This Mode"** on any scenario card.
3. **Programmatically via JavaScript Console**:
   ```javascript
   // Select a scenario: 'stuck' | 'declined' | 'timeout' | 'auth_fail' | 'success'
   window.PaymentDemoGateway.setScenario('stuck');
   ```

---

## 🔌 Hooking Your Recovery Solution

This demo exposes both browser DOM events and a global `window.PaymentDemoGateway` API so your external code or testing scripts can interact with it.

### 1. Listening to Payment Events
```javascript
window.addEventListener('payment_event', (event) => {
  const { scenario, transaction, level, message } = event.detail;
  console.log('[Recovery Listener] Received event:', level, scenario, transaction);

  if (transaction && transaction.status === 'PENDING_STUCK') {
    console.log('🚨 Stuck transaction detected:', transaction.id);
    // Trigger your recovery mechanism here!
  }
});
```

### 2. Resolving Stuck Transactions Programmatically
```javascript
// Simulate successful reconciliation (e.g. background polling worker finds bank payment)
window.PaymentDemoGateway.resolveStuckPayment('success');

// Or cancel & release inventory hold
window.PaymentDemoGateway.resolveStuckPayment('cancel');
```

---

## 📁 Project Structure

```
├── index.html            # Main single-page HTML layout
├── styles.css            # Obsidian/slate design system, animations & responsive layout
├── app.js                # Product state, cart drawer, and payment simulation engine
├── assets/
│   └── images/           # High-resolution studio product photos
│       ├── hoodie.jpg
│       ├── linen_overshirt.jpg
│       ├── trousers.jpg
│       ├── boxy_tee.jpg
│       ├── denim_jacket.jpg
│       └── canvas_tote.jpg
└── README.md             # Documentation & integration guide
```

---

## 📄 License
MIT License. Built for payment resiliency testing & solutions demonstration.
