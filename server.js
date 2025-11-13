const express = require('express');
const cors = require('cors');
const { connectDB, Seat, initializeSeats, isConnected, getInMemorySeats, setInMemorySeat } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 4000;
const TOTAL_SEATS = Number(process.env.TOTAL_SEATS) || 75;

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

app.get('/api/seats', async (req, res) => {
  try {
    if (!isConnected()) {
      // Use in-memory storage
      const seats = getInMemorySeats();
      return res.json({ seats, updatedAt: new Date().toISOString() });
    }
    
    const seats = await Seat.find().sort({ number: 1 }).lean();
    res.json({ seats, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to read seats from database.' });
  }
});

app.post('/api/seats/assign', async (req, res) => {
  try {
    validateAssignPayload(req.body || {});
    const seatNumber = Number(req.body.seatNumber);
    
    if (!isConnected()) {
      // Use in-memory storage
      const seats = getInMemorySeats();
      const seat = seats.find(s => s.number === seatNumber);
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
      
      return res.json({ seat, seats, updatedAt: new Date().toISOString() });
    }
    
    const seat = await Seat.findOne({ number: seatNumber });
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
    
    await seat.save();
    
    const seats = await Seat.find().sort({ number: 1 }).lean();
    return res.json({ seat: seat.toObject(), seats, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error.message || 'Invalid payload.' });
  }
});

app.post('/api/seats/release', async (req, res) => {
  try {
    const seatNumber = Number(req.body?.seatNumber);
    if (!seatNumber) {
      return res.status(400).json({ message: 'seatNumber is required.' });
    }
    
    if (!isConnected()) {
      // Use in-memory storage
      const seats = getInMemorySeats();
      const seat = seats.find(s => s.number === seatNumber);
      if (!seat) {
        return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
      }
      if (!seat.studentName) {
        return res.status(409).json({ message: `Seat ${seatNumber} is already available.` });
      }
      
      Object.assign(seat, {
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
      
      return res.json({ seat, seats, updatedAt: new Date().toISOString() });
    }
    
    const seat = await Seat.findOne({ number: seatNumber });
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
    
    await seat.save();
    
    const seats = await Seat.find().sort({ number: 1 }).lean();
    return res.json({ seat: seat.toObject(), seats, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Invalid payload.' });
  }
});

// Start server and connect to database
const startServer = async () => {
  await connectDB();
  await initializeSeats(TOTAL_SEATS);
  
  app.listen(PORT, () => {
    console.log(`✓ Aspirant Library seat service running on port ${PORT}`);
  });
};

startServer();
