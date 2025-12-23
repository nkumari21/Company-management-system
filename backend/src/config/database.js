// backend/src/config/database.js

const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGODB_URI) => {
    try {
        // Check if already connected to avoid duplicate connections
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }

        const conn = await mongoose.connect(uri);

        // Only log in non-test environment
        if (process.env.NODE_ENV !== 'test') {
            console.log(`MongoDB Connected: ${conn.connection.host}`);
        }

        return conn;
    } catch (error) {
        // Only log in non-test environment
        if (process.env.NODE_ENV !== 'test') {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
        // In test environment, throw error instead of exiting
        throw error;
    }
};

module.exports = connectDB;