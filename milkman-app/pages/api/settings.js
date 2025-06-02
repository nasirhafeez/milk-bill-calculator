// pages/api/settings.js
import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db('milkman');
        const collection = db.collection('settings');

        if (req.method === 'GET') {
            const settings = await collection.findOne({});
            res.status(200).json(settings || {
                globalRate: 150,
                defaultCategory1: 2.0,
                defaultCategory2: 2.5
            });
        } else if (req.method === 'POST') {
            const { globalRate, defaultCategory1, defaultCategory2 } = req.body;

            await collection.replaceOne(
                {},
                {
                    globalRate,
                    defaultCategory1,
                    defaultCategory2,
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
        res.status(500).json({ error: 'Internal server error' });
    }
}