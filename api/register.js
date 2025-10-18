const crypto = require('crypto');

// In-memory user storage
let users = global.users || [];
global.users = users;

// In-memory session storage
let sessions = global.sessions || {};
global.sessions = sessions;

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, firstName, lastName } = req.body;
        
        console.log('Registration attempt:', email);
        
        // Check if user already exists
        const existingUser = global.users.find(u => u.email === email);
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
        
        global.users.push(user);
        
        // Create session
        const token = generateToken();
        global.sessions[token] = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };
        
        console.log('User registered:', email);
        console.log('Total users:', global.users.length);
        
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
};