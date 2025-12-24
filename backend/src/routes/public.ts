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

    // Validate robloxId - if invalid, return empty data structure (never return 404)
    if (!robloxId || !/^\d+$/.test(robloxId)) {
      // Return empty data structure instead of error - frontend will use Discord fallback
      return res.json({ data: [] });
    }

    // Fetch from Roblox API
    const robloxUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=${size}&format=Png&isCircular=false`;
    
    let robloxResponse: globalThis.Response;
    try {
      // Create abort controller for timeout (consistent with other routes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      robloxResponse = await fetch(robloxUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (fetchError) {
      // Network errors, timeouts, etc. - return empty data structure
      // Frontend will fallback to Discord avatar
      return res.json({ data: [] });
    }

    if (!robloxResponse.ok) {
      // If Roblox returns 404 or any other error, return empty data structure
      // Frontend will fallback to Discord avatar
      return res.json({ data: [] });
    }

    const data = await robloxResponse.json() as { data?: Array<{ imageUrl?: string }> };
    
    // Validate response structure - if invalid, return empty data structure
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0 || !data.data[0]?.imageUrl) {
      return res.json({ data: [] });
    }
    
    // Return the data with CORS headers (handled by server CORS middleware)
    res.json(data);
  } catch (error) {
    // Any unexpected error - return empty data structure instead of error response
    // Frontend will fallback to Discord avatar
    return res.json({ data: [] });
  }
});

export default router;

