const axios = import ('axios');

const baseUrl = 'http://ec2-18-119-117-120.us-east-2.compute.amazonaws.com:3000';

export default async function handler(req, res) {
    const axios = (await import('axios')).default;
    try {

        if (req.method === 'GET') {
            const response = await axios.get(`${baseUrl}/status`);
            res.status(response.status).json(response.data);

        } 
        else {
            res.status(404).json({ error: 'Not Found' });
        }
    } 
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}