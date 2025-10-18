const Redis = require('ioredis');

// Connect to Redis
const redis = new Redis(process.env.REDIS_URL);

module.exports = async (req, res) => {
    const transactionId = req.query.transaction_id;
    const orderId = req.query.order_id;
    
    console.log('📊 Status check requested:', { transactionId, orderId });
    
    try {
        let statusData = null;
        
        // Try to get by transaction ID
        if (transactionId) {
            const data = await redis.get(`transaction:${transactionId}`);
            if (data) {
                statusData = JSON.parse(data);
                console.log('✅ Found status by transaction ID:', statusData);
            }
        }
        
        // Try to get by order ID if not found
        if (!statusData && orderId) {
            const data = await redis.get(`order:${orderId}`);
            if (data) {
                statusData = JSON.parse(data);
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
        console.error('❌ Error reading from Redis:', error);
        res.status(500).json({
            found: false,
            status: 'pending',
            error: error.message
        });
    }
};