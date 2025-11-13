const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

const connectDB = async () => {
  if (!MONGODB_URI) {
    console.log('⚠ MONGODB_URI not set - using in-memory storage (data will not persist)');
    return false;
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('✓ MongoDB connected successfully - data will persist');
    return true;
  } catch (err) {
    console.error('✗ MongoDB connection error:', err.message);
    console.log('⚠ Using in-memory storage (data will not persist)');
    return false;
  }
};

// Seat schema
const seatSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  studentName: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  gender: { type: String, default: null },
  plan: { type: String, default: null },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  amount: { type: Number, default: null },
  assignedAt: { type: String, default: null },
  receiptId: { type: String, default: null },
}, { timestamps: true });

const Seat = mongoose.model('Seat', seatSchema);

// In-memory fallback storage
let inMemorySeats = [];

// Initialize seats in database or memory
const initializeSeats = async (totalSeats = 75) => {
  if (!isConnected) {
    // Use in-memory storage
    if (inMemorySeats.length === 0) {
      console.log(`Initializing ${totalSeats} seats in memory...`);
      inMemorySeats = Array.from({ length: totalSeats }, (_, idx) => ({
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
      }));
      console.log(`✓ Initialized ${totalSeats} seats in memory`);
    }
    return;
  }
  
  try {
    const count = await Seat.countDocuments();
    if (count === 0) {
      console.log(`Initializing ${totalSeats} seats in database...`);
      const seats = Array.from({ length: totalSeats }, (_, idx) => ({
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
      }));
      await Seat.insertMany(seats);
      console.log(`✓ Initialized ${totalSeats} seats in database`);
    }
  } catch (err) {
    console.error('Error initializing seats:', err.message);
  }
};

// Helper functions for in-memory storage
const getInMemorySeats = () => inMemorySeats;
const setInMemorySeat = (seatNumber, data) => {
  const seat = inMemorySeats.find(s => s.number === seatNumber);
  if (seat) Object.assign(seat, data);
};

module.exports = { connectDB, Seat, initializeSeats, isConnected: () => isConnected, getInMemorySeats, setInMemorySeat };
