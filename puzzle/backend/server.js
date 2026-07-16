const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend access
app.use(cors());
app.use(bodyParser.json());

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity in Docker/Dev
    methods: ["GET", "POST"]
  }
});

// --- In-Memory Data Store ---
// In a production app, use Redis or MongoDB here.
let users = {}; 

// --- Helper: Get Leaderboard ---
const getLeaderboard = () => {
  return Object.values(users)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

// --- REST API Routes ---

// Health check
app.get('/', (req, res) => {
  res.send('IQ Gym Backend is running');
});

// Get User Profile
app.get('/api/user/:id', (req, res) => {
  const { id } = req.params;
  if (users[id]) {
    res.json(users[id]);
  } else {
    // Return default new user structure if not found
    res.json({
      id,
      name: `Mind_${id.slice(0, 5)}`,
      score: 0,
      currentLevel: 1
    });
  }
});

// Update User Score/Level
app.post('/api/score', (req, res) => {
  const { id, score, currentLevel, name } = req.body;
  
  if (!id) return res.status(400).send('Missing User ID');

  // Update or Create User
  users[id] = {
    id,
    name: name || users[id]?.name || `Mind_${id.slice(0, 5)}`,
    score: parseInt(score),
    currentLevel: parseInt(currentLevel),
    lastActive: new Date()
  };

  // Broadcast new leaderboard to ALL connected clients
  io.emit('leaderboardUpdate', getLeaderboard());

  res.json({ success: true, user: users[id] });
});

// --- Real-time Socket Events ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send immediate leaderboard upon connection
  socket.emit('leaderboardUpdate', getLeaderboard());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});