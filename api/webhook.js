const express = require('express');
const app = express();

// Use raw body for webhook signature verification
app.use(express.raw({ type: 'application/json' }));

app.post('/api/webhook', async (req, res) => {
    try {
        // Parse the webhook payload
        const payload = JSON.parse(req.body.toString());
        
        console.log('🔔 Webhook received:', JSON.stringify(payload, null, 2));
        
        // Handle different event types
        const eventType = payload.type;
        
        switch(eventType) {
            case 'transaction.successful':
                console.log('✅ Payment successful!');
                console.log('Transaction ID:', payload.data?.transaction_id);
                console.log('Amount:', payload.data?.amount);
                console.log('Currency:', payload.data?.currency);
                // TODO: Add your logic here (update database, send email, etc.)
                break;
                
            case 'transaction.failed':
                console.log('❌ Payment failed');
                console.log('Transaction ID:', payload.data?.transaction_id);
                console.log('Reason:', payload.data?.response_message);
                // TODO: Add your logic here
                break;
                
            case 'transaction.declined':
                console.log('⛔ Payment declined');
                console.log('Transaction ID:', payload.data?.transaction_id);
                // TODO: Add your logic here
                break;
                
            default:
                console.log('ℹ️ Received event type:', eventType);
                console.log('Data:', payload.data);
        }
        
        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ 
            received: true,
            event_type: eventType,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = app;