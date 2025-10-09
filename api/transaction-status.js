// In-memory storage for transaction statuses (in production, use a database)
let transactionStatuses = {};

// Export both the handler and a way to update statuses
module.exports = (req, res) => {
    const transactionId = req.query.transaction_id;
    const orderId = req.query.order_id;
    
    console.log('Status check requested:', { transactionId, orderId });
    
    const status = transactionStatuses[transactionId] || transactionStatuses[orderId];
    
    if (status) {
        res.json({
            found: true,
            status: status.status,
            timestamp: status.timestamp,
            transaction_id: transactionId,
            order_id: orderId
        });
    } else {
        res.json({
            found: false,
            status: 'pending',
            transaction_id: transactionId,
            order_id: orderId
        });
    }
};

// Function to update status (called from webhook)
module.exports.updateStatus = (transactionId, orderId, status) => {
    const statusData = {
        status: status,
        timestamp: new Date().toISOString()
    };
    
    if (transactionId) {
        transactionStatuses[transactionId] = statusData;
    }
    if (orderId) {
        transactionStatuses[orderId] = statusData;
    }
    
    console.log('Status updated:', { transactionId, orderId, status });
};