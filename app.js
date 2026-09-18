/**
 * AURA STUDIO - Luxury Apparel E-Commerce & Payment Engine (INR Edition)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PRODUCT CATALOG DATA (PRICES IN INDIAN RUPEES ₹)
  // =========================================================================
  const PRODUCTS = [
    {
      id: 'prod_hoodie_01',
      name: 'Heavyweight Boxy Hoodie',
      category: 'outerwear',
      price: 2499.00,
      image: 'assets/images/hoodie.jpg',
      description: '500 GSM French Terry cotton with structured dropped shoulders and minimal seamless pocket.',
      sizes: ['S', 'M', 'L', 'XL'],
      selectedSize: 'M'
    },
    {
      id: 'prod_shirt_02',
      name: 'Relaxed Linen Overshirt',
      category: 'tops',
      price: 1899.00,
      image: 'assets/images/linen_overshirt.jpg',
      description: 'Breathable olive flax linen garment-dyed for a soft natural drape. Dual chest utility pockets.',
      sizes: ['S', 'M', 'L', 'XL'],
      selectedSize: 'L'
    },
    {
      id: 'prod_pants_03',
      name: 'Tailored Pleated Trousers',
      category: 'bottoms',
      price: 2999.00,
      image: 'assets/images/trousers.jpg',
      description: 'Charcoal wool blend with double forward pleats, tapered ankle cut, and hidden waist adjuster.',
      sizes: ['30', '32', '34', '36'],
      selectedSize: '32'
    },
    {
      id: 'prod_tee_04',
      name: 'Sand Vintage Boxy Tee',
      category: 'tops',
      price: 1299.00,
      image: 'assets/images/boxy_tee.jpg',
      description: '280 GSM combed organic cotton with reinforced rib collar and relaxed drape.',
      sizes: ['S', 'M', 'L', 'XL'],
      selectedSize: 'M'
    },
    {
      id: 'prod_denim_05',
      name: 'Indigo Worker Denim Jacket',
      category: 'outerwear',
      price: 3499.00,
      image: 'assets/images/denim_jacket.jpg',
      description: '14oz selvedge denim treated with vintage wash. Triple stitched reinforced construction.',
      sizes: ['M', 'L', 'XL'],
      selectedSize: 'L'
    },
    {
      id: 'prod_tote_06',
      name: 'Matte Black Crossbody Tote',
      category: 'accessories',
      price: 1599.00,
      image: 'assets/images/canvas_tote.jpg',
      description: 'Heavy duty duck canvas with matte black metal hardware and modular utility strap.',
      sizes: ['ONE SIZE'],
      selectedSize: 'ONE SIZE'
    }
  ];

  // =========================================================================
  // 2. SCENARIO ROTATION (TRIGGERS ONE REALISTIC ISSUE EVERY PAYMENT)
  // =========================================================================
  const PAYMENT_SCENARIOS = ['stuck', 'declined', 'timeout', 'auth_fail'];
  let currentScenarioIndex = 0;

  // =========================================================================
  // 3. APPLICATION STATE
  // =========================================================================
  const state = {
    cart: [
      {
        id: 'prod_hoodie_01',
        name: 'Heavyweight Boxy Hoodie',
        price: 2499.00,
        image: 'assets/images/hoodie.jpg',
        size: 'L',
        qty: 1
      },
      {
        id: 'prod_pants_03',
        name: 'Tailored Pleated Trousers',
        price: 2999.00,
        image: 'assets/images/trousers.jpg',
        size: '32',
        qty: 1
      }
    ],
    selectedCategory: 'all',
    paymentMethod: 'card',
    appliedCoupon: null,
    discountAmount: 0,
    currentTransaction: null,
    stuckTimerInterval: null,
    stuckSeconds: 0
  };

  // Format Rupees with Indian Numbering
  function formatINR(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // =========================================================================
  // 4. EVENT EMITTER (FOR BACKEND/SOLUTIONS LISTENING)
  // =========================================================================
  function logEvent(level, message, metadata = {}) {
    const isoDate = new Date().toISOString();
    const customEvent = new CustomEvent('payment_event', {
      detail: {
        timestamp: isoDate,
        level,
        message,
        transaction: state.currentTransaction,
        ...metadata
      }
    });
    window.dispatchEvent(customEvent);
    console.log(`[AURA GATEWAY ${level}]`, message, metadata);
  }

  // =========================================================================
  // 5. TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '🛑' : type === 'warning' ? '⚠️' : '⚡';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // =========================================================================
  // 6. PRODUCT CATALOG RENDERING
  // =========================================================================
  function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const filtered = state.selectedCategory === 'all'
      ? PRODUCTS
      : PRODUCTS.filter(p => p.category === state.selectedCategory);

    grid.innerHTML = filtered.map(product => `
      <article class="product-card" data-id="${product.id}">
        <div class="product-image-box">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
          <span class="product-category-tag">${product.category}</span>
        </div>
        <div class="product-content">
          <div class="product-title-row">
            <h3 class="product-title">${escapeHtml(product.name)}</h3>
            <span class="product-price">${formatINR(product.price)}</span>
          </div>
          <p class="product-desc">${escapeHtml(product.description)}</p>
          
          <div class="size-selector-row">
            <span class="size-label">Size:</span>
            ${product.sizes.map(sz => `
              <button type="button" class="size-pill ${sz === product.selectedSize ? 'active' : ''}" data-product-id="${product.id}" data-size="${sz}">
                ${sz}
              </button>
            `).join('')}
          </div>

          <button type="button" class="add-to-cart-btn" data-product-id="${product.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            <span>Add to Bag</span>
          </button>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.size-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prodId = e.currentTarget.getAttribute('data-product-id');
        const size = e.currentTarget.getAttribute('data-size');
        const prod = PRODUCTS.find(p => p.id === prodId);
        if (prod) {
          prod.selectedSize = size;
          renderProducts();
        }
      });
    });

    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prodId = e.currentTarget.getAttribute('data-product-id');
        addToCart(prodId);
      });
    });
  }

  // =========================================================================
  // 7. CART MANAGEMENT
  // =========================================================================
  function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = state.cart.findIndex(
      item => item.id === product.id && item.size === product.selectedSize
    );

    if (existingIndex > -1) {
      state.cart[existingIndex].qty += 1;
    } else {
      state.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: product.selectedSize,
        qty: 1
      });
    }

    updateCartUI();
    showToast(`Added "${product.name}" (${product.selectedSize}) to bag!`, 'success');
  }

  function updateItemQty(index, change) {
    if (!state.cart[index]) return;
    state.cart[index].qty += change;
    if (state.cart[index].qty <= 0) {
      state.cart.splice(index, 1);
    }
    updateCartUI();
  }

  function removeFromCart(index) {
    state.cart.splice(index, 1);
    updateCartUI();
  }

  function getCartSubtotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  function getCartTotal() {
    const subtotal = getCartSubtotal();
    return Math.max(0, subtotal - state.discountAmount);
  }

  function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    const drawerCountEl = document.getElementById('cart-drawer-count');
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const btnPreviewEl = document.getElementById('btn-total-preview');
    const discountRow = document.getElementById('discount-row');
    const discountCodeName = document.getElementById('discount-code-name');
    const cartDiscountEl = document.getElementById('cart-discount');
    const emptyState = document.getElementById('empty-cart-state');

    const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.textContent = totalItems;
    if (drawerCountEl) drawerCountEl.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;

    const subtotal = getCartSubtotal();
    const total = getCartTotal();

    if (subtotalEl) subtotalEl.textContent = formatINR(subtotal);
    if (totalEl) totalEl.textContent = formatINR(total);
    if (btnPreviewEl) btnPreviewEl.textContent = formatINR(total);

    const payBtnAmount = document.getElementById('pay-btn-amount');
    const modalItemCount = document.getElementById('modal-item-count');
    const modalSubtotal = document.getElementById('modal-subtotal');
    const modalTotal = document.getElementById('modal-total');

    if (payBtnAmount) payBtnAmount.textContent = formatINR(total);
    if (modalItemCount) modalItemCount.textContent = totalItems;
    if (modalSubtotal) modalSubtotal.textContent = formatINR(subtotal);
    if (modalTotal) modalTotal.textContent = formatINR(total);

    if (state.discountAmount > 0 && discountRow) {
      discountRow.style.display = 'flex';
      if (discountCodeName) discountCodeName.textContent = state.appliedCoupon;
      if (cartDiscountEl) cartDiscountEl.textContent = `-${formatINR(state.discountAmount)}`;
    } else if (discountRow) {
      discountRow.style.display = 'none';
    }

    if (!container) return;

    if (state.cart.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        container.appendChild(emptyState);
        emptyState.style.display = 'block';
      }
    } else {
      container.innerHTML = state.cart.map((item, idx) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" class="cart-item-img">
          <div class="cart-item-details">
            <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
            <div class="cart-item-variant">Size: ${item.size}</div>
            <div class="cart-item-actions">
              <div class="qty-control">
                <button type="button" class="qty-btn" data-cart-action="dec" data-index="${idx}">-</button>
                <span class="qty-display">${item.qty}</span>
                <button type="button" class="qty-btn" data-cart-action="inc" data-index="${idx}">+</button>
              </div>
              <span class="cart-item-price">${formatINR(item.price * item.qty)}</span>
              <button type="button" class="cart-item-remove" data-cart-action="remove" data-index="${idx}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('[data-cart-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = e.currentTarget.getAttribute('data-cart-action');
          const index = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          if (action === 'inc') updateItemQty(index, 1);
          if (action === 'dec') updateItemQty(index, -1);
          if (action === 'remove') removeFromCart(index);
        });
      });
    }

    const modalItemList = document.getElementById('modal-item-list');
    if (modalItemList) {
      modalItemList.innerHTML = state.cart.map(item => `
        <div class="modal-item-row">
          <span class="modal-item-name">${item.qty}x ${escapeHtml(item.name)} (${item.size})</span>
          <span>${formatINR(item.price * item.qty)}</span>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // 8. PAYMENT PROCESSING (TRIGGERS FAILURE / STUCK SCENARIOS DYNAMICALLY)
  // =========================================================================
  function getReadablePaymentMethod() {
    if (state.paymentMethod === 'card') {
      const cardNum = document.getElementById('card-number')?.value.trim() || '4532';
      const last4 = cardNum.slice(-4) || '6789';
      return `Visa / RuPay Card (ending in ${last4})`;
    }
    if (state.paymentMethod === 'upi') {
      const upiId = document.getElementById('upi-id')?.value.trim() || 'user@upi';
      return `UPI (${upiId})`;
    }
    const bankSelect = document.getElementById('bank-select');
    const bankName = bankSelect?.options[bankSelect.selectedIndex]?.text || 'Net Banking';
    return `Net Banking (${bankName})`;
  }

  function startPaymentFlow() {
    if (state.cart.length === 0) {
      showToast('Your bag is empty! Add items first.', 'error');
      return;
    }

    const total = getCartTotal();
    const txnId = 'TXN_' + Math.floor(1000000 + Math.random() * 9000000) + '_INR';
    const mockRRN = 'RRN-' + Math.floor(100000000000 + Math.random() * 900000000000);
    const methodStr = getReadablePaymentMethod();
    
    // Pick next scenario from rotation so every payment attempt demonstrates a realistic failure/stuck state
    const scenario = PAYMENT_SCENARIOS[currentScenarioIndex];
    currentScenarioIndex = (currentScenarioIndex + 1) % PAYMENT_SCENARIOS.length;

    state.currentTransaction = {
      id: txnId,
      rrn: mockRRN,
      amount: total,
      currency: 'INR',
      itemsCount: state.cart.length,
      method: methodStr,
      scenario: scenario,
      startedAt: new Date().toLocaleString('en-IN', { timeZoneName: 'short' }),
      status: 'INITIATED'
    };

    logEvent('INFO', `Payment started for ${formatINR(total)} via [${methodStr}]`, {
      transactionId: txnId,
      scenario: scenario
    });

    showPaymentView('processing');
    updateProcessingTimeline(1);

    executeScenario(scenario, txnId, mockRRN, total, methodStr);
  }

  function executeScenario(scenario, txnId, mockRRN, total, methodStr) {
    const procTitle = document.getElementById('processing-title');
    const procDesc = document.getElementById('processing-desc');
    const stuckBanner = document.getElementById('stuck-banner');

    if (stuckBanner) stuckBanner.style.display = 'none';
    if (procTitle) procTitle.textContent = 'Connecting to Bank Gateway...';
    if (procDesc) procDesc.textContent = 'Please do not refresh or close this window while we secure authorization.';

    if (scenario === 'stuck') {
      // ⏳ SCENARIO 1: TRANSACTION GETS STUCK IN PENDING
      setTimeout(() => {
        updateProcessingTimeline(2);
      }, 1200);

      setTimeout(() => {
        updateProcessingTimeline(3);
        if (procTitle) procTitle.textContent = 'Awaiting Bank Confirmation...';
        if (procDesc) procDesc.textContent = 'The bank authorization response is taking longer than expected.';
        
        if (stuckBanner) stuckBanner.style.display = 'block';
        
        // Populate Stuck View Details
        const stuckTxnId = document.getElementById('stuck-txn-id');
        const stuckAmount = document.getElementById('stuck-amount');
        const stuckRRN = document.getElementById('stuck-rrn');
        const stuckMethod = document.getElementById('stuck-method');

        if (stuckTxnId) stuckTxnId.textContent = txnId;
        if (stuckAmount) stuckAmount.textContent = formatINR(total);
        if (stuckRRN) stuckRRN.textContent = mockRRN;
        if (stuckMethod) stuckMethod.textContent = methodStr;

        state.currentTransaction.status = 'PENDING_STUCK';
        state.currentTransaction.errorCode = 'ERR_GATEWAY_NO_CALLBACK';

        state.stuckSeconds = 4;
        clearInterval(state.stuckTimerInterval);
        state.stuckTimerInterval = setInterval(() => {
          state.stuckSeconds++;
          const timerEl = document.getElementById('stuck-timer-counter');
          if (timerEl) timerEl.textContent = `${state.stuckSeconds}s`;
        }, 1000);

        logEvent('ERROR', `Transaction stuck in pending state. Ref: ${txnId}`, {
          transactionId: txnId,
          status: 'PENDING_STUCK'
        });

      }, 2400);

    } else if (scenario === 'declined') {
      // 🛑 SCENARIO 2: CARD DECLINED (402)
      setTimeout(() => updateProcessingTimeline(2), 900);
      setTimeout(() => {
        state.currentTransaction.status = 'FAILED';
        state.currentTransaction.errorCode = 'ERR_CARD_DECLINED';

        showPaymentView('failed');
        renderFailedDetails(
          'ERR_CARD_DECLINED (402)',
          'Card issuer declined the transaction (Insufficient balance or daily limit exceeded).',
          txnId,
          mockRRN,
          total,
          methodStr
        );

        logEvent('ERROR', `Payment Failed: ERR_CARD_DECLINED`, { transactionId: txnId });
      }, 2000);

    } else if (scenario === 'timeout') {
      // ⏱️ SCENARIO 3: 504 GATEWAY TIMEOUT
      if (procTitle) procTitle.textContent = 'Communicating with Remote Bank Gateway...';
      setTimeout(() => updateProcessingTimeline(2), 1500);

      setTimeout(() => {
        state.currentTransaction.status = 'FAILED';
        state.currentTransaction.errorCode = 'ERR_GATEWAY_TIMEOUT';

        showPaymentView('failed');
        renderFailedDetails(
          'ERR_GATEWAY_TIMEOUT (504)',
          'The issuing bank server timed out after 5000ms. Transaction was aborted.',
          txnId,
          mockRRN,
          total,
          methodStr
        );

        logEvent('ERROR', `Payment Timed Out: ERR_GATEWAY_TIMEOUT`, { transactionId: txnId });
      }, 4000);

    } else if (scenario === 'auth_fail') {
      // 🔒 SCENARIO 4: 3DS / OTP FAILED
      setTimeout(() => updateProcessingTimeline(2), 900);
      setTimeout(() => {
        state.currentTransaction.status = 'FAILED';
        state.currentTransaction.errorCode = 'ERR_3DS_AUTH_FAILED';

        showPaymentView('failed');
        renderFailedDetails(
          'ERR_3DS_AUTH_FAILED',
          '3D Secure / OTP authentication challenge failed or expired.',
          txnId,
          mockRRN,
          total,
          methodStr
        );

        logEvent('ERROR', `Payment Authentication Failure: ERR_3DS_AUTH_FAILED`, { transactionId: txnId });
      }, 2200);
    }
  }

  function updateProcessingTimeline(activeStep) {
    for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`step-${i}`);
      if (!step) continue;
      if (i < activeStep) {
        step.className = 'timeline-step step-done';
        step.querySelector('.step-bullet').textContent = '✓';
      } else if (i === activeStep) {
        step.className = 'timeline-step step-active';
        step.querySelector('.step-bullet').textContent = '●';
      } else {
        step.className = 'timeline-step';
        step.querySelector('.step-bullet').textContent = '○';
      }
    }
  }

  function showPaymentView(viewName) {
    const formView = document.getElementById('checkout-form-view');
    const procView = document.getElementById('payment-processing-view');
    const failView = document.getElementById('payment-failed-view');
    const succView = document.getElementById('payment-success-view');

    if (formView) formView.style.display = viewName === 'form' ? 'grid' : 'none';
    if (procView) procView.style.display = viewName === 'processing' ? 'flex' : 'none';
    if (failView) failView.style.display = viewName === 'failed' ? 'flex' : 'none';
    if (succView) succView.style.display = viewName === 'success' ? 'flex' : 'none';

    if (viewName !== 'processing') {
      clearInterval(state.stuckTimerInterval);
    }
  }

  function renderFailedDetails(code, reason, txnId, rrn, total, method) {
    const codeEl = document.getElementById('error-code-val');
    const reasonEl = document.getElementById('error-reason-val');
    const txnEl = document.getElementById('failed-txn-id');
    const rrnEl = document.getElementById('failed-rrn');
    const amountEl = document.getElementById('failed-amount');
    const methodEl = document.getElementById('failed-method');
    const timeEl = document.getElementById('failed-timestamp');

    if (codeEl) codeEl.textContent = code;
    if (reasonEl) reasonEl.textContent = reason;
    if (txnEl) txnEl.textContent = txnId;
    if (rrnEl) rrnEl.textContent = rrn;
    if (amountEl) amountEl.textContent = formatINR(total);
    if (methodEl) methodEl.textContent = method;
    if (timeEl) timeEl.textContent = new Date().toLocaleString('en-IN', { timeZoneName: 'short' });
  }

  function renderSuccessDetails(txnId, total) {
    const orderIdEl = document.getElementById('success-order-id');
    const amountPaidEl = document.getElementById('receipt-amount-paid');
    const itemsSummaryEl = document.getElementById('receipt-items-summary');

    if (orderIdEl) orderIdEl.textContent = `ORD-${txnId}`;
    if (amountPaidEl) amountPaidEl.textContent = formatINR(total);

    if (itemsSummaryEl) {
      itemsSummaryEl.innerHTML = state.cart.map(item => `
        <div class="summary-row" style="margin-bottom: 0.35rem; font-size: 0.85rem;">
          <span>${item.qty}x ${escapeHtml(item.name)} (${item.size})</span>
          <span>${formatINR(item.price * item.qty)}</span>
        </div>
      `).join('');
    }
  }

  function resolveStuckPayment(outcome = 'success') {
    if (!state.currentTransaction || state.currentTransaction.status !== 'PENDING_STUCK') {
      return;
    }

    clearInterval(state.stuckTimerInterval);
    const txnId = state.currentTransaction.id;
    const total = state.currentTransaction.amount;

    if (outcome === 'success') {
      logEvent('SUCCESS', `[RECONCILIATION COMPLETED]: Stuck transaction ${txnId} marked PAID`, {
        transactionId: txnId
      });
      state.currentTransaction.status = 'COMPLETED';
      showPaymentView('success');
      renderSuccessDetails(txnId, total);
      state.cart = [];
      updateCartUI();
      showToast('Payment verified successfully!', 'success');
    } else {
      state.currentTransaction.status = 'CANCELED';
      showPaymentView('failed');
      renderFailedDetails(
        'STATUS_CANCELED',
        'Transaction expired or was cancelled by user.',
        txnId,
        state.currentTransaction.rrn || 'RRN-0000000000',
        total,
        state.currentTransaction.method
      );
    }
  }

  // =========================================================================
  // 9. EVENT LISTENERS
  // =========================================================================
  function initEventListeners() {
    // Category Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.selectedCategory = e.currentTarget.getAttribute('data-category');
        renderProducts();
      });
    });

    // Cart Drawer Controls
    const cartBtn = document.getElementById('cart-trigger-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    const cartClose = document.getElementById('cart-drawer-close');
    const exploreFromEmptyBtn = document.getElementById('empty-cart-explore-btn');

    function toggleCart(open) {
      if (open) {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
      } else {
        cartDrawer.classList.remove('active');
        cartOverlay.classList.remove('active');
      }
    }

    if (cartBtn) cartBtn.addEventListener('click', () => toggleCart(true));
    if (cartClose) cartClose.addEventListener('click', () => toggleCart(false));
    if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCart(false));
    if (exploreFromEmptyBtn) {
      exploreFromEmptyBtn.addEventListener('click', () => {
        toggleCart(false);
        const cat = document.getElementById('catalog');
        if (cat) cat.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Quick Add Complete Outfit
    const quickAddBtn = document.getElementById('quick-demo-add-btn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        addToCart('prod_hoodie_01');
        addToCart('prod_pants_03');
        toggleCart(true);
      });
    }

    // Coupon Code Box (₹500 Discount)
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponInput = document.getElementById('coupon-input');
    if (applyCouponBtn && couponInput) {
      applyCouponBtn.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        if (code === 'AURA500' || code === 'SAVE500' || code === 'AURA10') {
          state.appliedCoupon = code;
          state.discountAmount = 500.00;
          updateCartUI();
          showToast(`Coupon ${code} applied (-₹500.00)!`, 'success');
        } else {
          showToast('Invalid coupon. Try "AURA500"', 'error');
        }
      });
    }

    // Checkout Modal Open & Close
    const proceedBtn = document.getElementById('proceed-checkout-btn');
    const checkoutModalOverlay = document.getElementById('checkout-modal-overlay');
    const checkoutModalClose = document.getElementById('checkout-modal-close');

    function toggleCheckout(open) {
      if (open) {
        if (state.cart.length === 0) {
          showToast('Please add items to your bag first!', 'warning');
          return;
        }
        toggleCart(false);
        showPaymentView('form');
        checkoutModalOverlay.classList.add('active');
      } else {
        checkoutModalOverlay.classList.remove('active');
        clearInterval(state.stuckTimerInterval);
      }
    }

    if (proceedBtn) proceedBtn.addEventListener('click', () => toggleCheckout(true));
    if (checkoutModalClose) checkoutModalClose.addEventListener('click', () => toggleCheckout(false));

    // Payment Method Tabs
    document.querySelectorAll('.payment-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.paymentMethod = e.currentTarget.getAttribute('data-method');

        const cardPanel = document.getElementById('card-panel');
        const upiPanel = document.getElementById('upi-panel');
        const bankPanel = document.getElementById('bank-panel');

        if (cardPanel) cardPanel.style.display = state.paymentMethod === 'card' ? 'block' : 'none';
        if (upiPanel) upiPanel.style.display = state.paymentMethod === 'upi' ? 'block' : 'none';
        if (bankPanel) bankPanel.style.display = state.paymentMethod === 'bank' ? 'block' : 'none';
      });
    });

    // Pay Now Submit Button
    const payNowBtn = document.getElementById('pay-now-button');
    if (payNowBtn) payNowBtn.addEventListener('click', startPaymentFlow);

    // Stuck Actions Buttons
    const resolveSuccessBtn = document.getElementById('sim-force-resolve-success-btn');
    const cancelStuckBtn = document.getElementById('cancel-stuck-btn');

    if (resolveSuccessBtn) resolveSuccessBtn.addEventListener('click', () => resolveStuckPayment('success'));
    if (cancelStuckBtn) cancelStuckBtn.addEventListener('click', () => showPaymentView('form'));

    // Failed Actions Buttons
    const retryPaymentBtn = document.getElementById('retry-payment-btn');
    const changeMethodBtn = document.getElementById('change-payment-method-btn');
    const copyTxnBtn = document.getElementById('copy-txn-details-btn');

    if (retryPaymentBtn) retryPaymentBtn.addEventListener('click', startPaymentFlow);
    if (changeMethodBtn) changeMethodBtn.addEventListener('click', () => showPaymentView('form'));

    if (copyTxnBtn) {
      copyTxnBtn.addEventListener('click', () => {
        if (!state.currentTransaction) return;
        const info = `--- AURA STUDIO TRANSACTION AUDIT ---
Transaction ID: ${state.currentTransaction.id}
Bank Reference RRN: ${state.currentTransaction.rrn}
Amount: ${formatINR(state.currentTransaction.amount)}
Payment Method: ${state.currentTransaction.method}
Timestamp: ${state.currentTransaction.startedAt}
Error Code: ${state.currentTransaction.errorCode || 'N/A'}
Retailer Helpline: 1800-2872-7883
Support Email: support@aurastudio.in`;

        navigator.clipboard.writeText(info)
          .then(() => showToast('Transaction audit copied to clipboard!', 'success'))
          .catch(() => showToast('Failed to copy', 'error'));
      });
    }

    // Success Action
    const successContinueBtn = document.getElementById('success-continue-shopping-btn');
    if (successContinueBtn) {
      successContinueBtn.addEventListener('click', () => {
        toggleCheckout(false);
      });
    }
  }

  // Expose API for external recovery solutions
  window.PaymentDemoGateway = {
    resolveStuckPayment,
    startPaymentFlow,
    getCurrentTransaction: () => ({ ...state.currentTransaction }),
    getCart: () => [...state.cart]
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartUI();
    initEventListeners();
  });

})();
