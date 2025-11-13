const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname)));

// ... your routes: app.get('/api/seats', ...), etc.


const PORT = process.env.PORT || 4000;
const TOTAL_SEATS = Number(process.env.TOTAL_SEATS) || 75;

// Use /opt/render/project/data for Render persistent disk, fallback to local ./data
const DATA_DIR = process.env.PERSISTENT_STORAGE_DIR 
  ? path.join(process.env.PERSISTENT_STORAGE_DIR, 'data')
  : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'seats.json');

console.log(`Using data directory: ${DATA_DIR}`);

const createSeat = (number) => ({
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
});

const ensureStore = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seats = Array.from({ length: TOTAL_SEATS }, (_, idx) => createSeat(idx + 1));
    const payload = { seats, updatedAt: new Date().toISOString() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  }
};

const readStore = () => {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
};

const writeStore = (data) => {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  return payload;
};

const validateAssignPayload = (body) => {
  const required = ['seatNumber', 'studentName', 'phoneNumber', 'plan', 'startDate', 'endDate', 'gender', 'issuedAt', 'receiptId'];
  const missing = required.filter((key) => !body[key]);
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', updatedAt: new Date().toISOString() });
});

app.get('/api/seats', (req, res) => {
  try {
    const store = readStore();
    res.json(store);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to read seats store.' });
  }
});

app.post('/api/seats/assign', (req, res) => {
  try {
    validateAssignPayload(req.body || {});
    const store = readStore();
    const seatNumber = Number(req.body.seatNumber);
    const seat = store.seats.find((item) => item.number === seatNumber);
    if (!seat) {
      return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
    }
    if (seat.studentName) {
      return res.status(409).json({ message: `Seat ${seatNumber} is already assigned to ${seat.studentName}.` });
    }

    Object.assign(seat, {
      studentName: req.body.studentName,
      phoneNumber: req.body.phoneNumber,
      gender: req.body.gender,
      plan: req.body.plan,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      amount: req.body.amount ?? null,
      assignedAt: req.body.issuedAt,
      receiptId: req.body.receiptId,
    });

    const payload = writeStore(store);
    return res.json({ seat, seats: payload.seats, updatedAt: payload.updatedAt });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error.message || 'Invalid payload.' });
  }
});

app.post('/api/seats/release', (req, res) => {
  try {
    const seatNumber = Number(req.body?.seatNumber);
    if (!seatNumber) {
      return res.status(400).json({ message: 'seatNumber is required.' });
    }
    const store = readStore();
    const seat = store.seats.find((item) => item.number === seatNumber);
    if (!seat) {
      return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
    }
    if (!seat.studentName) {
      return res.status(409).json({ message: `Seat ${seatNumber} is already available.` });
    }

    const resetSeat = createSeat(seat.number);
    Object.assign(seat, resetSeat);
    const payload = writeStore(store);
    return res.json({ seat, seats: payload.seats, updatedAt: payload.updatedAt });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Invalid payload.' });
  }
});

app.listen(PORT, () => {
  ensureStore();
  console.log(`Aspirant Library seat service running on port ${PORT}`);
});
