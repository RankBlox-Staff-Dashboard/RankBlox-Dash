-- Staff Minutes Tracker
-- Place this script in ServerScriptService
-- This script tracks how long staff members are in-game and sends the data to your backend API

-- Configuration
local API_URL = "https://your-api-url.com/api/bot/roblox-minutes" -- Replace with your actual API URL
local BOT_API_TOKEN = "your_bot_api_token_here" -- Replace with your BOT_API_TOKEN from .env
local UPDATE_INTERVAL = 60 -- Update API every 60 seconds (1 minute)

-- Store player join times and session minutes
local playerData = {}

-- Function to send minutes to API
local function sendMinutesToAPI(robloxId, minutes)
	local success, result = pcall(function()
		local httpService = game:GetService("HttpService")
		
		local headers = {
			["Content-Type"] = "application/json",
			["X-Bot-Token"] = BOT_API_TOKEN
		}
		
		local body = httpService:JSONEncode({
			roblox_id = tostring(robloxId),
			minutes = math.floor(minutes)
		})
		
		local response = httpService:RequestAsync({
			Url = API_URL,
			Method = "POST",
			Headers = headers,
			Body = body
		})
		
		if response.Success then
			print("[Staff Tracker] Successfully sent " .. tostring(minutes) .. " minutes for user " .. tostring(robloxId))
			return true
		else
			warn("[Staff Tracker] Failed to send minutes for user " .. tostring(robloxId) .. ": " .. tostring(response.StatusCode) .. " - " .. tostring(response.StatusMessage))
			return false
		end
	end)
	
	if not success then
		warn("[Staff Tracker] Error sending minutes to API: " .. tostring(result))
		return false
	end
	
	return true
end

-- Function to update player minutes
local function updatePlayerMinutes(player)
	local userId = player.UserId
	local currentTime = tick()
	
	if not playerData[userId] then
		return
	end
	
	local sessionStartTime = playerData[userId].sessionStartTime
	local timeInGame = (currentTime - sessionStartTime) / 60 -- Convert to minutes (total session time)
	
	-- Update last update time
	playerData[userId].lastUpdate = currentTime
	
	-- Send to API (backend will use max to ensure minutes don't decrease)
	-- This sends the total minutes played in this session
	sendMinutesToAPI(userId, timeInGame)
end

-- Function to handle player joining
local function onPlayerAdded(player)
	local userId = player.UserId
	local currentTime = tick()
	
	-- Initialize player data
	playerData[userId] = {
		joinTime = currentTime,
		sessionStartTime = currentTime,
		lastUpdate = currentTime
	}
	
	print("[Staff Tracker] Started tracking player: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
end

-- Function to handle player leaving
local function onPlayerRemoving(player)
	local userId = player.UserId
	
	if playerData[userId] then
		-- Final update before player leaves
		updatePlayerMinutes(player)
		
		-- Clean up
		playerData[userId] = nil
		print("[Staff Tracker] Stopped tracking player: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
	end
end

-- Periodic update loop
local function startUpdateLoop()
	while true do
		wait(UPDATE_INTERVAL)
		
		-- Update minutes for all players
		for userId, data in pairs(playerData) do
			local player = game.Players:GetPlayerByUserId(userId)
			if player then
				updatePlayerMinutes(player)
			else
				-- Player left but data wasn't cleaned up, clean it now
				playerData[userId] = nil
			end
		end
	end
end

-- Connect events
game.Players.PlayerAdded:Connect(onPlayerAdded)
game.Players.PlayerRemoving:Connect(onPlayerRemoving)

-- Start the update loop
spawn(startUpdateLoop)

print("[Staff Tracker] Staff minutes tracker initialized!")

