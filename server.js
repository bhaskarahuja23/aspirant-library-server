const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 4000;
const TOTAL_SEATS = Number(process.env.TOTAL_SEATS) || 75;
const SEATS_FILE = path.join(__dirname, 'data', 'seats.json');

// Helper functions for file-based storage
const readSeatsFile = () => {
  if (!fs.existsSync(SEATS_FILE)) {
    const initialData = {
      seats: Array.from({ length: TOTAL_SEATS }, (_, idx) => ({
        number: idx + 1,
        studentName: null,
        phoneNumber: null,
        gender: null,
        plan: null,
        startDate: null,
        endDate: null,
        amount: null,
        assignedAt: null,
        receiptId: null,
      })),
    };
    fs.writeFileSync(SEATS_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  const raw = fs.readFileSync(SEATS_FILE, 'utf-8');
  return JSON.parse(raw);
};

const writeSeatsFile = (data) => {
  fs.writeFileSync(SEATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
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
    const data = readSeatsFile();
    res.json({ seats: data.seats, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to read seats from file.' });
  }
});

app.post('/api/seats/assign', (req, res) => {
  try {
    validateAssignPayload(req.body || {});
    const seatNumber = Number(req.body.seatNumber);
    
    const data = readSeatsFile();
    const seat = data.seats.find((s) => s.number === seatNumber);
    
    if (!seat) {
      return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
    }
    if (seat.studentName) {
      return res.status(409).json({ message: `Seat ${seatNumber} is already assigned to ${seat.studentName}.` });
    }

    seat.studentName = req.body.studentName;
    seat.phoneNumber = req.body.phoneNumber;
    seat.gender = req.body.gender;
    seat.plan = req.body.plan;
    seat.startDate = req.body.startDate;
    seat.endDate = req.body.endDate;
    seat.amount = req.body.amount ?? null;
    seat.assignedAt = req.body.issuedAt;
    seat.receiptId = req.body.receiptId;
    
    writeSeatsFile(data);
    
    return res.json({ seat, seats: data.seats, updatedAt: new Date().toISOString() });
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
    
    const data = readSeatsFile();
    const seat = data.seats.find((s) => s.number === seatNumber);
    
    if (!seat) {
      return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
    }
    if (!seat.studentName) {
      return res.status(409).json({ message: `Seat ${seatNumber} is already available.` });
    }

    seat.studentName = null;
    seat.phoneNumber = null;
    seat.gender = null;
    seat.plan = null;
    seat.startDate = null;
    seat.endDate = null;
    seat.amount = null;
    seat.assignedAt = null;
    seat.receiptId = null;
    
    writeSeatsFile(data);
    
    return res.json({ seat, seats: data.seats, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Invalid payload.' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Aspirant Library seat service running on port ${PORT}`);
  console.log(`✓ Using file-based storage: ${SEATS_FILE}`);
});
