-- Staff Minutes Tracker
-- Place this script in ServerScriptService
-- This script tracks how long staff members are in-game and sends the data to your backend API

-- Configuration
local API_URL = "https://rankblox-dash-backend-706270663868.europe-west1.run.app/api/bot/roblox-minutes"
local BOT_API_TOKEN = "9f3c2e8b7a4d6f1a0c5e92d8b4a7e3f1"
local UPDATE_INTERVAL = 60 -- Update API every 60 seconds (1 minute)
local DEBUG = true -- Set to false to reduce log output

-- Store player join times and session minutes
local playerData = {}

-- Debug logging function
local function debugLog(message)
	if DEBUG then
		print("[DEBUG] " .. message)
	end
end

-- Function to send minutes to API
local function sendMinutesToAPI(robloxUsername, minutes)
	debugLog("Preparing to send minutes to API for user " .. tostring(robloxUsername) .. ": " .. tostring(math.floor(minutes)) .. " minutes")
	
	local success, result = pcall(function()
		local httpService = game:GetService("HttpService")
		
		local headers = {
			["Content-Type"] = "application/json",
			["X-Bot-Token"] = BOT_API_TOKEN
		}
		
		local requestBody = {
			roblox_username = tostring(robloxUsername),
			minutes = math.floor(minutes)
		}
		
		local body = httpService:JSONEncode(requestBody)
		
		debugLog("Sending POST request to: " .. API_URL)
		debugLog("Request body: " .. body)
		debugLog("Headers: Content-Type=application/json, X-Bot-Token=" .. (BOT_API_TOKEN ~= "your_bot_api_token_here" and "***SET***" or "***NOT SET***"))
		
		local response = httpService:RequestAsync({
			Url = API_URL,
			Method = "POST",
			Headers = headers,
			Body = body
		})
		
		debugLog("API Response Status Code: " .. tostring(response.StatusCode))
		debugLog("API Response Status Message: " .. tostring(response.StatusMessage))
		debugLog("API Response Success: " .. tostring(response.Success))
		
		if response.Body then
			debugLog("API Response Body: " .. tostring(response.Body))
		end
		
		if response.Success then
			print("[Staff Tracker] ✓ Successfully sent " .. tostring(math.floor(minutes)) .. " minutes for user " .. tostring(robloxUsername))
			return true
		else
			warn("[Staff Tracker] ✗ Failed to send minutes for user " .. tostring(robloxUsername) .. ": " .. tostring(response.StatusCode) .. " - " .. tostring(response.StatusMessage))
			if response.Body then
				warn("[Staff Tracker] Response body: " .. tostring(response.Body))
			end
			return false
		end
	end)
	
	if not success then
		warn("[Staff Tracker] ✗ Error sending minutes to API: " .. tostring(result))
		warn("[Staff Tracker] Error type: " .. type(result))
		return false
	end
	
	return true
end

-- Function to update player minutes
local function updatePlayerMinutes(player)
	local userId = player.UserId
	local currentTime = tick()
	
	if not playerData[userId] then
		debugLog("Warning: Attempted to update minutes for user " .. tostring(userId) .. " but no player data found")
		return
	end
	
	local sessionStartTime = playerData[userId].sessionStartTime
	local timeInGame = (currentTime - sessionStartTime) / 60 -- Convert to minutes (total session time)
	local timeInGameSeconds = currentTime - sessionStartTime
	
	debugLog("Updating minutes for " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
	debugLog("  Session start time: " .. tostring(sessionStartTime))
	debugLog("  Current time: " .. tostring(currentTime))
	debugLog("  Time in game (seconds): " .. tostring(timeInGameSeconds))
	debugLog("  Time in game (minutes): " .. tostring(timeInGame))
	debugLog("  Rounded minutes: " .. tostring(math.floor(timeInGame)))
	
	-- Update last update time
	playerData[userId].lastUpdate = currentTime
	
	-- Send to API using player's username (backend will use max to ensure minutes don't decrease)
	-- This sends the total minutes played in this session
	sendMinutesToAPI(player.Name, timeInGame)
end

-- Function to handle player joining
local function onPlayerAdded(player)
	local userId = player.UserId
	local currentTime = tick()
	
	debugLog("Player joined: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
	debugLog("  Join time: " .. tostring(currentTime))
	
	-- Initialize player data
	playerData[userId] = {
		joinTime = currentTime,
		sessionStartTime = currentTime,
		lastUpdate = currentTime
	}
	
	print("[Staff Tracker] ✓ Started tracking player: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
	debugLog("Player data initialized for " .. player.Name)
end

-- Function to handle player leaving
local function onPlayerRemoving(player)
	local userId = player.UserId
	
	debugLog("Player leaving: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
	
	if playerData[userId] then
		local sessionDuration = (tick() - playerData[userId].sessionStartTime) / 60
		debugLog("  Session duration: " .. tostring(sessionDuration) .. " minutes")
		
		-- Final update before player leaves
		debugLog("Sending final update before player leaves...")
		updatePlayerMinutes(player)
		
		-- Clean up
		playerData[userId] = nil
		print("[Staff Tracker] ✓ Stopped tracking player: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
		debugLog("Player data cleaned up for " .. player.Name)
	else
		debugLog("Warning: Player " .. player.Name .. " left but no player data found")
	end
end

-- Periodic update loop
local function startUpdateLoop()
	debugLog("Starting periodic update loop (interval: " .. tostring(UPDATE_INTERVAL) .. " seconds)")
	local updateCount = 0
	
	while true do
		wait(UPDATE_INTERVAL)
		updateCount = updateCount + 1
		
		debugLog("=== Update Cycle #" .. tostring(updateCount) .. " ===")
		debugLog("Currently tracking " .. tostring(#game.Players:GetPlayers()) .. " players")
		
		-- Count player data entries
		local dataCount = 0
		for _ in pairs(playerData) do
			dataCount = dataCount + 1
		end
		debugLog("Player data entries: " .. tostring(dataCount))
		
		local trackedCount = 0
		local cleanedCount = 0
		
		-- Update minutes for all players
		for userId, data in pairs(playerData) do
			local player = game.Players:GetPlayerByUserId(userId)
			if player then
				trackedCount = trackedCount + 1
				debugLog("Processing update for: " .. player.Name .. " (ID: " .. tostring(userId) .. ")")
				updatePlayerMinutes(player)
			else
				-- Player left but data wasn't cleaned up, clean it now
				cleanedCount = cleanedCount + 1
				debugLog("Cleaning up orphaned data for user ID: " .. tostring(userId))
				playerData[userId] = nil
			end
		end
		
		debugLog("Update cycle complete - Tracked: " .. tostring(trackedCount) .. ", Cleaned: " .. tostring(cleanedCount))
	end
end

-- Connect events
game.Players.PlayerAdded:Connect(onPlayerAdded)
game.Players.PlayerRemoving:Connect(onPlayerRemoving)

-- Start the update loop
spawn(startUpdateLoop)

-- Initialization logs
print("========================================")
print("[Staff Tracker] Staff minutes tracker initialized!")
print("========================================")
debugLog("Configuration:")
debugLog("  API_URL: " .. API_URL)
debugLog("  UPDATE_INTERVAL: " .. tostring(UPDATE_INTERVAL) .. " seconds")
debugLog("  BOT_API_TOKEN: " .. (BOT_API_TOKEN ~= "your_bot_api_token_here" and "***SET***" or "***NOT SET - PLEASE CONFIGURE***"))
debugLog("  DEBUG mode: " .. tostring(DEBUG))
debugLog("Current players in game: " .. tostring(#game.Players:GetPlayers()))
print("========================================")

