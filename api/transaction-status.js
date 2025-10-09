module.exports = (req, res) => {
    const transactionId = req.query.transaction_id;
    const orderId = req.query.order_id;
    
    console.log('📊 Status check requested:', { transactionId, orderId });
    
    // Access global storage
    global.transactionStatuses = global.transactionStatuses || {};
    
    console.log('Available statuses:', Object.keys(global.transactionStatuses));
    
    const statusByTransaction = global.transactionStatuses[transactionId];
    const statusByOrder = global.transactionStatuses[orderId];
    const status = statusByTransaction || statusByOrder;
    
    if (status) {
        console.log('✅ Status found:', status);
        res.json({
            found: true,
            status: status.status,
            timestamp: status.timestamp,
            transaction_id: transactionId,
            order_id: orderId
        });
    } else {
        console.log('❌ Status not found, returning pending');
        res.json({
            found: false,
            status: 'pending',
            transaction_id: transactionId,
            order_id: orderId
        });
    }
};