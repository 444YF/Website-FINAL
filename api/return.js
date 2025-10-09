module.exports = (req, res) => {
    const transactionId = req.query.transaction_id || req.body?.transaction_id;
    const orderId = req.query.order_id || req.body?.order_id;
    
    console.log('Return URL called:', {
        method: req.method,
        query: req.query,
        body: req.body
    });
    
    // For now, show success immediately and rely on webhooks for actual status
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Processing</title>
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

        .icon {
            width: 100px;
            height: 100px;
            border: 3px solid #00ff41;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            animation: pulse 2s infinite;
        }

        .icon:after {
            content: '✓';
            font-size: 60px;
            color: #00ff41;
        }

        h1 {
            color: #00ff41;
            font-size: 3rem;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
        }

        p {
            color: rgba(0, 255, 65, 0.8);
            font-size: 1.2rem;
            margin-bottom: 10px;
        }

        .note {
            color: rgba(0, 255, 65, 0.6);
            font-size: 0.9rem;
            margin-top: 20px;
            font-style: italic;
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
            margin-top: 30px;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="icon"></div>
        <h1>PAYMENT RECEIVED!</h1>
        <p>Thank you for your purchase.</p>
        <p>Your order is being processed.</p>
        <p class="note">You'll receive a confirmation email once the payment settles.</p>
        <button onclick="window.location.href='/'">Back to Shop</button>
    </div>
</body>
</html>
    `);
};