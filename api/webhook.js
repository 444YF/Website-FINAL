const express = require('express');
const Redis = require('ioredis');
const app = express();

const redis = new Redis(process.env.REDIS_URL);

const ACQUIRED_APP_ID = process.env.ACQUIRED_APP_ID || '21697534';
const ACQUIRED_APP_KEY = process.env.ACQUIRED_APP_KEY || 'f9b09f5b7de24c56e372c221d7870db6';
const ACQUIRED_COMPANY_ID = process.env.ACQUIRED_COMPANY_ID || '018d7efe-a884-739b-b763-033d6e242611';
const ACQUIRED_API_URL = 'https://test-api.acquired.com';

app.use(express.raw({ type: 'application/json' }));

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

// Function to schedule recurring payments
async function scheduleRecurringPayments(orderId, cardId) {
    try {
        // Get instalment plan details from Redis
        const planData = await redis.get(`instalment:${orderId}`);
        
        if (!planData) {
            console.error('❌ No instalment plan found for order:', orderId);
            return;
        }
        
        const plan = JSON.parse(planData);
        console.log('📋 Instalment plan:', plan);
        
        // Store the card_id with the plan
        plan.card_id = cardId;
        await redis.setex(`instalment:${orderId}`, 2592000, JSON.stringify(plan)); // 30 days
        
        console.log('✅ Card tokenized for instalment plan');
        console.log('  Order ID:', orderId);
        console.log('  Card ID:', cardId);
        console.log('  Instalments:', plan.instalments);
        console.log('  Amount per month: £' + (plan.instalment_amount / 100));
        
        // Calculate payment schedule (1st of each month)
        const paymentSchedule = [];
        const now = new Date();
        
        for (let i = 0; i < plan.instalments; i++) {
            const paymentDate = new Date(now);
            paymentDate.setMonth(paymentDate.getMonth() + i + 1);
            paymentDate.setDate(1); // 1st of the month
            paymentDate.setHours(9, 0, 0, 0); // 9 AM
            
            paymentSchedule.push({
                instalment_number: i + 1,
                scheduled_date: paymentDate.toISOString(),
                amount: plan.instalment_amount,
                status: 'scheduled'
            });
        }
        
        // Store the payment schedule
        await redis.setex(
            `schedule:${orderId}`,
            2592000,
            JSON.stringify({
                order_id: orderId,
                card_id: cardId,
                total_instalments: plan.instalments,
                payments: paymentSchedule,
                created_at: new Date().toISOString()
            })
        );
        
        console.log('✅ Payment schedule created:');
        paymentSchedule.forEach(payment => {
            console.log(`  Instalment ${payment.instalment_number}: ${new Date(payment.scheduled_date).toLocaleDateString()} - £${payment.amount / 100}`);
        });
        
    } catch (error) {
        console.error('❌ Error scheduling recurring payments:', error);
    }
}

app.post('/api/webhook', async (req, res) => {
    try {
        const payload = JSON.parse(req.body.toString());
        
        console.log('🔔 WEBHOOK RECEIVED:', JSON.stringify(payload, null, 2));
        
        const webhookType = payload.webhook_type;
        const webhookId = payload.webhook_id;
        const body = payload.webhook_body || {};
        
        const transactionId = body.transaction_id;
        const orderId = body.order_id;
        const status = body.status;
        const cardId = body.card_id; // This is the tokenized card ID
        
        // Extract product from order_id
        let product = null;
        if (orderId && orderId.includes('-')) {
            const parts = orderId.split('-');
            if (parts.length >= 2) {
                product = parts[1];
            }
        }
        
        console.log('📋 Details:');
        console.log('  Transaction:', transactionId);
        console.log('  Order:', orderId);
        console.log('  Product:', product);
        console.log('  Status:', status);
        console.log('  Card ID:', cardId);
        
        const statusData = {
            status: status,
            product: product,
            card_id: cardId,
            timestamp: new Date().toISOString(),
            transaction_id: transactionId,
            order_id: orderId,
            webhook_id: webhookId
        };
        
        // Store in Redis
        if (transactionId) {
            await redis.setex(`transaction:${transactionId}`, 86400, JSON.stringify(statusData));
            console.log('✅ Stored transaction:', transactionId);
        }
        
        if (orderId) {
            await redis.setex(`order:${orderId}`, 86400, JSON.stringify(statusData));
            console.log('✅ Stored order:', orderId);
        }
        
        // If this is a card tokenization (instalment order) and we have a card_id
        if (cardId && orderId && orderId.includes('mo-')) {
            console.log('💳 Card tokenization detected for instalment plan');
            await scheduleRecurringPayments(orderId, cardId);
        }
        
        // Log status
        if (status === 'success' || status === 'successful') {
            console.log('✅ Status: SUCCESS');
        } else if (status === 'settled') {
            console.log('💰 Status: SETTLED');
        } else {
            console.log('ℹ️ Status:', status);
        }
        
        res.status(200).json({ 
            received: true,
            webhook_id: webhookId,
            status: status,
            product: product,
            card_id: cardId,
            stored: true
        });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(400).json({ error: error.message, received: false });
    }
});

app.get('/api/webhook', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Webhook endpoint ready'
    });
});

module.exports = app;