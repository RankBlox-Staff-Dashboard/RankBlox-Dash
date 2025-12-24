const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function queryUser() {
  const username = 'Preston_iscool1123';
  
  // Allow credentials to be passed as command line arguments
  // Usage: node query_user.js [host] [user] [password] [database]
  const args = process.argv.slice(2);
  
  // Database configuration
  const dbConfig = {
    host: args[0] || process.env.DB_HOST || 'ahsDB.zenohost.co.uk',
    user: args[1] || process.env.DB_USER || 'AHSStaff',
    password: args[2] || process.env.DB_PASSWORD || 'AHSStaff2025!Security!Zenohost',
    database: args[3] || process.env.DB_NAME || 'ahstaffsecureencrypteddatabase',
  };

  // Try to get credentials from environment or prompt
  if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.log('⚠️  Database credentials not found in .env file.');
    console.log('\nPlease provide database credentials:');
    console.log('Option 1: Create backend/.env file with:');
    console.log('  DB_HOST=localhost (or your MySQL host)');
    console.log('  DB_USER=your_mysql_username');
    console.log('  DB_PASSWORD=your_mysql_password');
    console.log('  DB_NAME=your_database_name');
    console.log('\nOption 2: Set environment variables:');
    console.log('  export DB_USER=your_username');
    console.log('  export DB_PASSWORD=your_password');
    console.log('  export DB_NAME=your_database');
    console.log('  export DB_HOST=localhost');
    console.log('\nThen run: node query_user.js');
    process.exit(1);
  }

  try {
    console.log(`Connecting to MySQL database: ${dbConfig.database}@${dbConfig.host}...`);
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!\n');

    // Query user by roblox_username or discord_username
    console.log(`Searching for user: ${username}\n`);
    
    const [users] = await connection.query(
      `SELECT * FROM users 
       WHERE roblox_username = ? OR discord_username LIKE ? 
       ORDER BY id DESC`,
      [username, `%${username}%`]
    );

    if (users.length === 0) {
      console.log(`No user found with username: ${username}`);
      console.log('\nSearching for similar usernames...');
      const [similar] = await connection.query(
        `SELECT id, roblox_username, discord_username, discord_id, \`rank\`, status 
         FROM users 
         WHERE roblox_username LIKE ? OR discord_username LIKE ? 
         LIMIT 10`,
        [`%${username}%`, `%${username}%`]
      );
      
      if (similar.length > 0) {
        console.log('\nSimilar users found:');
        similar.forEach(u => {
          console.log(`  - ID: ${u.id}, Roblox: ${u.roblox_username || 'N/A'}, Discord: ${u.discord_username || 'N/A'}, Rank: ${u.rank || 'N/A'}, Status: ${u.status}`);
        });
      }
    } else {
      for (const user of users) {
        console.log('='.repeat(80));
        console.log(`USER FOUND - ID: ${user.id}`);
        console.log('='.repeat(80));
        console.log('\n📋 USER TABLE DATA:');
        console.log(JSON.stringify(user, null, 2));
        
        // Get activity logs
        console.log('\n📊 ACTIVITY LOGS:');
        const [activityLogs] = await connection.query(
          `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY week_start DESC`,
          [user.id]
        );
        
        if (activityLogs.length > 0) {
          console.log(`Found ${activityLogs.length} activity log entries:`);
          activityLogs.forEach((log, idx) => {
            console.log(`\n  Entry ${idx + 1}:`);
            console.log(`    Week Start: ${log.week_start}`);
            console.log(`    Messages Sent: ${log.messages_sent || 0}`);
            console.log(`    Minutes: ${log.minutes || 0}`);
            console.log(`    Tickets Claimed: ${log.tickets_claimed || 0}`);
            console.log(`    Tickets Resolved: ${log.tickets_resolved || 0}`);
            console.log(`    Created At: ${log.created_at}`);
            console.log(`    Updated At: ${log.updated_at || 'N/A'}`);
          });
        } else {
          console.log('  No activity logs found for this user.');
        }
        
        // Get current week's activity
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const weekStart = monday.toISOString().split('T')[0];
        
        console.log(`\n📅 CURRENT WEEK (${weekStart}):`);
        const [currentWeek] = await connection.query(
          `SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?`,
          [user.id, weekStart]
        );
        
        if (currentWeek.length > 0) {
          console.log(JSON.stringify(currentWeek[0], null, 2));
        } else {
          console.log('  No activity log for current week.');
        }
        
        // Get infractions
        console.log('\n⚠️  INFRACTIONS:');
        const [infractions] = await connection.query(
          `SELECT * FROM infractions WHERE user_id = ? ORDER BY created_at DESC`,
          [user.id]
        );
        
        if (infractions.length > 0) {
          console.log(`Found ${infractions.length} infraction(s):`);
          infractions.forEach((inf, idx) => {
            console.log(`\n  Infraction ${idx + 1}:`);
            console.log(`    ID: ${inf.id}`);
            console.log(`    Type: ${inf.type}`);
            console.log(`    Reason: ${inf.reason}`);
            console.log(`    Voided: ${inf.voided ? 'Yes' : 'No'}`);
            console.log(`    Issued By: ${inf.issued_by}`);
            console.log(`    Created At: ${inf.created_at}`);
          });
        } else {
          console.log('  No infractions found.');
        }
        
        // Get tickets
        console.log('\n🎫 TICKETS:');
        const [tickets] = await connection.query(
          `SELECT * FROM tickets WHERE claimed_by = ? ORDER BY created_at DESC`,
          [user.id]
        );
        
        if (tickets.length > 0) {
          console.log(`Found ${tickets.length} ticket(s):`);
          tickets.forEach((ticket, idx) => {
            console.log(`\n  Ticket ${idx + 1}:`);
            console.log(`    ID: ${ticket.id}`);
            console.log(`    Status: ${ticket.status}`);
            console.log(`    Claimed By: ${ticket.claimed_by || 'Unclaimed'}`);
            console.log(`    Created By: ${ticket.created_by}`);
            console.log(`    Created At: ${ticket.created_at}`);
          });
        } else {
          console.log('  No tickets found.');
        }
        
        // Get message count from discord_messages for current week
        console.log(`\n💬 DISCORD MESSAGES (Current Week ${weekStart}):`);
        const [messageCount] = await connection.query(
          `SELECT COUNT(*) as count FROM discord_messages 
           WHERE user_id = ? AND created_at >= ?`,
          [user.id, `${weekStart} 00:00:00`]
        );
        console.log(`  Total messages this week: ${messageCount[0].count || 0}`);
        
        const [recentMessages] = await connection.query(
          `SELECT * FROM discord_messages 
           WHERE user_id = ? AND created_at >= ? 
           ORDER BY created_at DESC LIMIT 5`,
          [user.id, `${weekStart} 00:00:00`]
        );
        
        if (recentMessages.length > 0) {
          console.log(`\n  Recent messages (last 5):`);
          recentMessages.forEach((msg, idx) => {
            console.log(`    ${idx + 1}. Message ID: ${msg.discord_message_id}, Channel: ${msg.discord_channel_id}, Created: ${msg.created_at}`);
          });
        }
        
        console.log('\n' + '='.repeat(80));
      }
    }

    await connection.end();
    console.log('\n✅ Query completed!');
  } catch (error) {
    console.error('\n❌ Error querying database:');
    console.error(error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nCould not connect to MySQL. Make sure MySQL is running and credentials are correct.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nAccess denied. Check your DB_USER and DB_PASSWORD.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\nDatabase does not exist. Check your DB_NAME.');
    }
    process.exit(1);
  }
}

queryUser();

