// pages/api/overrides.js
import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db('milkman');
        const collection = db.collection('overrides');

        if (req.method === 'GET') {
            const { year, month } = req.query;

            if (!year || !month) {
                return res.status(400).json({ error: 'Year and month are required' });
            }

            // Create date range for the month (already in UTC+5)
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(parseInt(year), parseInt(month), 0);
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

            const overrides = await collection.find({
                date: {
                    $gte: startDate,
                    $lte: endDateStr
                }
            }).toArray();

            res.status(200).json(overrides);
        } else if (req.method === 'POST') {
            const { date, category1Amount, category2Amount } = req.body;

            if (!date) {
                return res.status(400).json({ error: 'Date is required' });
            }

            // Store exactly as received (UTC+5 format)
            await collection.replaceOne(
                { date },
                {
                    date,
                    category1Amount: parseFloat(category1Amount) || 0,
                    category2Amount: parseFloat(category2Amount) || 0,
                    updatedAt: new Date()
                },
                { upsert: true }
            );

            res.status(200).json({ success: true });
        } else {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}