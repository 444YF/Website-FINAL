const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    const transactionId = req.query.transaction_id;
    const orderId = req.query.order_id;
    
    console.log('📊 Status check requested:', { transactionId, orderId });
    
    try {
        let statusData = null;
        
        if (transactionId) {
            const data = await kv.get(`transaction:${transactionId}`);
            if (data) {
                statusData = typeof data === 'string' ? JSON.parse(data) : data;
                console.log('✅ Found status by transaction ID:', statusData);
            }
        }
        
        if (!statusData && orderId) {
            const data = await kv.get(`order:${orderId}`);
            if (data) {
                statusData = typeof data === 'string' ? JSON.parse(data) : data;
                console.log('✅ Found status by order ID:', statusData);
            }
        }
        
        if (statusData) {
            res.json({
                found: true,
                status: statusData.status,
                product: statusData.product,
                timestamp: statusData.timestamp,
                transaction_id: transactionId,
                order_id: orderId
            });
        } else {
            console.log('❌ No status found, returning pending');
            res.json({
                found: false,
                status: 'pending',
                transaction_id: transactionId,
                order_id: orderId
            });
        }
    } catch (error) {
        console.error('❌ Error reading from KV:', error);
        res.status(500).json({
            found: false,
            status: 'pending',
            error: error.message
        });
    }
};