import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log("DB Connected");
    });

    mongoose.connection.on('error', (err) => {
      console.log("DB Connection Error:", err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log("DB Disconnected");
    });

    await mongoose.connect(`${process.env.MONGODB_URI}/attendace-system`);
  } catch (error) {
      console.error("Failed to connect to MongoDB:", error.message);
      process.exit(1);
  }
}

export default connectDB