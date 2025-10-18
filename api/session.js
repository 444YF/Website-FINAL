module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const session = global.sessions && global.sessions[token];
        
        if (!session) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        res.json({
            success: true,
            user: session
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};