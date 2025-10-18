const crypto = require('crypto');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const ACQUIRED_APP_ID = process.env.ACQUIRED_APP_ID || '21697534';
const ACQUIRED_APP_KEY = process.env.ACQUIRED_APP_KEY || 'f9b09f5b7de24c56e372c221d7870db6';
const ACQUIRED_COMPANY_ID = process.env.ACQUIRED_COMPANY_ID || '018d7efe-a884-739b-b763-033d6e242611';
const ACQUIRED_API_URL = 'https://test-api.acquired.com';

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

async function getAcquiredToken() {
    const response = await fetch(`${ACQUIRED_API_URL}/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: ACQUIRED_APP_ID,
            app_key: ACQUIRED_APP_KEY
        })
    });
    const data = await response.json();
    return data.access_token;
}

async function createAcquiredCustomer(email, firstName, lastName) {
    try {
        const token = await getAcquiredToken();
        
        const response = await fetch(`${ACQUIRED_API_URL}/v1/customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'company_id': ACQUIRED_COMPANY_ID
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                billing: {
                    email: email
                }
            })
        });
        
        const data = await response.json();
        console.log('Acquired customer response:', data);
        
        if (data.customer_id) {
            return data.customer_id;
        } else {
            console.error('Failed to create Acquired customer:', data);
            return null;
        }
    } catch (error) {
        console.error('Error creating Acquired customer:', error);
        return null;
    }
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
        
        // Create Acquired customer
        console.log('Creating Acquired customer...');
        const customerId = await createAcquiredCustomer(email, firstName, lastName);
        
        if (!customerId) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create customer account'
            });
        }
        
        console.log('Acquired customer created:', customerId);
        
        // Create new user with customer_id
        const user = {
            id: crypto.randomUUID(),
            email,
            password: hashPassword(password),
            firstName,
            lastName,
            customer_id: customerId, // Store Acquired customer ID
            createdAt: new Date().toISOString()
        };
        
        global.users.push(user);
        
        // Also store in Redis for persistence
        await redis.setex(
            `user:${user.id}`,
            2592000, // 30 days
            JSON.stringify(user)
        );
        
        // Create session
        const token = generateToken();
        global.sessions[token] = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            customer_id: customerId
        };
        
        console.log('User registered:', email);
        console.log('Customer ID:', customerId);
        console.log('Total users:', global.users.length);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                customer_id: customerId
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};