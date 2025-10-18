const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const ACQUIRED_APP_ID = process.env.ACQUIRED_APP_ID || '21697534';
const ACQUIRED_APP_KEY = process.env.ACQUIRED_APP_KEY || 'f9b09f5b7de24c56e372c221d7870db6';
const ACQUIRED_COMPANY_ID = process.env.ACQUIRED_COMPANY_ID || '018d7efe-a884-739b-b763-033d6e242611';
const ACQUIRED_API_URL = 'https://test-api.acquired.com';

async function getAcquiredToken() {
    const response = await fetch(`${ACQUIRED_API_URL}/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: ACQUIRED_APP_ID,
            app_key: ACQUIRED_APP_KEY
        })
    });
    const data = await response.json();
    return data.access_token;
}

module.exports = async (req, res) => {
    try {
        console.log('🔄 Processing scheduled instalments...');
        
        // Get all scheduled payment keys (in production, use a proper job queue)
        const keys = await redis.keys('schedule:*');
        console.log(`Found ${keys.length} payment schedules`);
        
        const now = new Date();
        const results = [];
        
        for (const key of keys) {
            const scheduleData = await redis.get(key);
            if (!scheduleData) continue;
            
            const schedule = JSON.parse(scheduleData);
            console.log(`\n📅 Checking schedule for order: ${schedule.order_id}`);
            
            // Find payments due today
            for (const payment of schedule.payments) {
                if (payment.status !== 'scheduled') continue;
                
                const paymentDate = new Date(payment.scheduled_date);
                
                // Check if payment is due (within 24 hours)
                if (paymentDate <= now) {
                    console.log(`💳 Processing instalment ${payment.instalment_number}/${schedule.total_instalments}`);
                    
                    try {
                        // Get Acquired token
                        const token = await getAcquiredToken();
                        
                        // Process recurring payment
                        const response = await fetch(`${ACQUIRED_API_URL}/v1/payments/recurring`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'company_id': ACQUIRED_COMPANY_ID
                            },
                            body: JSON.stringify({
                                card_id: schedule.card_id,
                                transaction: {
                                    order_id: `${schedule.order_id}-INST-${payment.instalment_number}`,
                                    amount: payment.amount,
                                    currency: 'gbp',
                                    capture: true
                                }
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (result.transaction_id) {
                            console.log(`✅ Payment successful: ${result.transaction_id}`);
                            payment.status = 'completed';
                            payment.transaction_id = result.transaction_id;
                            payment.completed_at = new Date().toISOString();
                            
                            results.push({
                                order_id: schedule.order_id,
                                instalment: payment.instalment_number,
                                status: 'success',
                                transaction_id: result.transaction_id
                            });
                        } else {
                            console.log(`❌ Payment failed:`, result);
                            payment.status = 'failed';
                            payment.error = result;
                            
                            results.push({
                                order_id: schedule.order_id,
                                instalment: payment.instalment_number,
                                status: 'failed',
                                error: result
                            });
                        }
                        
                        // Update schedule in Redis
                        await redis.setex(key, 2592000, JSON.stringify(schedule));
                        
                    } catch (error) {
                        console.error(`❌ Error processing payment:`, error);
                        payment.status = 'error';
                        payment.error = error.message;
                        
                        results.push({
                            order_id: schedule.order_id,
                            instalment: payment.instalment_number,
                            status: 'error',
                            error: error.message
                        });
                    }
                }
            }
        }
        
        console.log(`\n✅ Processed ${results.length} payments`);
        
        res.json({
            success: true,
            processed: results.length,
            results: results
        });
        
    } catch (error) {
        console.error('❌ Error processing instalments:', error);
        res.status(500).json({ error: error.message });
    }
};