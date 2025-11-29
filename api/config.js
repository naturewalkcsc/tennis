import { kv } from './_kv.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const url = await kv.get('youtube_url');
      res.json({ url: url || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0' });
    } catch (error) {
      console.error('Config GET error:', error);
      res.status(500).json({ error: 'Failed to get config' });
    }
  } else if (req.method === 'POST') {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      // Convert to embed format
      let embedUrl = url;
      let videoId = null;
      
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        embedUrl = url;
      }
      
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
      
      await kv.set('youtube_url', embedUrl);
      res.json({ success: true, url: embedUrl });
    } catch (error) {
      console.error('Config POST error:', error);
      res.status(500).json({ error: 'Failed to save config' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}