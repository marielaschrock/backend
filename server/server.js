require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io'); // Socket.io server

const pollRoutes = require('./routes/pollRoutes');

const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development. Restrict in production.
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Make Socket.io instance available to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API Routes
app.use('/api/polls', pollRoutes);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error(err));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));