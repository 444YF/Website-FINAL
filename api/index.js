const express = require('express');
const cors = require('cors');

const app = express();

// Acquired API credentials
const ACQUIRED_APP_ID = process.env.ACQUIRED_APP_ID || '21697534';
const ACQUIRED_APP_KEY = process.env.ACQUIRED_APP_KEY || 'f9b09f5b7de24c56e372c221d7870db6';
const ACQUIRED_COMPANY_ID = process.env.ACQUIRED_COMPANY_ID || '018d7efe-a884-739b-b763-033d6e242611';
const ACQUIRED_API_URL = 'https://test-api.acquired.com';

app.use(cors());
app.use(express.json());

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

// Function to create customer
async function createCustomer(token, customerData) {
    try {
        const response = await fetch(`${ACQUIRED_API_URL}/v1/customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'company_id': ACQUIRED_COMPANY_ID
            },
            body: JSON.stringify(customerData)
        });
        
        const data = await response.json();
        console.log('Customer API Response:', data);
        
        if (data.customer_id) {
            return data.customer_id;
        } else {
            console.error('No customer_id in response:', data);
            throw new Error('Failed to create customer: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
}

// Create payment link endpoint
app.post('/api/create-checkout', async (req, res) => {
    try {
        const { product, amount, customer } = req.body;
        
        console.log('Received checkout request:', { product, amount, customer });
        
        // Get Bearer token
        const token = await getAcquiredToken();
        
        // Create customer first
        let customerId = null;
        if (customer) {
            customerId = await createCustomer(token, customer);
            console.log('Created Customer ID:', customerId);
        }
        
        // Create payment link with customer_id
        const paymentLinkBody = {
            transaction: {
                currency: 'gbp',
                moto: false,
                capture: true,
                order_id: `ORDER-${Date.now()}`,
                amount: amount
            },
            tds: {
                is_active: true,
                challenge_preference: 'challenge_preferred'
            },
            is_recurring: false,
            count_retry: 3,
            expires_in: 259200
        };

        // Add customer_id if we have one
        if (customerId) {
            paymentLinkBody.customer_id = customerId;
        }

        console.log('Creating payment link with:', paymentLinkBody);

        const response = await fetch(`${ACQUIRED_API_URL}/v1/payment-links`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'company_id': ACQUIRED_COMPANY_ID
            },
            body: JSON.stringify(paymentLinkBody)
        });
        
        const data = await response.json();
        console.log('Payment link response:', data);
        
        if (data.link_id) {
            const checkoutUrl = `https://test-pay.acquired.com/v1/${data.link_id}`;
            res.json({ 
                success: true, 
                checkoutUrl,
                customer_id: customerId 
            });
        } else {
            res.status(400).json({ success: false, error: data });
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;