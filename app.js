const TOTAL_SEATS = 75;
const API_BASE_URL = window.ASPIRANT_API_BASE || 'http://localhost:4000/api';
const LIBRARY = {
  name: 'Aspirant Library',
  tagline: 'Learn. Explore. Achieve.',
  owner: 'Chirag Kumar',
  phone: '+91 99914 18414',
  address: 'Bighar Rd, near PWD office, Jagjivan Pura, Fatehabad, Haryana 125050',
  mapUrl: 'https://maps.app.goo.gl/VPeGqPzQ6b4gKm616',
  hours: 'Open 24x7',
};

const $ = (selector) => document.querySelector(selector);
const seatSelect = $('#seatNumber');
const seatGrid = $('#seat-grid');
const heroSeatCount = $('#hero-seat-count');
const heroSeatMeter = $('#hero-seat-meter');
const heroLastUpdate = $('#hero-last-update');
const receiptBody = $('#receipt-body');
const receiptPrintable = $('#receiptPrintable');
const yearEl = $('#year');
const downloadPdfBtn = $('#downloadReceiptPdf');
const whatsappBtn = $('#sendWhatsApp');
const adminList = $('#admin-list');
const refreshSeatsBtn = $('#refreshSeats');
const form = $('#seat-form');

let seats = Array.from({ length: TOTAL_SEATS }, (_, idx) => createSeat(idx + 1));
let latestReceipt = null;

const formatDate = (isoString) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString));

const formatDateOnly = (isoString) =>
  isoString
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(isoString))
    : '—';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

function createSeat(number) {
  return {
    number,
    studentName: null,
    phoneNumber: null,
    gender: null,
    plan: null,
    startDate: null,
    endDate: null,
    amount: null,
    assignedAt: null,
    receiptId: null,
  };
}

const SeatService = {
  async request(path, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      ...options,
    };
    if (options.body && typeof options.body !== 'string') {
      config.body = JSON.stringify(options.body);
    }
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, config);
    } catch (error) {
      throw new Error('Could not reach the shared seat server. Check your connection.');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Server error. Please try again.');
    }
    return payload;
  },
  list() {
    return this.request('/seats');
  },
  assign(body) {
    return this.request('/seats/assign', { method: 'POST', body });
  },
  release(seatNumber) {
    return this.request('/seats/release', { method: 'POST', body: { seatNumber } });
  },
};

const setStatus = (message, type = 'info') => {
  let banner = document.getElementById('form-status');
  if (!banner) {
    banner = document.createElement('p');
    banner.id = 'form-status';
    banner.style.marginTop = '0.5rem';
    form.appendChild(banner);
  }
  banner.textContent = message;
  const colors = {
    error: '#dc2626',
    success: '#0f9d58',
    info: '#0f172a',
  };
  banner.style.color = colors[type] || colors.info;
};

const refreshSeatSelect = () => {
  const fragment = document.createDocumentFragment();
  seats.forEach((seat) => {
    const option = document.createElement('option');
    option.value = seat.number;
    option.textContent = seat.studentName ? `Seat ${seat.number} - ${seat.studentName}` : `Seat ${seat.number}`;
    option.disabled = Boolean(seat.studentName);
    fragment.appendChild(option);
  });
  seatSelect.innerHTML = '';
  seatSelect.appendChild(fragment);
  focusFirstAvailableSeat();
};

const focusFirstAvailableSeat = () => {
  const firstAvailable = seats.find((seat) => !seat.studentName);
  seatSelect.value = firstAvailable ? firstAvailable.number : '';
};

const renderSeatGrid = () => {
  seatGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  seats.forEach((seat) => {
    const div = document.createElement('div');
    let className = 'seat';
    if (seat.studentName) {
      className += ' occupied';
      // Always check gender when seat is occupied
      if (seat.gender === 'male') {
        className += ' male';
      } else if (seat.gender === 'female') {
        className += ' female';
      }
    } else {
      className += ' available';
    }
    div.className = className;
    div.textContent = seat.number;
    
    if (seat.studentName) {
      // Add occupant name
      const occupant = document.createElement('p');
      occupant.textContent = seat.studentName.split(' ')[0];
      occupant.className = 'seat__name';
      div.appendChild(occupant);
      
      // Add days remaining
      if (seat.endDate) {
        const daysLeft = getDaysRemaining(seat.endDate);
        const days = document.createElement('span');
        days.className = 'days-left';
        days.textContent = `${daysLeft}d`;
        div.appendChild(days);
      }
      
      div.title = `${seat.studentName}\n${seat.gender === 'female' ? 'Female' : 'Male'}\n${getDaysRemaining(seat.endDate)} days remaining`;
    }
    
    fragment.appendChild(div);
  });
  seatGrid.appendChild(fragment);
};

const renderAdminList = () => {
  const assigned = seats.filter((seat) => seat.studentName);
  if (!assigned.length) {
    adminList.innerHTML = '<p class="muted">No seats assigned yet.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'admin-table';
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Seat</th>
      <th>Student</th>
      <th>Gender</th>
      <th>Start Date</th>
      <th>Days Left</th>
      <th>Amount</th>
      <th>Actions</th>
    </tr>`;
  const tbody = document.createElement('tbody');

  assigned.forEach((seat) => {
    const tr = document.createElement('tr');
    const seatTd = document.createElement('td');
    seatTd.textContent = `#${seat.number}`;
    const studentTd = document.createElement('td');
    studentTd.textContent = seat.studentName;
    const planTd = document.createElement('td');
    planTd.textContent = seat.plan || '—';
    const startTd = document.createElement('td');
    startTd.textContent = formatDateOnly(seat.startDate);
    const amountTd = document.createElement('td');
    amountTd.textContent = formatCurrency(seat.amount);
    const genderTd = document.createElement('td');
    genderTd.textContent = seat.gender === 'female' ? 'Female' : 'Male';
    
    const daysLeftTd = document.createElement('td');
    const daysLeft = getDaysRemaining(seat.endDate);
    daysLeftTd.textContent = `${daysLeft} days`;
    
    const actionTd = document.createElement('td');
    actionTd.className = 'actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn ghost small';
    downloadBtn.textContent = 'Receipt';
    downloadBtn.addEventListener('click', () => {
      latestReceipt = seat;
      downloadReceiptPdf();
    });
    
    const releaseBtn = document.createElement('button');
    releaseBtn.type = 'button';
    releaseBtn.className = 'btn danger small';
    releaseBtn.dataset.releaseSeat = seat.number;
    releaseBtn.textContent = 'Release';
    
    actionTd.appendChild(downloadBtn);
    actionTd.appendChild(releaseBtn);

    [seatTd, studentTd, genderTd, startTd, daysLeftTd, amountTd, actionTd].forEach((cell) => tr.appendChild(cell));
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  adminList.innerHTML = '';
  adminList.appendChild(table);
};

const updateHero = () => {
  const occupied = seats.filter((seat) => seat.studentName).length;
  heroSeatCount.textContent = `${occupied} / ${TOTAL_SEATS}`;
  heroSeatMeter.style.width = `${(occupied / TOTAL_SEATS) * 100}%`;
  heroLastUpdate.textContent = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date());
};

const renderAll = () => {
  refreshSeatSelect();
  renderSeatGrid();
  renderAdminList();
  updateHero();
};

const showReceipt = (data) => {
  const template = document.getElementById('receipt-template');
  const clone = template.content.cloneNode(true);
  clone.querySelector('[data-field="receiptId"]').textContent = data.receiptId;
  clone.querySelector('[data-field="issuedAt"]').textContent = formatDate(data.issuedAt);
  clone.querySelector('[data-field="studentName"]').textContent = data.studentName;
  clone.querySelector('[data-field="seatNumber"]').textContent = data.seatNumber;
  clone.querySelector('[data-field="startDate"]').textContent = formatDateOnly(data.startDate);
  clone.querySelector('[data-field="endDate"]').textContent = formatDateOnly(data.endDate);
  clone.querySelector('[data-field="amount"]').textContent = formatCurrency(data.amount);
  clone.querySelector('[data-field="phoneNumber"]').textContent = data.phoneDisplay;
  receiptBody.innerHTML = '';
  receiptBody.appendChild(clone);

  downloadPdfBtn.disabled = false;
  whatsappBtn.disabled = false;
};

// Initialize one month date range
const setOneMonthRange = () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (!startInput || !endInput) return;
  
  const start = new Date(startInput.value || new Date());
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  
  startInput.value = start.toISOString().split('T')[0];
  endInput.value = end.toISOString().split('T')[0];
};

// Calculate days remaining
const getDaysRemaining = (endDate) => {
  const end = new Date(endDate);
  const today = new Date();
  const diff = end - today;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const buildReceiptPayload = (formData) => {
  const seatNumber = Number(formData.get('seatNumber'));
  const studentName = formData.get('studentName').trim();
  const rawPhoneNumber = formData.get('phoneNumber').trim();
  const phoneNumber = '+91 ' + rawPhoneNumber.replace(/[^0-9]/g, '').replace(/(\d{5})(\d{5})/, '$1 $2');
  const gender = formData.get('gender');
  const amount = Number(formData.get('amount')) || null;
  const startDate = formData.get('startDate');
  const endDate = formData.get('endDate');
  const issuedAt = new Date().toISOString();
  const receiptId = `AL-${seatNumber}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const startDateFormatted = formatDateOnly(startDate);

  const plan = formData.get('plan');
  return {
    seatNumber,
    studentName,
    phoneNumber,
    gender,
    plan,
    amount,
    startDate,
    endDate,
    startDateFormatted,
    issuedAt,
    receiptId,
    phoneDisplay: phoneNumber,
  };
};

const assignSeat = async (payload) => {
  setStatus(`Assigning seat ${payload.seatNumber}...`, 'info');
  await SeatService.assign(payload);
  latestReceipt = payload;
  showReceipt(payload);
  await syncSeats({ silent: true });
  setStatus(`Seat ${payload.seatNumber} assigned to ${payload.studentName}.`, 'success');
  form.reset();
  focusFirstAvailableSeat();
  prefillToday();
};

const releaseSeat = async (seatNumber) => {
  const seat = seats.find((s) => s.number === seatNumber);
  if (!seat || !seat.studentName) return;
  const confirmRelease = window.confirm(`Free up seat ${seatNumber} (currently ${seat.studentName})?`);
  if (!confirmRelease) return;
  setStatus(`Releasing seat ${seatNumber}...`, 'info');
  await SeatService.release(seatNumber);
  await syncSeats({ silent: true });
  setStatus(`Seat ${seatNumber} is now available.`, 'success');
};

const buildReceiptText = (data) =>
  [
    `${LIBRARY.name} - Digital Receipt`,
    LIBRARY.tagline,
    '',
    `Receipt ID: ${data.receiptId}`, 
    `Issued: ${formatDate(data.issuedAt)}`,
    `Student Name: ${data.studentName}`,
    `Seat Number: ${data.seatNumber}`,
    `${data.plan ? `Plan: ${data.plan}\n` : ''}Duration: ${formatDateOnly(data.startDate)} to ${formatDateOnly(data.endDate)}`,
    `Amount: ${formatCurrency(data.amount)}`,
    '',
    `Regards: ${LIBRARY.owner} (${LIBRARY.phone})`,
    `Address: ${LIBRARY.address}`,
    `Map: ${LIBRARY.mapUrl}`,
    LIBRARY.hours,
    '',
  ].join('\n');

const cleanPhoneForWhatsApp = (input) => input.replace(/[^0-9]/g, '');

const ensureHtml2Canvas = () => {
  // html2canvas may be exposed as a global function or as a default export
  const hasHtml2Canvas = typeof window.html2canvas === 'function' || typeof (window.html2canvas && window.html2canvas.default) === 'function';
  if (!hasHtml2Canvas) {
    throw new Error('Receipt export library (html2canvas) failed to load. Check network or refresh the page.');
  }
};

const ensureJsPdf = () => {
  // jspdf UMD may expose jsPDF at window.jspdf.jsPDF or window.jsPDF
  const candidate = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || (window.jspdf && window.jspdf.default && window.jspdf.default.jsPDF);
  if (typeof candidate !== 'function') {
    throw new Error('PDF export library (jsPDF) failed to load. Check network or refresh the page.');
  }
  return candidate;
};

const captureReceiptCanvas = async () => {
  if (!latestReceipt) throw new Error('Assign a seat to generate the receipt first.');
  if (!receiptPrintable) throw new Error('Receipt preview block is missing.');
  ensureHtml2Canvas();
  // Preload logo image before capturing
  const logoImg = receiptPrintable.querySelector('img');
  if (logoImg) {
    await new Promise((resolve, reject) => {
      if (logoImg.complete) {
        resolve();
      } else {
        logoImg.onload = resolve;
        logoImg.onerror = () => reject(new Error('Logo image failed to load. Check the image path.'));
      }
    });
  }
  const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  // html2canvas may be available as window.html2canvas or as a default export
  const html2canvasFn = typeof window.html2canvas === 'function' ? window.html2canvas : (window.html2canvas && window.html2canvas.default);
  if (typeof html2canvasFn !== 'function') throw new Error('html2canvas is not available on the page.');
  return html2canvasFn(receiptPrintable, {
    backgroundColor: '#ffffff',
    logging: true,
    useCORS: true,
    allowTaint: true,
    scale,
  });
};

const downloadReceiptPdf = async () => {
  try {
    setStatus('Generating PDF...', 'info');

    // First try HTML2Canvas + jsPDF approach
    if (window.html2canvas && window.jspdf) {
      const element = document.getElementById('receiptPrintable');
      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true
      });

      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`${latestReceipt?.receiptId || 'receipt'}.pdf`);
      
      setStatus('PDF downloaded. Attach it in WhatsApp or print it.', 'success');
      return;
    }

    // Fallback to print if PDF generation fails
    console.warn('PDF libraries not available, falling back to print');
    setStatus('Opening print dialog...', 'info');
    window.printReceipt();
    setStatus('Print dialog opened. Please save as PDF if needed.', 'success');

  } catch (err) {
    console.error('Receipt generation failed:', err);
    setStatus('Could not generate PDF. Trying print dialog...', 'error');
    window.printReceipt();
  }
};const sendWhatsApp = async () => {
  if (!latestReceipt) return;
  const number = cleanPhoneForWhatsApp(latestReceipt.phoneNumber);
  if (!number) {
    alert('Enter a valid WhatsApp number to send the receipt.');
    return;
  }
  const message = buildReceiptText(latestReceipt);
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  setStatus('WhatsApp chat opened. Attach the downloaded PDF before sending.', 'success');
};

const handleAsyncError = (error) => {
  console.error(error);
  setStatus(error.message || 'Something went wrong. Please try again.', 'error');
};

const prefillToday = () => {
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    const today = new Date().toISOString().split('T')[0];
    startDateInput.value = today;
  }
};

const syncSeats = async ({ silent } = {}) => {
  if (!silent) {
    setStatus('Syncing seats with the server...', 'info');
  }
  const payload = await SeatService.list();
  if (!Array.isArray(payload.seats)) {
    throw new Error('Server response was invalid.');
  }
  seats = payload.seats
    .map((seat) => {
      const newSeat = {
        ...createSeat(seat.number),
        ...seat,
        number: Number(seat.number),
      };
      // Ensure gender is preserved from server data
      if (seat.gender) {
        newSeat.gender = seat.gender;
      }
      return newSeat;
    })
    .sort((a, b) => a.number - b.number);
  renderAll();
  if (!silent) {
    setStatus('Seat board updated from the shared server.', 'success');
  }
};

const init = () => {
  renderAll();
  prefillToday();
  yearEl.textContent = new Date().getFullYear();
  syncSeats().catch(handleAsyncError);
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  let payload;
  try {
    payload = buildReceiptPayload(data);
  } catch (error) {
    handleAsyncError(error);
    return;
  }
  assignSeat(payload).catch(handleAsyncError);
});

if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener('click', () => {
    downloadReceiptPdf().catch(handleAsyncError);
  });
}

if (whatsappBtn) {
  whatsappBtn.addEventListener('click', () => {
    sendWhatsApp().catch(handleAsyncError);
  });
}

if (adminList) {
  adminList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-release-seat]');
    if (!button) return;
    const seatNumber = Number(button.dataset.releaseSeat);
    releaseSeat(seatNumber).catch(handleAsyncError);
  });
}

if (refreshSeatsBtn) {
  refreshSeatsBtn.addEventListener('click', () => {
    syncSeats().catch(handleAsyncError);
  });
}

// Initialize date range functionality
document.getElementById('setOneMonth')?.addEventListener('click', setOneMonthRange);
document.getElementById('startDate')?.addEventListener('change', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (startInput && endInput && !endInput.value) {
    const start = new Date(startInput.value);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    endInput.value = end.toISOString().split('T')[0];
  }
});

document.addEventListener('DOMContentLoaded', () => {
  init();
  setOneMonthRange(); // Set initial one-month range
});
