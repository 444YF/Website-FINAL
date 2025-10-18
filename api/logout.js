module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token && global.sessions && global.sessions[token]) {
            delete global.sessions[token];
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};