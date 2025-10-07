const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Simple in-memory user storage (in production, use a real database)
let users = [];

// Hash password (simple version - in production use bcrypt)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate session token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Session storage (in-memory)
let sessions = {};

// Register endpoint
app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User already exists' 
            });
        }
        
        // Create new user
        const user = {
            id: crypto.randomUUID(),
            email,
            password: hashPassword(password),
            firstName,
            lastName,
            createdAt: new Date().toISOString()
        };
        
        users.push(user);
        
        // Create session
        const token = generateToken();
        sessions[token] = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };
        
        console.log('User registered:', email);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }
        
        // Check password
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }
        
        // Create session
        const token = generateToken();
        sessions[token] = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };
        
        console.log('User logged in:', email);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token && sessions[token]) {
            delete sessions[token];
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check session endpoint
app.get('/api/auth/session', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const session = sessions[token];
        
        if (!session) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        res.json({
            success: true,
            user: session
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;