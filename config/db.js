const mongoose = require('mongoose');

async function connectDB() {
  try {
    const conn = await mongoose.connect("mongodb+srv://ashuagrawalksj_db_user:EHWzKpg125rYoxmY@cluster0.qtvqk30.mongodb.net/digichamber");
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
