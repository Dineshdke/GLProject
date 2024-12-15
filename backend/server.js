const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;
const SECRET_KEY = "your_jwt_secret_key";

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Atlas Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { retryWrites: true, w: 'majority' })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Models
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
}));

const Project = mongoose.model('Project', new mongoose.Schema({
    title: String,
    description: String,
    creationDate: { type: Date, default: Date.now },
    owner: String
}));

const Task = mongoose.model('Task', new mongoose.Schema({
    title: String,
    description: String,
    status: { type: String, enum: ['To-Do', 'In Progress', 'Completed'] },
    deadline: Date,
    assignedUser: String,
    projectId: mongoose.Schema.Types.ObjectId
}));

// Routes
// User Registration
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: 'User registration failed', details: err });
    }
});

// User Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// Protected Route Middleware
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
        req.userId = decoded.id;
        next();
    });
};

// CRUD Routes for Projects
app.post('/projects', authenticate, async (req, res) => {
    const { title, description } = req.body;
    const project = new Project({ title, description, owner: req.userId });
    await project.save();
    res.status(201).json(project);
});

app.get('/projects', authenticate, async (req, res) => {
    const projects = await Project.find({ owner: req.userId });
    res.json(projects);
});

app.put('/projects/:id', authenticate, async (req, res) => {
    const { title, description } = req.body;
    const project = await Project.findByIdAndUpdate(req.params.id, { title, description }, { new: true });
    res.json(project);
});

app.delete('/projects/:id', authenticate, async (req, res) => {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
});

// CRUD Routes for Tasks
app.post('/tasks', authenticate, async (req, res) => {
    const { title, description, status, deadline, assignedUser, projectId } = req.body;
    const task = new Task({ title, description, status, deadline, assignedUser, projectId });
    await task.save();
    res.status(201).json(task);
});

app.get('/tasks', authenticate, async (req, res) => {
    const tasks = await Task.find({ projectId: req.query.projectId });
    res.json(tasks);
});

// Start the Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
