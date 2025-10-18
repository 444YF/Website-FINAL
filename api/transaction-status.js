const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || process.env.KV_URL);

module.exports = async (req, res) => {
    const transactionId = req.query.transaction_id;
    const orderId = req.query.order_id;
    
    console.log('📊 Status check:', { transactionId, orderId });
    
    try {
        let statusData = null;
        
        if (transactionId) {
            const data = await redis.get(`transaction:${transactionId}`);
            if (data) {
                statusData = JSON.parse(data);
                console.log('✅ Found by transaction:', statusData);
            }
        }
        
        if (!statusData && orderId) {
            const data = await redis.get(`order:${orderId}`);
            if (data) {
                statusData = JSON.parse(data);
                console.log('✅ Found by order:', statusData);
            }
        }
        
        if (statusData) {
            res.json({
                found: true,
                status: statusData.status,
                product: statusData.product,
                timestamp: statusData.timestamp
            });
        } else {
            console.log('❌ Not found');
            res.json({
                found: false,
                status: 'pending'
            });
        }
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
};