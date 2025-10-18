const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
const redis = new Redis(process.env.REDIS_URL);

const ACQUIRED_APP_ID = process.env.ACQUIRED_APP_ID || '21697534';
const ACQUIRED_APP_KEY = process.env.ACQUIRED_APP_KEY || 'f9b09f5b7de24c56e372c221d7870db6';
const ACQUIRED_COMPANY_ID = process.env.ACQUIRED_COMPANY_ID || '018d7efe-a884-739b-b763-033d6e242611';
const ACQUIRED_API_URL = 'https://test-api.acquired.com';

app.use(cors());
app.use(express.json());

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

app.post('/api/create-instalment-checkout', async (req, res) => {
    try {
        const { product, amount, instalments } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        // Get user session (you'll need to verify token here)
        const token = authHeader.replace('Bearer ', '');
        
        // Calculate instalment amount
        const instalmentAmount = Math.round((amount / instalments) * 100); // in pence
        
        console.log(`Creating instalment checkout: ${instalments} months, £${amount / instalments}/month`);
        
        const acquiredToken = await getAcquiredToken();
        const orderId = `ORDER-${product}-${instalments}mo-${Date.now()}`;
        
        // Create payment link with is_recurring = true to tokenize card
        const response = await fetch(`${ACQUIRED_API_URL}/v1/payment-links`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${acquiredToken}`,
                'Content-Type': 'application/json',
                'company_id': ACQUIRED_COMPANY_ID
            },
            body: JSON.stringify({
                transaction: {
                    currency: 'gbp',
                    moto: false,
                    capture: true,
                    order_id: orderId,
                    amount: 0 // Zero amount - we just want to tokenize the card
                },
                tds: {
                    is_active: true,
                    challenge_preference: 'challenge_preferred'
                },
                is_recurring: true, // This tells Acquired to save the card
                count_retry: 3,
                expires_in: 259200
            })
        });
        
        const data = await response.json();
        
        if (data.link_id) {
            // Store instalment plan details in Redis
            await redis.setex(`instalment:${orderId}`, 86400, JSON.stringify({
                order_id: orderId,
                product: product,
                total_amount: amount,
                instalments: instalments,
                instalment_amount: instalmentAmount,
                user_token: token,
                created_at: new Date().toISOString()
            }));
            
            const checkoutUrl = `https://test-pay.acquired.com/v1/${data.link_id}`;
            res.json({ success: true, checkoutUrl });
        } else {
            res.status(400).json({ success: false, error: data });
        }
        
    } catch (error) {
        console.error('Instalment checkout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;