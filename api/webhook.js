const express = require('express');
const Redis = require('ioredis');
const app = express();

// Connect to Redis using the REDIS_URL environment variable
const redis = new Redis(process.env.REDIS_URL);

app.use(express.raw({ type: 'application/json' }));

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
        
        const statusData = {
            status: status,
            product: product,
            timestamp: new Date().toISOString(),
            transaction_id: transactionId,
            order_id: orderId,
            webhook_id: webhookId
        };
        
        // Store in Redis with 24 hour expiry (86400 seconds)
        if (transactionId) {
            await redis.setex(`transaction:${transactionId}`, 86400, JSON.stringify(statusData));
            console.log('✅ Stored transaction:', transactionId);
        }
        
        if (orderId) {
            await redis.setex(`order:${orderId}`, 86400, JSON.stringify(statusData));
            console.log('✅ Stored order:', orderId);
        }
        
        // Log status
        if (status === 'success') {
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