const express = require('express');
const app = express();
const transactionStatusModule = require('./transaction-status.js');

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
        
        // Store the status so the return page can check it
        if (transactionStatusModule.updateStatus) {
            transactionStatusModule.updateStatus(transactionId, orderId, status);
        }
        
        // Handle different statuses
        if (webhookType === 'status_update') {
            switch(status) {
                case 'pending':
                    console.log('⏳ Status: PENDING');
                    break;
                case 'authorized':
                    console.log('✅ Status: AUTHORIZED');
                    break;
                case 'settled':
                    console.log('💰 Status: SETTLED - Payment Complete!');
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
                case 'refunded':
                    console.log('💸 Status: REFUNDED');
                    break;
                case 'partially_refunded':
                    console.log('💸 Status: PARTIALLY REFUNDED');
                    break;
                case 'voided':
                    console.log('🚫 Status: VOIDED');
                    break;
                case 'captured':
                    console.log('💰 Status: CAPTURED');
                    break;
                case 'chargeback':
                    console.log('⚠️ Status: CHARGEBACK');
                    break;
                case 'error':
                    console.log('⚠️ Status: ERROR');
                    break;
                default:
                    console.log('ℹ️ Unknown status:', status);
            }
        }
        
        res.status(200).json({ 
            received: true,
            webhook_id: webhookId,
            webhook_type: webhookType,
            status: status,
            transaction_id: transactionId,
            order_id: orderId,
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
        message: 'Webhook endpoint is ready'
    });
});

module.exports = app;