const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();

// Enable CORS for all origins (including file://)
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 4000;
const TOTAL_SEATS = Number(process.env.TOTAL_SEATS) || 75;
const MONGODB_URI = process.env.MONGODB_URI;

// Seat Schema & Model
const seatSchema = new mongoose.Schema({
  seatNumber: { type: Number, required: true, unique: true },
  assigned: { type: Boolean, default: false },
  name: { type: String, default: null },
  phone: { type: String, default: null },
  plan: { type: String, default: null },
  fee: { type: Number, default: null },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  receiptId: { type: String, default: null },
  gender: { type: String, default: null },
}, { timestamps: true });

// Ensure unique index on seatNumber
seatSchema.index({ seatNumber: 1 }, { unique: true });

const Seat = mongoose.model('Seat', seatSchema);

// Connect to MongoDB
let dbConnected = false;

const connectDB = async () => {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set - database features disabled');
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    dbConnected = true;
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    dbConnected = false;
    return false;
  }
};

// Seed/migrate seats
const ensureSeats = async () => {
  if (!dbConnected) {
    console.log('⚠ Skipping seat initialization - database not connected');
    return;
  }

  try {
    const count = await Seat.countDocuments();
    
    if (count > 0) {
      console.log(`✅ Found ${count} existing seats in database`);
      return;
    }

    console.log('🔄 Database empty - checking for migration from seats.json...');
    
    // Try to migrate from existing seats.json
    const jsonPath = path.join(__dirname, 'data', 'seats.json');
    let seatsToInsert = [];
    
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const existingSeats = jsonData.seats || [];
        
        console.log(`📦 Migrating ${existingSeats.length} seats from seats.json...`);
        
        seatsToInsert = existingSeats.map(seat => ({
          seatNumber: seat.number,
          assigned: !!seat.studentName,
          name: seat.studentName || null,
          phone: seat.phoneNumber || null,
          plan: seat.plan || null,
          fee: seat.amount || null,
          startDate: seat.startDate || null,
          endDate: seat.endDate || null,
          receiptId: seat.receiptId || null,
          gender: seat.gender || null,
        }));
      } catch (err) {
        console.error('⚠ Failed to read seats.json:', err.message);
      }
    }
    
    // If no migration data or incomplete, create all seats 1..TOTAL_SEATS
    if (seatsToInsert.length === 0) {
      console.log(`🆕 Creating ${TOTAL_SEATS} new seats...`);
      seatsToInsert = Array.from({ length: TOTAL_SEATS }, (_, i) => ({
        seatNumber: i + 1,
        assigned: false,
        name: null,
        phone: null,
        plan: null,
        fee: null,
        startDate: null,
        endDate: null,
        receiptId: null,
        gender: null,
      }));
    } else {
      // Ensure we have all seats up to TOTAL_SEATS
      const existingNumbers = new Set(seatsToInsert.map(s => s.seatNumber));
      for (let i = 1; i <= TOTAL_SEATS; i++) {
        if (!existingNumbers.has(i)) {
          seatsToInsert.push({
            seatNumber: i,
            assigned: false,
            name: null,
            phone: null,
            plan: null,
            fee: null,
            startDate: null,
            endDate: null,
            receiptId: null,
            gender: null,
          });
        }
      }
    }
    
    await Seat.insertMany(seatsToInsert, { ordered: false });
    console.log(`✅ Initialized ${seatsToInsert.length} seats in database`);
    
  } catch (err) {
    console.error('❌ Error initializing seats:', err.message);
  }
};

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    db: dbConnected ? 'connected' : 'disconnected'
  });
});

// Get all seats
app.get('/api/seats', async (req, res) => {
  if (!dbConnected) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const seats = await Seat.find().sort({ seatNumber: 1 }).lean();
    
    // Transform to frontend format
    const formatted = seats.map(seat => ({
      number: seat.seatNumber,
      studentName: seat.name,
      phoneNumber: seat.phone,
      gender: seat.gender,
      plan: seat.plan,
      startDate: seat.startDate,
      endDate: seat.endDate,
      amount: seat.fee,
      assignedAt: seat.updatedAt?.toISOString() || null,
      receiptId: seat.receiptId,
    }));
    
    res.json({ seats: formatted, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Error fetching seats:', err);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

// Assign seat (supports both old and new endpoints)
app.post('/api/seats/assign', async (req, res) => {
  if (!dbConnected) {
    return res.status(500).json({ message: 'Database not connected' });
  }

  try {
    const seatNumber = Number(req.body.seatNumber);
    const name = req.body.studentName;
    const phone = req.body.phoneNumber;
    const plan = req.body.plan;
    const fee = req.body.amount;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const receiptId = req.body.receiptId;
    const gender = req.body.gender;
    
    if (!seatNumber || !name) {
      return res.status(400).json({ message: 'seatNumber and studentName are required' });
    }

    const seat = await Seat.findOne({ seatNumber });
    
    if (!seat) {
      return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
    }
    
    if (seat.assigned) {
      return res.status(409).json({ message: `Seat ${seatNumber} is already assigned to ${seat.name}.` });
    }

    seat.assigned = true;
    seat.name = name;
    seat.phone = phone || null;
    seat.plan = plan || null;
    seat.fee = fee || null;
    seat.startDate = startDate || null;
    seat.endDate = endDate || null;
    seat.receiptId = receiptId || null;
    seat.gender = gender || null;
    
    await seat.save();
    
    const allSeats = await Seat.find().sort({ seatNumber: 1 }).lean();
    const formatted = allSeats.map(s => ({
      number: s.seatNumber,
      studentName: s.name,
      phoneNumber: s.phone,
      gender: s.gender,
      plan: s.plan,
      startDate: s.startDate,
      endDate: s.endDate,
      amount: s.fee,
      assignedAt: s.updatedAt?.toISOString() || null,
      receiptId: s.receiptId,
    }));
    
    res.json({
      seat: {
        number: seat.seatNumber,
        studentName: seat.name,
        phoneNumber: seat.phone,
        gender: seat.gender,
        plan: seat.plan,
        startDate: seat.startDate,
        endDate: seat.endDate,
        amount: seat.fee,
        receiptId: seat.receiptId,
      },
      seats: formatted,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error assigning seat:', err);
    res.status(500).json({ message: 'Failed to assign seat' });
  }
});

// Release seat
app.post('/api/seats/release', async (req, res) => {
  if (!dbConnected) {
    return res.status(500).json({ message: 'Database not connected' });
  }

  try {
    const seatNumber = Number(req.body.seatNumber);
    
    if (!seatNumber) {
      return res.status(400).json({ message: 'seatNumber is required.' });
    }

    const seat = await Seat.findOne({ seatNumber });
    
    if (!seat) {
      return res.status(404).json({ message: `Seat ${seatNumber} not found.` });
    }

    seat.assigned = false;
    seat.name = null;
    seat.phone = null;
    seat.plan = null;
    seat.fee = null;
    seat.startDate = null;
    seat.endDate = null;
    seat.receiptId = null;
    seat.gender = null;
    
    await seat.save();
    
    const allSeats = await Seat.find().sort({ seatNumber: 1 }).lean();
    const formatted = allSeats.map(s => ({
      number: s.seatNumber,
      studentName: s.name,
      phoneNumber: s.phone,
      gender: s.gender,
      plan: s.plan,
      startDate: s.startDate,
      endDate: s.endDate,
      amount: s.fee,
      assignedAt: s.updatedAt?.toISOString() || null,
      receiptId: s.receiptId,
    }));
    
    res.json({
      seat: {
        number: seat.seatNumber,
        studentName: null,
        phoneNumber: null,
        gender: null,
        plan: null,
        startDate: null,
        endDate: null,
        amount: null,
        receiptId: null,
      },
      seats: formatted,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error releasing seat:', err);
    res.status(500).json({ message: 'Failed to release seat' });
  }
});

// Start server
const startServer = async () => {
  await connectDB();
  await ensureSeats();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Database: ${dbConnected ? 'Connected to MongoDB' : 'Not connected (check MONGODB_URI)'}`);
  });
};

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
