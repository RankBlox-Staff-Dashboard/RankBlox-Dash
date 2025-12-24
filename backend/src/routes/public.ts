import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Proxy endpoint for Roblox avatars (bypasses CORS)
 * This allows the frontend to fetch Roblox avatars without CORS issues
 * Public endpoint - no authentication required
 */
router.get('/roblox-avatar/:robloxId', async (req: Request, res: Response) => {
  try {
    const { robloxId } = req.params;
    const size = (req.query.size as string) || '150x150';

    if (!robloxId || !/^\d+$/.test(robloxId)) {
      return res.status(400).json({ error: 'Invalid Roblox ID' });
    }

    // Fetch from Roblox API
    const robloxUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=${size}&format=Png&isCircular=false`;
    const response = await fetch(robloxUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch avatar from Roblox' });
    }

    const data = await response.json();
    
    // Return the data with CORS headers (handled by server CORS middleware)
    res.json(data);
  } catch (error) {
    console.error('Error proxying Roblox avatar:', error);
    res.status(500).json({ error: 'Failed to proxy Roblox avatar' });
  }
});

export default router;

