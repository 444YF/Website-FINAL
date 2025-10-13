const express = require('express');
const { kv } = require('@vercel/kv');
const app = express();

app.use(express.raw({ type: 'application/json' }));

app.post('/api/webhook', async (req, res) => {
    try {
        const payload = JSON.parse(req.body.toString());
        
        console.log('🔔 Webhook received:', JSON.stringify(payload, null, 2));
        
        const webhookType = payload.webhook_type;
        const webhookId = payload.webhook_id;
        const timestamp = payload.timestamp;
        const body = payload.webhook_body || {};
        
        const transactionId = body.transaction_id;
        const orderId = body.order_id;
        const status = body.status;
        
        console.log('Webhook Type:', webhookType);
        console.log('Transaction ID:', transactionId);
        console.log('Order ID:', orderId);
        console.log('Status:', status);
        
        // Store status in Vercel KV with 24 hour expiry
        const statusData = {
            status: status,
            timestamp: new Date().toISOString(),
            transaction_id: transactionId,
            order_id: orderId
        };
        
        if (transactionId) {
            await kv.set(`transaction:${transactionId}`, JSON.stringify(statusData), { ex: 86400 });
            console.log('✅ Stored status for transaction:', transactionId);
        }
        
        if (orderId) {
            await kv.set(`order:${orderId}`, JSON.stringify(statusData), { ex: 86400 });
            console.log('✅ Stored status for order:', orderId);
        }
        
        // Handle different statuses
        if (webhookType === 'status_update') {
            switch(status) {
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
        }
        
        res.status(200).json({ 
            received: true,
            webhook_id: webhookId,
            webhook_type: webhookType,
            status: status,
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