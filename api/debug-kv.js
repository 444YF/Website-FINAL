const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    const transactionId = req.query.transaction_id;
    const orderId = req.query.order_id;
    
    try {
        const results = {};
        
        if (transactionId) {
            results.transaction = await kv.get(`transaction:${transactionId}`);
        }
        
        if (orderId) {
            results.order = await kv.get(`order:${orderId}`);
        }
        
        res.json({
            transaction_id: transactionId,
            order_id: orderId,
            results: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};