/**
 * AURA STUDIO - E-Commerce & Payment Failure Simulation Engine
 * Author: Yuri (Demo Payment Recovery Testbed)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PRODUCT CATALOG DATA
  // =========================================================================
  const PRODUCTS = [
    {
      id: 'prod_hoodie_01',
      name: 'Heavyweight Boxy Hoodie',
      category: 'outerwear',
      price: 85.00,
      image: 'assets/images/hoodie.jpg',
      description: '500 GSM French Terry cotton with structured dropped shoulders and minimal seamless pocket.',
      sizes: ['S', 'M', 'L', 'XL'],
      selectedSize: 'M'
    },
    {
      id: 'prod_shirt_02',
      name: 'Relaxed Linen Overshirt',
      category: 'tops',
      price: 68.00,
      image: 'assets/images/linen_overshirt.jpg',
      description: 'Breathable olive flax linen garment-dyed for a soft natural drape. Dual chest utility pockets.',
      sizes: ['S', 'M', 'L', 'XL'],
      selectedSize: 'L'
    },
    {
      id: 'prod_pants_03',
      name: 'Tailored Pleated Trousers',
      category: 'bottoms',
      price: 92.00,
      image: 'assets/images/trousers.jpg',
      description: 'Charcoal wool blend with double forward pleats, tapered ankle cut, and hidden waist adjuster.',
      sizes: ['30', '32', '34', '36'],
      selectedSize: '32'
    },
    {
      id: 'prod_tee_04',
      name: 'Sand Vintage Boxy Tee',
      category: 'tops',
      price: 45.00,
      image: 'assets/images/boxy_tee.jpg',
      description: '280 GSM combed organic cotton with reinforced rib collar and relaxed drape.',
      sizes: ['S', 'M', 'L', 'XL'],
      selectedSize: 'M'
    },
    {
      id: 'prod_denim_05',
      name: 'Indigo Worker Denim Jacket',
      category: 'outerwear',
      price: 110.00,
      image: 'assets/images/denim_jacket.jpg',
      description: '14oz selvedge denim treated with vintage wash. Triple stitched reinforced construction.',
      sizes: ['M', 'L', 'XL'],
      selectedSize: 'L'
    },
    {
      id: 'prod_tote_06',
      name: 'Matte Black Crossbody Tote',
      category: 'accessories',
      price: 58.00,
      image: 'assets/images/canvas_tote.jpg',
      description: 'Heavy duty duck canvas with matte black metal hardware and modular utility strap.',
      sizes: ['ONE SIZE'],
      selectedSize: 'ONE SIZE'
    }
  ];

  // =========================================================================
  // 2. APPLICATION STATE
  // =========================================================================
  const state = {
    cart: [
      {
        id: 'prod_hoodie_01',
        name: 'Heavyweight Boxy Hoodie',
        price: 85.00,
        image: 'assets/images/hoodie.jpg',
        size: 'L',
        qty: 1
      },
      {
        id: 'prod_pants_03',
        name: 'Tailored Pleated Trousers',
        price: 92.00,
        image: 'assets/images/trousers.jpg',
        size: '32',
        qty: 1
      }
    ],
    selectedCategory: 'all',
    activeScenario: 'stuck', // 'stuck' | 'declined' | 'timeout' | 'auth_fail' | 'success'
    paymentMethod: 'card',
    appliedCoupon: null,
    discountAmount: 0,
    currentTransaction: null,
    stuckTimerInterval: null,
    stuckSeconds: 0,
    logs: []
  };

  const SCENARIO_LABELS = {
    stuck: 'Stuck in Pending',
    declined: 'Card Declined (402)',
    timeout: '504 Gateway Timeout',
    auth_fail: '3DS / OTP Failed',
    success: 'Payment Success'
  };

  // =========================================================================
  // 3. LOGGING & EVENT EMITTER ENGINE
  // =========================================================================
  function logEvent(level, message, metadata = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const isoDate = new Date().toISOString();
    const entry = {
      timestamp,
      isoDate,
      level,
      message,
      metadata
    };
    state.logs.unshift(entry);
    renderLogs();

    // Dispatch a browser-level custom event so external scripts/test harnesses can listen!
    const customEvent = new CustomEvent('payment_event', {
      detail: {
        timestamp: isoDate,
        level,
        message,
        scenario: state.activeScenario,
        transaction: state.currentTransaction,
        ...metadata
      }
    });
    window.dispatchEvent(customEvent);
    console.log(`[AURA GATEWAY ${level}]`, message, metadata);
  }

  function renderLogs() {
    const feed = document.getElementById('console-log-feed');
    const countEl = document.getElementById('log-count');
    if (!feed) return;

    if (countEl) countEl.textContent = `${state.logs.length} events logged`;

    feed.innerHTML = state.logs.map(log => `
      <div class="log-entry">
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-level-${log.level}">[${log.level}]</span>
        <span class="log-msg">${escapeHtml(log.message)}</span>
      </div>
    `).join('');
  }

  // =========================================================================
  // 4. UI NOTIFICATIONS (TOASTS)
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
  // 5. PRODUCT CATALOG RENDERING
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
            <span class="product-price">$${product.price.toFixed(2)}</span>
          </div>
          <p class="product-desc">${escapeHtml(product.description)}</p>
          
          <div class="size-selector-row">
            <span class="size-label">Size:</span>
            ${product.sizes.map((sz, idx) => `
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

    // Attach size change listeners
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

    // Attach add to cart listeners
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prodId = e.currentTarget.getAttribute('data-product-id');
        addToCart(prodId);
      });
    });
  }

  // =========================================================================
  // 6. CART MANAGEMENT
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
    logEvent('INFO', `Item added to cart: ${product.name} (Size: ${product.selectedSize})`);
  }

  function updateItemQty(index, change) {
    if (!state.cart[index]) return;
    state.cart[index].qty += change;
    if (state.cart[index].qty <= 0) {
      const removed = state.cart.splice(index, 1);
      logEvent('INFO', `Removed ${removed[0].name} from cart.`);
    }
    updateCartUI();
  }

  function removeFromCart(index) {
    const removed = state.cart.splice(index, 1);
    logEvent('INFO', `Removed ${removed[0].name} from cart.`);
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

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    if (btnPreviewEl) btnPreviewEl.textContent = `$${total.toFixed(2)}`;

    // Sync Checkout modal preview values too
    const payBtnAmount = document.getElementById('pay-btn-amount');
    const modalItemCount = document.getElementById('modal-item-count');
    const modalSubtotal = document.getElementById('modal-subtotal');
    const modalTotal = document.getElementById('modal-total');

    if (payBtnAmount) payBtnAmount.textContent = `$${total.toFixed(2)}`;
    if (modalItemCount) modalItemCount.textContent = totalItems;
    if (modalSubtotal) modalSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (modalTotal) modalTotal.textContent = `$${total.toFixed(2)}`;

    // Discount handling
    if (state.discountAmount > 0 && discountRow) {
      discountRow.style.display = 'flex';
      if (discountCodeName) discountCodeName.textContent = state.appliedCoupon;
      if (cartDiscountEl) cartDiscountEl.textContent = `-$${state.discountAmount.toFixed(2)}`;
    } else if (discountRow) {
      discountRow.style.display = 'none';
    }

    // Render cart items in drawer
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
              <span class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</span>
              <button type="button" class="cart-item-remove" data-cart-action="remove" data-index="${idx}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');

      // Attach drawer item actions
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

    // Render checkout modal item list summary
    const modalItemList = document.getElementById('modal-item-list');
    if (modalItemList) {
      modalItemList.innerHTML = state.cart.map(item => `
        <div class="modal-item-row">
          <span class="modal-item-name">${item.qty}x ${escapeHtml(item.name)} (${item.size})</span>
          <span>$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // 7. PAYMENT SIMULATION ENGINE & SCENARIOS
  // =========================================================================
  function setScenario(scenarioKey) {
    if (!SCENARIO_LABELS[scenarioKey]) return;
    state.activeScenario = scenarioKey;

    // Update Header Badge & Dock
    const activeBadge = document.getElementById('active-scenario-name');
    const dockTag = document.getElementById('dock-active-mode');
    const scenarioName = SCENARIO_LABELS[scenarioKey];

    if (activeBadge) activeBadge.textContent = `Mode: ${scenarioName}`;
    if (dockTag) dockTag.textContent = scenarioName;

    // Sync radio inputs in checkout modal
    const radio = document.querySelector(`input[name="checkout-scenario"][value="${scenarioKey}"]`);
    if (radio) radio.checked = true;

    showToast(`Payment test mode set to: ${scenarioName}`, 'warning');
    logEvent('INFO', `Payment simulation scenario changed to: ${scenarioName}`);
  }

  function startPaymentFlow() {
    if (state.cart.length === 0) {
      showToast('Your bag is empty! Add items first.', 'error');
      return;
    }

    const total = getCartTotal();
    const txnId = 'TXN_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    state.currentTransaction = {
      id: txnId,
      amount: total,
      currency: 'USD',
      itemsCount: state.cart.length,
      method: state.paymentMethod,
      scenario: state.activeScenario,
      startedAt: new Date().toISOString(),
      status: 'INITIATED'
    };

    logEvent('INFO', `Payment checkout started for $${total.toFixed(2)} via [${state.paymentMethod.toUpperCase()}]`, {
      transactionId: txnId,
      scenario: state.activeScenario
    });

    // Switch view to Processing
    showPaymentView('processing');
    updateProcessingTimeline(1);

    // Process based on selected scenario
    executeScenario(state.activeScenario, txnId, total);
  }

  function executeScenario(scenario, txnId, total) {
    const procTitle = document.getElementById('processing-title');
    const procDesc = document.getElementById('processing-desc');
    const stuckBanner = document.getElementById('stuck-banner');

    if (stuckBanner) stuckBanner.style.display = 'none';

    if (scenario === 'stuck') {
      // ⏳ SCENARIO 1: STUCK IN PENDING
      setTimeout(() => {
        updateProcessingTimeline(2);
        logEvent('WARN', `Gateway dispatching auth request to acquirer... Reference: ${txnId}`);
      }, 1200);

      setTimeout(() => {
        updateProcessingTimeline(3);
        if (procTitle) procTitle.textContent = 'Awaiting Settlement Confirmation...';
        if (procDesc) procDesc.textContent = 'Issuing bank has not returned a callback response. Connection is hanging.';
        
        // Show stuck alert banner
        if (stuckBanner) stuckBanner.style.display = 'block';
        const stuckTxnId = document.getElementById('stuck-txn-id');
        if (stuckTxnId) stuckTxnId.textContent = txnId;

        state.currentTransaction.status = 'PENDING_STUCK';
        state.currentTransaction.errorCode = 'ERR_GATEWAY_NO_CALLBACK';

        // Start live stuck timer counter
        state.stuckSeconds = 5;
        clearInterval(state.stuckTimerInterval);
        state.stuckTimerInterval = setInterval(() => {
          state.stuckSeconds++;
          const timerEl = document.getElementById('stuck-timer-counter');
          if (timerEl) timerEl.textContent = `${state.stuckSeconds}s elapsed`;
        }, 1000);

        logEvent('ERROR', `TRANSACTION STUCK IN PENDING STATE: No ACK from banking switch after ${state.stuckSeconds}s.`, {
          transactionId: txnId,
          status: 'PENDING_STUCK',
          actionRequired: 'Automated reconciliation or manual webhook replay needed.'
        });

      }, 2500);

    } else if (scenario === 'declined') {
      // 🛑 SCENARIO 2: CARD DECLINED (402)
      setTimeout(() => updateProcessingTimeline(2), 800);
      setTimeout(() => {
        state.currentTransaction.status = 'FAILED';
        state.currentTransaction.errorCode = 'ERR_CARD_DECLINED';
        state.currentTransaction.httpStatus = 402;

        showPaymentView('failed');
        renderFailedDetails(
          'ERR_CARD_DECLINED',
          'Card issuer declined the transaction (Insufficient funds or risk security rules).',
          txnId
        );

        logEvent('ERROR', `Payment Failed [402 Payment Required]: ERR_CARD_DECLINED`, {
          transactionId: txnId,
          declineCode: 'insufficient_funds'
        });
      }, 2000);

    } else if (scenario === 'timeout') {
      // ⏱️ SCENARIO 3: 504 GATEWAY TIMEOUT
      if (procTitle) procTitle.textContent = 'Negotiating with Remote Banking Node...';
      setTimeout(() => updateProcessingTimeline(2), 1500);

      setTimeout(() => {
        state.currentTransaction.status = 'FAILED';
        state.currentTransaction.errorCode = 'ERR_GATEWAY_TIMEOUT';
        state.currentTransaction.httpStatus = 504;

        showPaymentView('failed');
        renderFailedDetails(
          'ERR_GATEWAY_TIMEOUT (HTTP 504)',
          'Bank gateway upstream timed out after 5000ms. No confirmation was received.',
          txnId
        );

        logEvent('ERROR', `Payment Timed Out [504 Gateway Timeout]: Upstream gateway unresponsive`, {
          transactionId: txnId
        });
      }, 4500);

    } else if (scenario === 'auth_fail') {
      // 🔒 SCENARIO 4: 3DS / OTP FAILED
      setTimeout(() => updateProcessingTimeline(2), 900);
      setTimeout(() => {
        state.currentTransaction.status = 'FAILED';
        state.currentTransaction.errorCode = 'ERR_3DS_AUTH_FAILED';
        state.currentTransaction.httpStatus = 403;

        showPaymentView('failed');
        renderFailedDetails(
          'ERR_3DS_AUTH_FAILED',
          'Customer 3D Secure / OTP authentication failed or challenge expired.',
          txnId
        );

        logEvent('ERROR', `Payment Authentication Failure: ERR_3DS_AUTH_FAILED`, {
          transactionId: txnId
        });
      }, 2200);

    } else if (scenario === 'success') {
      // ✅ SCENARIO 5: SUCCESSFUL PAYMENT
      setTimeout(() => updateProcessingTimeline(2), 800);
      setTimeout(() => updateProcessingTimeline(3), 1600);
      setTimeout(() => {
        state.currentTransaction.status = 'COMPLETED';
        state.currentTransaction.httpStatus = 200;

        showPaymentView('success');
        renderSuccessDetails(txnId, total);

        logEvent('SUCCESS', `Payment Authorized Successfully! Txn: ${txnId}, Amount: $${total.toFixed(2)}`, {
          transactionId: txnId,
          status: 'PAID'
        });

        // Clear cart on success
        state.cart = [];
        updateCartUI();
      }, 2500);
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
    // viewName: 'form' | 'processing' | 'failed' | 'success'
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

  function renderFailedDetails(code, reason, txnId) {
    const codeEl = document.getElementById('error-code-val');
    const reasonEl = document.getElementById('error-reason-val');
    const txnEl = document.getElementById('failed-txn-id');
    const timeEl = document.getElementById('failed-timestamp');

    if (codeEl) codeEl.textContent = code;
    if (reasonEl) reasonEl.textContent = reason;
    if (txnEl) txnEl.textContent = txnId;
    if (timeEl) timeEl.textContent = new Date().toLocaleString();
  }

  function renderSuccessDetails(txnId, total) {
    const orderIdEl = document.getElementById('success-order-id');
    const amountPaidEl = document.getElementById('receipt-amount-paid');
    const itemsSummaryEl = document.getElementById('receipt-items-summary');

    if (orderIdEl) orderIdEl.textContent = `ORD-${txnId}`;
    if (amountPaidEl) amountPaidEl.textContent = `$${total.toFixed(2)}`;

    if (itemsSummaryEl) {
      itemsSummaryEl.innerHTML = state.cart.map(item => `
        <div class="summary-row" style="margin-bottom: 0.35rem; font-size: 0.85rem;">
          <span>${item.qty}x ${escapeHtml(item.name)} (${item.size})</span>
          <span>$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('');
    }
  }

  /**
   * Solution Demonstration Hook:
   * Programmatically resolves a stuck transaction to simulate external recovery!
   */
  function resolveStuckPayment(outcome = 'success') {
    if (!state.currentTransaction || state.currentTransaction.status !== 'PENDING_STUCK') {
      showToast('No transaction currently stuck in pending!', 'warning');
      return;
    }

    clearInterval(state.stuckTimerInterval);
    const txnId = state.currentTransaction.id;
    const total = state.currentTransaction.amount;

    if (outcome === 'success') {
      logEvent('SUCCESS', `[RECOVERY SOLUTION TRIGGERED]: Stuck transaction ${txnId} reconciled via Bank Webhook -> Marked PAID`, {
        transactionId: txnId,
        resolvedBy: 'Demo Recovery Worker'
      });
      state.currentTransaction.status = 'COMPLETED';
      showPaymentView('success');
      renderSuccessDetails(txnId, total);
      state.cart = [];
      updateCartUI();
      showToast('Solution reconciled: Transaction marked PAID!', 'success');
    } else {
      logEvent('ERROR', `[RECOVERY SOLUTION TRIGGERED]: Stuck transaction ${txnId} expired -> Auto-canceled & released hold`, {
        transactionId: txnId,
        resolvedBy: 'Demo Recovery Worker'
      });
      state.currentTransaction.status = 'CANCELED';
      showPaymentView('failed');
      renderFailedDetails(
        'STATUS_AUTO_CANCELED',
        'Stuck transaction timed out and was gracefully canceled by the recovery engine.',
        txnId
      );
      showToast('Solution auto-canceled stuck transaction.', 'warning');
    }
  }

  // =========================================================================
  // 8. EVENT LISTENERS & MODAL BINDINGS
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

    // Quick Add Sample Outfit
    const quickAddBtn = document.getElementById('quick-demo-add-btn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        addToCart('prod_hoodie_01');
        addToCart('prod_pants_03');
        toggleCart(true);
      });
    }

    // Coupon Code Box
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponInput = document.getElementById('coupon-input');
    if (applyCouponBtn && couponInput) {
      applyCouponBtn.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        if (code === 'DEMO10' || code === 'SAVE10') {
          state.appliedCoupon = code;
          state.discountAmount = 15.00;
          updateCartUI();
          showToast(`Coupon ${code} applied (-$15.00)!`, 'success');
        } else {
          showToast('Invalid coupon. Try "DEMO10"', 'error');
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
          showToast('Please add items to your cart first!', 'warning');
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

    // Payment Method Tabs in Modal
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

    // Radio Scenario Selector inside Checkout Form
    document.querySelectorAll('input[name="checkout-scenario"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        setScenario(e.target.value);
      });
    });

    // Scenario Cards in Guide section
    document.querySelectorAll('.select-scenario-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sc = e.currentTarget.getAttribute('data-set-scenario');
        setScenario(sc);
        toggleCheckout(true);
      });
    });

    // Pay Now Submit Button
    const payNowBtn = document.getElementById('pay-now-button');
    if (payNowBtn) payNowBtn.addEventListener('click', startPaymentFlow);

    // Stuck Actions Buttons
    const resolveSuccessBtn = document.getElementById('sim-force-resolve-success-btn');
    const resolveFailBtn = document.getElementById('sim-force-resolve-fail-btn');
    const cancelStuckBtn = document.getElementById('cancel-stuck-btn');

    if (resolveSuccessBtn) resolveSuccessBtn.addEventListener('click', () => resolveStuckPayment('success'));
    if (resolveFailBtn) resolveFailBtn.addEventListener('click', () => resolveStuckPayment('cancel'));
    if (cancelStuckBtn) cancelStuckBtn.addEventListener('click', () => showPaymentView('form'));

    // Failed Actions Buttons
    const retryPaymentBtn = document.getElementById('retry-payment-btn');
    const changeMethodBtn = document.getElementById('change-payment-method-btn');

    if (retryPaymentBtn) retryPaymentBtn.addEventListener('click', startPaymentFlow);
    if (changeMethodBtn) changeMethodBtn.addEventListener('click', () => showPaymentView('form'));

    // Success Actions
    const successContinueBtn = document.getElementById('success-continue-shopping-btn');
    const successTestAnotherBtn = document.getElementById('success-test-another-btn');

    if (successContinueBtn) {
      successContinueBtn.addEventListener('click', () => {
        toggleCheckout(false);
      });
    }
    if (successTestAnotherBtn) {
      successTestAnotherBtn.addEventListener('click', () => {
        // Quick add an item back so they can run another test
        addToCart('prod_shirt_02');
        showPaymentView('form');
      });
    }

    // Diagnostics / Console Modal
    const dockToggleBtn = document.getElementById('dock-toggle-btn');
    const dockConsoleBtn = document.getElementById('dock-console-btn');
    const openControlPanelBtn = document.getElementById('open-control-panel-btn');
    const openEventLogBtn = document.getElementById('open-event-log-btn');
    const consoleOverlay = document.getElementById('console-modal-overlay');
    const consoleClose = document.getElementById('console-modal-close');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const copyLogsBtn = document.getElementById('copy-logs-btn');

    function toggleConsole(open) {
      if (open) {
        consoleOverlay.classList.add('active');
        renderLogs();
      } else {
        consoleOverlay.classList.remove('active');
      }
    }

    if (dockConsoleBtn) dockConsoleBtn.addEventListener('click', () => toggleConsole(true));
    if (openEventLogBtn) openEventLogBtn.addEventListener('click', () => toggleConsole(true));
    if (consoleClose) consoleClose.addEventListener('click', () => toggleConsole(false));
    if (consoleOverlay) {
      consoleOverlay.addEventListener('click', (e) => {
        if (e.target === consoleOverlay) toggleConsole(false);
      });
    }

    if (dockToggleBtn || openControlPanelBtn) {
      const handler = () => {
        const guideEl = document.getElementById('simulator-guide');
        if (guideEl) guideEl.scrollIntoView({ behavior: 'smooth' });
      };
      if (dockToggleBtn) dockToggleBtn.addEventListener('click', handler);
      if (openControlPanelBtn) openControlPanelBtn.addEventListener('click', handler);
    }

    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        state.logs = [];
        renderLogs();
        showToast('Console logs cleared.');
      });
    }

    if (copyLogsBtn) {
      copyLogsBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(state.logs, null, 2))
          .then(() => showToast('Logs copied to clipboard as JSON!', 'success'))
          .catch(() => showToast('Failed to copy to clipboard', 'error'));
      });
    }
  }

  // =========================================================================
  // 9. EXPOSE PUBLIC TESTBED API TO WINDOW
  // =========================================================================
  window.PaymentDemoGateway = {
    setScenario,
    resolveStuckPayment,
    startPaymentFlow,
    getLogs: () => [...state.logs],
    getCurrentTransaction: () => ({ ...state.currentTransaction }),
    getCart: () => [...state.cart]
  };

  // =========================================================================
  // 10. INITIALIZATION
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartUI();
    initEventListeners();

    // Initial system logs
    logEvent('INFO', 'AURA Studio Payment Testbed Gateway Initialized.');
    logEvent('INFO', `Default scenario configured: [${SCENARIO_LABELS[state.activeScenario]}]`);
  });

})();
