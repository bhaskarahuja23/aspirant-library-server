const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aspirant-library';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB connected successfully');
  } catch (err) {
    console.error('✗ MongoDB connection error:', err.message);
    // Don't exit - fallback to in-memory if needed
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

// Initialize seats in database
const initializeSeats = async (totalSeats = 75) => {
  try {
    const count = await Seat.countDocuments();
    if (count === 0) {
      console.log(`Initializing ${totalSeats} seats...`);
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
      console.log(`✓ Initialized ${totalSeats} seats`);
    }
  } catch (err) {
    console.error('Error initializing seats:', err.message);
  }
};

module.exports = { connectDB, Seat, initializeSeats };
