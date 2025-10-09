module.exports = (req, res) => {
    // Get transaction details from query params
    const transactionId = req.query.transaction_id || req.body?.transaction_id;
    const orderId = req.query.order_id || req.body?.order_id;
    
    // Log what we received
    console.log('Return URL called:', {
        method: req.method,
        query: req.query,
        body: req.body,
        transaction_id: transactionId,
        order_id: orderId
    });
    
    // Send processing page that will poll for status
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Processing Payment</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #000000;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        body:before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(0, 255, 65, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 65, 0.05) 1px, transparent 1px);
            background-size: 50px 50px;
            z-index: 0;
        }

        .container {
            text-align: center;
            position: relative;
            z-index: 1;
            padding: 40px;
        }

        .spinner {
            width: 100px;
            height: 100px;
            border: 3px solid rgba(0, 255, 65, 0.3);
            border-top: 3px solid #00ff41;
            border-radius: 50%;
            margin: 0 auto 30px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        h1 {
            color: #00ff41;
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
        }

        p {
            color: rgba(0, 255, 65, 0.8);
            font-size: 1.2rem;
            margin-bottom: 10px;
        }

        .status-info {
            color: rgba(0, 255, 65, 0.5);
            font-size: 0.9rem;
            margin-top: 30px;
        }

        /* Success/Failure states */
        .icon {
            width: 100px;
            height: 100px;
            border: 3px solid #00ff41;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            animation: pulse 2s infinite;
        }

        .icon.show {
            display: flex;
        }

        .icon.success {
            border-color: #00ff41;
        }

        .icon.success:after {
            content: '✓';
            font-size: 60px;
            color: #00ff41;
        }

        .icon.failure {
            border-color: #ff0041;
        }

        .icon.failure:after {
            content: '✕';
            font-size: 60px;
            color: #ff0041;
        }

        h1.failure {
            color: #ff0041;
            text-shadow: 0 0 20px rgba(255, 0, 65, 0.5);
        }

        p.failure {
            color: #ff0041;
        }

        button {
            background: transparent;
            color: #00ff41;
            padding: 15px 40px;
            border: 2px solid #00ff41;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.3s ease;
            display: none;
            margin-top: 20px;
        }

        button.show {
            display: inline-block;
        }

        button:hover {
            background: #00ff41;
            color: #000;
            box-shadow: 0 0 30px rgba(0, 255, 65, 0.6);
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
            }
            50% {
                box-shadow: 0 0 40px rgba(0, 255, 65, 0.8);
            }
        }

        .icon.failure {
            animation: pulseRed 2s infinite;
        }

        @keyframes pulseRed {
            0%, 100% {
                box-shadow: 0 0 20px rgba(255, 0, 65, 0.5);
            }
            50% {
                box-shadow: 0 0 40px rgba(255, 0, 65, 0.8);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner" id="spinner"></div>
        <div class="icon" id="icon"></div>
        <h1 id="title">PROCESSING PAYMENT</h1>
        <p id="message">Please wait while we confirm your payment...</p>
        <p class="status-info" id="statusInfo">Waiting for payment confirmation</p>
        <button id="backBtn" onclick="window.location.href='/'">Back to Shop</button>
    </div>

    <script>
        const transactionId = '${transactionId || ''}';
        const orderId = '${orderId || ''}';
        let pollCount = 0;
        const maxPolls = 60; // Poll for up to 60 seconds
        
        async function checkStatus() {
            try {
                const response = await fetch('/api/transaction-status?transaction_id=' + transactionId + '&order_id=' + orderId);
                const data = await response.json();
                
                console.log('Status check:', data);
                
                if (data.status) {
                    const status = data.status.toLowerCase();
                    
                    if (status === 'settled' || status === 'captured' || status === 'authorized') {
                        // Success!
                        showSuccess();
                        return true;
                    } else if (status === 'failed' || status === 'declined' || status === 'cancelled' || status === 'expired') {
                        // Failed
                        showFailure(status);
                        return true;
                    } else if (status === 'pending') {
                        // Still pending, keep polling
                        document.getElementById('statusInfo').textContent = 'Status: Pending - Waiting for bank confirmation';
                        return false;
                    }
                }
                
                return false;
            } catch (error) {
                console.error('Error checking status:', error);
                return false;
            }
        }
        
        function showSuccess() {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('icon').classList.add('success', 'show');
            document.getElementById('title').textContent = 'PAYMENT SUCCESSFUL!';
            document.getElementById('message').textContent = 'Thank you for your purchase. Your order has been confirmed.';
            document.getElementById('statusInfo').textContent = 'Payment settled';
            document.getElementById('backBtn').classList.add('show');
        }
        
        function showFailure(status) {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('icon').classList.add('failure', 'show');
            document.getElementById('title').textContent = 'PAYMENT FAILED';
            document.getElementById('title').classList.add('failure');
            document.getElementById('message').textContent = 'Your payment could not be processed. Please try again.';
            document.getElementById('message').classList.add('failure');
            document.getElementById('statusInfo').textContent = 'Status: ' + status;
            document.getElementById('backBtn').classList.add('show');
        }
        
        function showTimeout() {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('title').textContent = 'PAYMENT PROCESSING';
            document.getElementById('message').textContent = 'Your payment is still being processed. Please check your email for confirmation.';
            document.getElementById('statusInfo').textContent = 'This is taking longer than expected';
            document.getElementById('backBtn').classList.add('show');
        }
        
        // Start polling
        const pollInterval = setInterval(async () => {
            pollCount++;
            
            const complete = await checkStatus();
            
            if (complete) {
                clearInterval(pollInterval);
            } else if (pollCount >= maxPolls) {
                clearInterval(pollInterval);
                showTimeout();
            }
        }, 1000); // Check every second
        
        // Initial check
        checkStatus();
    </script>
</body>
</html>
    `);
};