import { Router, Request, Response } from 'express';
import axios from 'axios';

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
      return res.status(200).json({ data: [] });
    }
    
    // Validate size parameter to prevent injection
    if (!/^\d+x\d+$/.test(size)) {
      return res.status(400).json({ error: 'Invalid size format. Expected format: WIDTHxHEIGHT (e.g., 150x150)' });
    }
    
    // Prevent extremely large sizes that could cause issues
    const [width, height] = size.split('x').map(Number);
    if (width > 1000 || height > 1000 || width < 1 || height < 1 || !Number.isInteger(width) || !Number.isInteger(height)) {
      return res.status(400).json({ error: 'Size dimensions must be integers between 1 and 1000' });
    }

    // Fetch from Roblox API - robloxId is validated as numeric, size is validated above
    const robloxUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=${size}&format=Png&isCircular=false`;
    
    let robloxResponse: globalThis.Response;
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Create abort controller for timeout (consistent with other routes)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      robloxResponse = await fetch(robloxUrl, {
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } catch (fetchError) {
      // Always clear timeout in case of error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // Network errors, timeouts, etc. - return empty data structure
      // Frontend will fallback to Discord avatar
      return res.status(200).json({ data: [] });
    }

    if (!robloxResponse.ok) {
      // If Roblox returns 404 or any other error, return empty data structure
      // Frontend will fallback to Discord avatar
      return res.status(200).json({ data: [] });
    }

    const data = await robloxResponse.json() as { data?: Array<{ imageUrl?: string }> };
    
    // Validate response structure - if invalid, return empty data structure
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0 || !data.data[0]?.imageUrl) {
      return res.status(200).json({ data: [] });
    }
    
    // Return the data with CORS headers (handled by server CORS middleware)
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in roblox-avatar endpoint:', error);
    // Any unexpected error - return empty data structure instead of error response
    // Frontend will fallback to Discord avatar
    return res.status(200).json({ data: [] });
  }
});

/**
 * Proxy endpoint for EasyPOS Activity API (bypasses CORS)
 * This allows the frontend to fetch activity data without CORS issues
 * Public endpoint - requires userId parameter
 */
router.post('/activity-data', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate userId with bounds checking
    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({ error: 'userId is required and must be a number' });
    }
    if (!Number.isInteger(userId) || userId <= 0 || userId > 2147483647) {
      return res.status(400).json({ error: 'userId must be a positive integer within valid range' });
    }

    // API token for EasyPOS activity API - should be in environment variables
    const token = process.env.EASYPOS_API_TOKEN || 'f4ce0b59a2b93faa733f9774e3a57f376d4108edca9252b2050661d8b36b50c5f16bd0ba45a9f22c8493a7a8a9d86f90';
    
    if (!token || token === 'your_easypos_api_token_here') {
      return res.status(500).json({ 
        error: 'Activity API not configured',
        message: 'EASYPOS_API_TOKEN environment variable is required'
      });
    }

    try {
      // Use exact format as specified by user
      const axiosReq = await axios.post('https://papi.easypos.lol/activity/data', {
        token: token,
        userId: userId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const response = axiosReq.data;
      console.log('[Activity API Proxy] Response received:', response);
      
      // Extract minutes from response
      // Response structure: { success: true, data: { playtime: { total: 218, week: 218, month: 218, ... }, ... } }
      let minutes = 0;
      if (response && response.data && response.data.playtime) {
        // Use week playtime, fallback to total if week not available
        minutes = response.data.playtime.week || response.data.playtime.total || 0;
      } else if (response && response.playtime) {
        // Handle if playtime is at root level
        minutes = response.playtime.week || response.playtime.total || 0;
      } else if (response && typeof response.minutes === 'number') {
        minutes = response.minutes;
      } else if (response && typeof response.activityMinutes === 'number') {
        minutes = response.activityMinutes;
      } else if (response && typeof response.playtime === 'number') {
        minutes = response.playtime;
      } else if (typeof response === 'number') {
        minutes = response;
      }

      console.log('[Activity API Proxy] Extracted minutes:', minutes);

      // Return the full response data (frontend can extract what it needs)
      res.status(200).json({
        success: true,
        minutes: minutes,
        data: response // Include full response in case frontend needs other data
      });
    } catch (apiError: any) {
      console.error('[Activity API Proxy] Error fetching from EasyPOS API:', apiError.message || apiError);
      console.error('[Activity API Proxy] Error details:', apiError.response?.data || apiError.response?.status);
      
      // Return error response
      return res.status(502).json({ 
        error: 'Failed to fetch activity data',
        message: `Could not fetch minutes from activity API: ${apiError.message || 'Unknown error'}`
      });
    }
  } catch (error: any) {
    console.error('[Activity API Proxy] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

