const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected via Mongoose");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
};

module.exports = connectDB;
