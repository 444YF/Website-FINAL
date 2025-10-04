const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;
// Acquired API credentials
const ACQUIRED_APP_ID = '21697534';
const ACQUIRED_APP_KEY = 'f9b09f5b7de24c56e372c221d7870db6';
const ACQUIRED_COMPANY_ID = '018d7efe-a884-739b-b763-033d6e242611';
const ACQUIRED_API_URL = 'https://test-api.acquired.com'; // Base URL

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve your HTML files

// Function to get Bearer token
async function getAcquiredToken() {
    const response = await fetch(`${ACQUIRED_API_URL}/v1/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            app_id: ACQUIRED_APP_ID,
            app_key: ACQUIRED_APP_KEY
        })
    });
    
    const data = await response.json();
    return data.access_token;
}

// Create payment link endpoint
app.post('/api/create-checkout', async (req, res) => {
    try {
        const { product, amount } = req.body;
        
        // Get Bearer token
        const token = await getAcquiredToken();
        
        // Create payment link
        const response = await fetch(`${ACQUIRED_API_URL}/v1/payment-links`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'company_id': ACQUIRED_COMPANY_ID
            },
            body: JSON.stringify({
                transaction: {
                    currency: 'gbp',
                    moto: false,
                    capture: true,
                    order_id: `ORDER-${Date.now()}`,
                    amount: 100
                },
                tds: {
                    is_active: true,
                    challenge_preference: 'challenge_preferred'
                },
                is_recurring: false,
                count_retry: 3,
                expires_in: 259200
            })
        });
        
        const data = await response.json();
        
        if (data.link_id) {
            const checkoutUrl = `https://test-pay.acquired.com/v1/${data.link_id}`;
            res.json({ success: true, checkoutUrl });
        } else {
            res.status(400).json({ success: false, error: data });
        }
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});