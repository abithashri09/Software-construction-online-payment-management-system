/* ============================================
   PAYTRACK — Main JavaScript
   All CRUD logic, auth, and UI helpers
   ============================================ */

/* ── Constants ── */
const STORAGE_KEY = 'prms_payments';
const AUTH_KEY    = 'prms_auth';

/* ── Static credentials ── */
const VALID_USERS = [
  { username: 'admin',   password: '1234',   displayName: 'Admin User' },
  { username: 'manager', password: 'pass99', displayName: 'Manager' },
];

/* ==================================================
   AUTH
   ================================================== */
function login(username, password) {
  const user = VALID_USERS.find(
    u => u.username === username.trim() && u.password === password
  );
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      username: user.username,
      displayName: user.displayName,
      loginTime: new Date().toISOString(),
    }));
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

function getSession() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

/* Redirect to login if no session */
function requireAuth() {
  if (!getSession()) window.location.href = 'index.html';
}

/* ==================================================
   PAYMENT CRUD
   ================================================== */
function getPayments() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function savePayments(payments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
}

function generateId() {
  return 'PMT-' + Date.now().toString(36).toUpperCase();
}

/* Create a new payment — default status: Pending */
function addPayment(customerName, amount) {
  const payments = getPayments();
  const p = {
    id:           generateId(),
    customerName: customerName.trim(),
    amount:       parseFloat(amount).toFixed(2),
    status:       'Pending',
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };
  payments.push(p);
  savePayments(payments);
  return p;
}

/* Update status of a payment by ID */
function updatePaymentStatus(id, status) {
  const payments = getPayments();
  const idx = payments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  payments[idx].status    = status;
  payments[idx].updatedAt = new Date().toISOString();
  savePayments(payments);
  return true;
}

/* Delete a payment by ID */
function deletePayment(id) {
  let payments = getPayments();
  const before = payments.length;
  payments = payments.filter(p => p.id !== id);
  if (payments.length === before) return false;
  savePayments(payments);
  return true;
}

/* Summary stats for dashboard */
function getStats() {
  const payments = getPayments();
  const paid    = payments.filter(p => p.status === 'Paid');
  const pending = payments.filter(p => p.status === 'Pending');
  const totalAmount = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const paidAmount  = paid.reduce((s, p) => s + parseFloat(p.amount), 0);
  return {
    total: payments.length, paid: paid.length, pending: pending.length,
    totalAmount: totalAmount.toFixed(2), paidAmount: paidAmount.toFixed(2),
  };
}

/* ==================================================
   UI HELPERS
   ================================================== */

/* Show a toast notification */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]||icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-dismiss" aria-label="Dismiss">×</button>`;
  toast.querySelector('.toast-dismiss').addEventListener('click', () => removeToast(toast));
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(20px)';
  toast.style.transition = 'all .3s ease';
  setTimeout(() => toast.remove(), 300);
}

/* Format ISO date string */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

/* Format number as INR */
function formatCurrency(amount) {
  return '₹ ' + parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

/* Populate user chip in sidebar */
function setupUserChip() {
  const session = getSession();
  if (!session) return;
  const nameEl   = document.getElementById('currentUser');
  const avatarEl = document.getElementById('userAvatar');
  const logoutEl = document.getElementById('logoutBtn');
  if (nameEl)   nameEl.textContent   = session.displayName;
  if (avatarEl) avatarEl.textContent = session.displayName.charAt(0).toUpperCase();
  if (logoutEl) logoutEl.addEventListener('click', () => {
    if (confirm('Log out of PayTrack?')) logout();
  });
}

/* Highlight the active nav link */
function highlightNav() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === current);
  });
}

/* Mobile sidebar toggle */
function setupMobileMenu() {
  const toggle  = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => sidebar.classList.remove('open'));
  });
}

/* Escape HTML to prevent XSS */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Generic confirm modal */
function showConfirmModal(title, message, onConfirm, isDanger = false) {
  const existing = document.getElementById('confirmModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirmModal';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${escapeHtml(title)}</h3>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn btn-outline" id="modalCancel">Cancel</button>
        <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="modalConfirm">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modalConfirm').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ==================================================
   PAGE: LOGIN
   ================================================== */
function initLoginPage() {
  if (getSession()) { window.location.href = 'dashboard.html'; return; }

  const form     = document.getElementById('loginForm');
  const errorEl  = document.getElementById('loginError');
  const passEl   = document.getElementById('password');
  const toggleEl = document.getElementById('togglePassword');

  /* Password visibility toggle */
  if (toggleEl) {
    toggleEl.addEventListener('click', () => {
      const show = passEl.type === 'password';
      passEl.type = show ? 'text' : 'password';
      toggleEl.textContent = show ? '🙈' : '👁️';
    });
  }

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

    if (!username || !password) {
      if (errorEl) { errorEl.textContent = 'Please enter username and password.'; errorEl.style.display = 'block'; }
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    setTimeout(() => {
      if (login(username, password)) {
        window.location.href = 'dashboard.html';
      } else {
        if (errorEl) { errorEl.textContent = '❌ Invalid credentials. Try admin / 1234'; errorEl.style.display = 'block'; }
        btn.disabled = false;
        btn.textContent = 'Sign In →';
      }
    }, 600);
  });
}

/* ==================================================
   PAGE: DASHBOARD
   ================================================== */
function initDashboardPage() {
  requireAuth(); setupUserChip(); highlightNav(); setupMobileMenu();

  const stats = getStats();
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('statTotal',       stats.total);
  setEl('statPaid',        stats.paid);
  setEl('statPending',     stats.pending);
  setEl('statTotalAmount', formatCurrency(stats.totalAmount));
}

/* ==================================================
   PAGE: ADD PAYMENT
   ================================================== */
function initAddPage() {
  requireAuth(); setupUserChip(); highlightNav(); setupMobileMenu();

  const form = document.getElementById('addPaymentForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name   = document.getElementById('customerName').value.trim();
    const amount = document.getElementById('amount').value;

    if (!name || name.length < 2) { showToast('Enter a valid customer name (min 2 chars).', 'error'); return; }
    if (!amount || parseFloat(amount) <= 0) { showToast('Enter a valid positive amount.', 'error'); return; }

    const payment = addPayment(name, amount);
    showToast(`Record saved! ID: ${payment.id}`, 'success');
    form.reset();

    /* Show confirmation strip */
    const confirmEl = document.getElementById('addConfirm');
    if (confirmEl) {
      confirmEl.style.display = 'block';
      document.getElementById('confirmId').textContent     = payment.id;
      document.getElementById('confirmName').textContent   = payment.customerName;
      document.getElementById('confirmAmount').textContent = formatCurrency(payment.amount);
      document.getElementById('confirmDate').textContent   = formatDate(payment.createdAt);
    }
  });
}

/* ==================================================
   PAGE: UPDATE STATUS
   ================================================== */
function initUpdatePage() {
  requireAuth(); setupUserChip(); highlightNav(); setupMobileMenu();

  let selectedId = null;
  const listEl    = document.getElementById('paymentList');
  const updateBtn = document.getElementById('updateBtn');
  const searchEl  = document.getElementById('updateSearch');
  const hintEl    = document.getElementById('selectionHint');

  function renderList(filterText = '') {
    const payments = getPayments();
    listEl.innerHTML = '';
    selectedId = null;
    if (updateBtn) updateBtn.disabled = true;
    if (hintEl) hintEl.textContent = 'No payment selected';

    const filtered = payments.filter(p =>
      p.customerName.toLowerCase().includes(filterText.toLowerCase()) ||
      p.id.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">🔍</div>
          <h3>No records found</h3>
          <p>${payments.length === 0 ? 'Add payments first.' : 'Try a different search term.'}</p>
        </div>`;
      return;
    }

    filtered.forEach(p => {
      const isPaid = p.status === 'Paid';
      const initials = p.customerName.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      const item = document.createElement('div');
      item.className = 'payment-item' + (isPaid ? ' is-paid' : '');
      item.dataset.id = p.id;
      item.innerHTML = `
        <div class="pi-avatar">${initials}</div>
        <div class="pi-info">
          <strong>${escapeHtml(p.customerName)}</strong>
          <span>${p.id} · ${formatDate(p.createdAt)}</span>
        </div>
        <div class="pi-right">
          <div class="pi-amount">${formatCurrency(p.amount)}</div>
          <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">
            <span class="badge-dot"></span>${p.status}
          </span>
        </div>`;

      if (!isPaid) {
        item.addEventListener('click', () => {
          listEl.querySelectorAll('.payment-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          selectedId = p.id;
          if (updateBtn) updateBtn.disabled = false;
          if (hintEl) hintEl.textContent = `Selected: ${p.customerName}`;
        });
      }
      listEl.appendChild(item);
    });
  }

  renderList();

  if (searchEl) searchEl.addEventListener('input', () => renderList(searchEl.value));

  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      if (!selectedId) return;
      const p = getPayments().find(x => x.id === selectedId);
      if (!p) return;
      showConfirmModal(
        'Mark as Paid?',
        `Confirm marking <strong>${escapeHtml(p.customerName)}</strong> (${formatCurrency(p.amount)}) as <strong style="color:var(--green2)">Paid</strong>. This cannot be undone.`,
        () => {
          if (updatePaymentStatus(selectedId, 'Paid')) {
            showToast('Payment marked as Paid! ✅', 'success');
            renderList(searchEl ? searchEl.value : '');
          }
        }
      );
    });
  }
}

/* ==================================================
   PAGE: REPORT
   ================================================== */
function initReportPage() {
  requireAuth(); setupUserChip(); highlightNav(); setupMobileMenu();

  let currentFilter = 'all';
  let searchQuery   = '';
  const tbody      = document.getElementById('reportTableBody');
  const searchEl   = document.getElementById('reportSearch');
  const countEl    = document.getElementById('reportCount');

  function renderTable() {
    let filtered = getPayments();

    if (currentFilter !== 'all')
      filtered = filtered.filter(p => p.status.toLowerCase() === currentFilter);

    if (searchQuery)
      filtered = filtered.filter(p =>
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      );

    /* Sort newest first */
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (countEl) countEl.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
        <div class="es-icon">📋</div>
        <h3>No payments found</h3>
        <p>${getPayments().length === 0 ? 'Add your first payment to get started.' : 'No results match your filter.'}</p>
        ${getPayments().length === 0 ? '<a href="add.html" class="btn btn-primary btn-sm">+ Add Payment</a>' : ''}
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((p, i) => `
      <tr class="fade-in" style="animation-delay:${i*25}ms">
        <td class="td-id">${escapeHtml(p.id)}</td>
        <td class="td-name">${escapeHtml(p.customerName)}</td>
        <td class="td-amount">${formatCurrency(p.amount)}</td>
        <td>
          <span class="badge ${p.status==='Paid'?'badge-paid':'badge-pending'}">
            <span class="badge-dot"></span>${p.status}
          </span>
        </td>
        <td style="font-size:12px;color:var(--muted)">${formatDate(p.createdAt)}</td>
        <td>
          <button class="btn btn-danger btn-sm"
            onclick="confirmDelete('${p.id}','${escapeHtml(p.customerName).replace(/'/g,"&#39;")}')"
            title="Delete">🗑 Delete</button>
        </td>
      </tr>`).join('');
  }

  /* Filter buttons */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  /* Search */
  if (searchEl) searchEl.addEventListener('input', () => { searchQuery = searchEl.value; renderTable(); });

  renderTable();

  /* Global delete handler for inline onclick */
  window.confirmDelete = function (id, name) {
    showConfirmModal('Delete Record?',
      `Permanently delete the payment record for <strong>${escapeHtml(name)}</strong>? This cannot be undone.`,
      () => { if (deletePayment(id)) { showToast('Record deleted.', 'info'); renderTable(); } },
      true
    );
  };

  /* CSV export */
  const exportBtn = document.getElementById('exportCsv');
  if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
}

/* ==================================================
   EXPORT CSV
   ================================================== */
function exportToCSV() {
  const payments = getPayments();
  if (!payments.length) { showToast('No data to export.', 'info'); return; }
  const headers = ['ID','Customer Name','Amount (INR)','Status','Created At','Updated At'];
  const rows = payments.map(p => [
    p.id,
    `"${p.customerName.replace(/"/g,'""')}"`,
    p.amount, p.status,
    formatDate(p.createdAt), formatDate(p.updatedAt),
  ]);
  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `payments_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Report exported as CSV 📥', 'success');
}

/* ==================================================
   AUTO-INIT
   ================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'index.html'     || page === '') initLoginPage();
  if (page === 'dashboard.html')                initDashboardPage();
  if (page === 'add.html')                      initAddPage();
  if (page === 'update.html')                   initUpdatePage();
  if (page === 'report.html')                   initReportPage();
});