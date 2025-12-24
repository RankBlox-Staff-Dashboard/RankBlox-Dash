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
    
    let robloxResponse: globalThis.Response;
    try {
      robloxResponse = await fetch(robloxUrl);
    } catch (fetchError) {
      console.error('Error fetching from Roblox API:', fetchError);
      // Return empty data structure that frontend can handle
      return res.json({ data: [] });
    }

    if (!robloxResponse.ok) {
      // If Roblox returns 404 or other error, return empty data structure
      // Frontend will fallback to Discord avatar
      if (robloxResponse.status === 404) {
        return res.json({ data: [] });
      }
      console.error(`Roblox API returned ${robloxResponse.status} for user ${robloxId}`);
      return res.json({ data: [] });
    }

    const data = await robloxResponse.json() as { data?: Array<{ imageUrl?: string }> };
    
    // Validate response structure
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid response structure from Roblox API');
      return res.json({ data: [] });
    }
    
    // Return the data with CORS headers (handled by server CORS middleware)
    res.json(data);
  } catch (error) {
    console.error('Error proxying Roblox avatar:', error);
    // Return empty data structure instead of error to allow frontend fallback
    res.json({ data: [] });
  }
});

export default router;

