const express = require('express');
const app = express();

// Use raw body for webhook signature verification
app.use(express.raw({ type: 'application/json' }));

app.post('/api/webhook', async (req, res) => {
    try {
        // Parse the webhook payload
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
        
        // Handle different statuses
        if (webhookType === 'status_update') {
            switch(status) {
                case 'pending':
                    console.log('⏳ Status: PENDING');
                    console.log('Payment is being processed');
                    // TODO: Update order status to pending
                    break;

                case 'authorized':
                    console.log('✅ Status: AUTHORIZED');
                    console.log('Payment has been authorized');
                    // TODO: Mark order as authorized, prepare for capture
                    break;

                case 'settled':
                    console.log('💰 Status: SETTLED');
                    console.log('Payment successfully completed!');
                    // TODO: Fulfill order, send confirmation email, update inventory
                    break;

                case 'failed':
                    console.log('❌ Status: FAILED');
                    console.log('Payment failed');
                    // TODO: Cancel order, notify customer
                    break;

                case 'declined':
                    console.log('⛔ Status: DECLINED');
                    console.log('Payment was declined');
                    // TODO: Cancel order, notify customer to try another payment method
                    break;

                case 'cancelled':
                    console.log('🚫 Status: CANCELLED');
                    console.log('Payment was cancelled');
                    // TODO: Cancel order, update order status
                    break;

                case 'expired':
                    console.log('⏰ Status: EXPIRED');
                    console.log('Payment authorization expired');
                    // TODO: Cancel order, notify customer
                    break;

                case 'refunded':
                    console.log('💸 Status: REFUNDED');
                    console.log('Payment has been refunded');
                    // TODO: Update order status, notify customer
                    break;

                case 'partially_refunded':
                    console.log('💸 Status: PARTIALLY REFUNDED');
                    console.log('Payment has been partially refunded');
                    // TODO: Update order with partial refund amount
                    break;

                case 'voided':
                    console.log('🚫 Status: VOIDED');
                    console.log('Payment authorization was voided');
                    // TODO: Cancel order
                    break;

                case 'captured':
                    console.log('💰 Status: CAPTURED');
                    console.log('Payment has been captured');
                    // TODO: Fulfill order
                    break;

                case 'chargeback':
                    console.log('⚠️ Status: CHARGEBACK');
                    console.log('A chargeback has been initiated');
                    // TODO: Alert finance team, gather evidence
                    break;

                case 'error':
                    console.log('⚠️ Status: ERROR');
                    console.log('An error occurred processing the payment');
                    // TODO: Log error, notify support team
                    break;

                default:
                    console.log('ℹ️ Unknown status:', status);
                    console.log('Full body:', body);
            }
        } else {
            console.log('ℹ️ Unknown webhook type:', webhookType);
        }
        
        // Always respond with 200 to acknowledge receipt
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

// Health check endpoint
app.get('/api/webhook', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Webhook endpoint is ready',
        endpoint: '/api/webhook',
        supported_statuses: [
            'pending',
            'authorized', 
            'settled',
            'failed',
            'declined',
            'cancelled',
            'expired',
            'refunded',
            'partially_refunded',
            'voided',
            'captured',
            'chargeback',
            'error'
        ]
    });
});

module.exports = app;