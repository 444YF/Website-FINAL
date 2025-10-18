const express = require('express');
const Redis = require('ioredis');
const app = express();

// Use the REDIS_URL from environment
const redis = new Redis(process.env.REDIS_URL || process.env.KV_URL);

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
        
        console.log('📋 Transaction:', transactionId, 'Order:', orderId, 'Product:', product, 'Status:', status);
        
        const statusData = {
            status: status,
            product: product,
            timestamp: new Date().toISOString(),
            transaction_id: transactionId,
            order_id: orderId,
            webhook_id: webhookId
        };
        
        // Store in Redis with 24 hour expiry
        if (transactionId) {
            await redis.setex(`transaction:${transactionId}`, 86400, JSON.stringify(statusData));
            console.log('✅ Stored transaction:', transactionId);
        }
        
        if (orderId) {
            await redis.setex(`order:${orderId}`, 86400, JSON.stringify(statusData));
            console.log('✅ Stored order:', orderId);
        }
        
        console.log('Status:', status);
        
        res.status(200).json({ 
            received: true,
            webhook_id: webhookId,
            status: status,
            product: product,
            stored: true
        });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = app;