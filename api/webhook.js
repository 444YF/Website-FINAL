const express = require('express');
const { kv } = require('@vercel/kv');
const app = express();

app.use(express.raw({ type: 'application/json' }));

app.post('/api/webhook', async (req, res) => {
    try {
        const payload = JSON.parse(req.body.toString());
        
        console.log('🔔 WEBHOOK RECEIVED:', JSON.stringify(payload, null, 2));
        
        const webhookType = payload.webhook_type;
        const webhookId = payload.webhook_id;
        const timestamp = payload.timestamp;
        const body = payload.webhook_body || {};
        
        const transactionId = body.transaction_id;
        const orderId = body.order_id;
        const status = body.status;
        
        // Extract product from order_id (format: ORDER-{product}-{timestamp})
        let product = null;
        if (orderId && orderId.includes('-')) {
            const parts = orderId.split('-');
            if (parts.length >= 2) {
                product = parts[1]; // manutd, reading, or pbb_settled
            }
        }
        
        console.log('📋 Webhook Details:');
        console.log('  Type:', webhookType);
        console.log('  Transaction ID:', transactionId);
        console.log('  Order ID:', orderId);
        console.log('  Product:', product);
        console.log('  Status:', status);
        
        // Store status in Vercel KV with 24 hour expiry
        const statusData = {
            status: status,
            product: product,
            timestamp: new Date().toISOString(),
            transaction_id: transactionId,
            order_id: orderId,
            webhook_id: webhookId
        };
        
        if (transactionId) {
            const key = `transaction:${transactionId}`;
            console.log('💾 Storing to KV with key:', key);
            await kv.set(key, JSON.stringify(statusData), { ex: 86400 });
            console.log('✅ Stored status for transaction:', transactionId);
        }
        
        if (orderId) {
            const key = `order:${orderId}`;
            console.log('💾 Storing to KV with key:', key);
            await kv.set(key, JSON.stringify(statusData), { ex: 86400 });
            console.log('✅ Stored status for order:', orderId);
        }
        
        // Log the status
        switch(status) {
            case 'successful':
                console.log('✅ Status: SUCCESSFUL');
                break;
            case 'settled':
                console.log('💰 Status: SETTLED - Payment Complete!');
                break;
            case 'pending':
                console.log('⏳ Status: PENDING');
                break;
            case 'authorized':
                console.log('✅ Status: AUTHORIZED');
                break;
            case 'failed':
                console.log('❌ Status: FAILED');
                break;
            case 'declined':
                console.log('⛔ Status: DECLINED');
                break;
            case 'cancelled':
                console.log('🚫 Status: CANCELLED');
                break;
            case 'expired':
                console.log('⏰ Status: EXPIRED');
                break;
            default:
                console.log('ℹ️ Status:', status);
        }
        
        res.status(200).json({ 
            received: true,
            webhook_id: webhookId,
            webhook_type: webhookType,
            status: status,
            product: product,
            transaction_id: transactionId,
            order_id: orderId,
            stored: true,
            processed_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(400).json({ 
            error: error.message,
            received: false 
        });
    }
});

app.get('/api/webhook', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Webhook endpoint is ready with KV storage'
    });
});

module.exports = app;