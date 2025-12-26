const mysql = require('mysql2/promise');

async function checkUser() {
  const dbConfig = {
    host: 'ahsDB.zenohost.co.uk',
    user: 'AHSStaff',
    password: 'AHSStaff2025!Security!Zenohost',
    database: 'ahstaffsecureencrypteddatabase',
  };

  try {
    console.log('Connecting to MySQL database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!\n');

    // Search for BlakeGamez0
    const username = 'BlakeGamez0';
    console.log(`Searching for user: ${username}\n`);
    
    const [users] = await connection.query(
      `SELECT id, discord_id, discord_username, roblox_id, roblox_username, \`rank\`, status 
       FROM users 
       WHERE LOWER(roblox_username) = LOWER(?) OR LOWER(discord_username) = LOWER(?)
       LIMIT 10`,
      [username, username]
    );

    if (users.length === 0) {
      console.log(`No exact match found. Searching for similar usernames...\n`);
      const [similar] = await connection.query(
        `SELECT id, discord_id, discord_username, roblox_id, roblox_username, \`rank\`, status 
         FROM users 
         WHERE roblox_username LIKE ? OR discord_username LIKE ? 
         LIMIT 10`,
        [`%${username}%`, `%${username}%`]
      );
      
      if (similar.length > 0) {
        console.log('Similar users found:');
        console.table(similar);
      } else {
        console.log('No similar users found.');
      }
    } else {
      console.log('User(s) found:');
      console.table(users);
      
      // Show all users with roblox_username for reference
      console.log('\n\nAll users with roblox_username (first 20):');
      const [allUsers] = await connection.query(
        `SELECT id, discord_username, roblox_username, roblox_id 
         FROM users 
         WHERE roblox_username IS NOT NULL 
         ORDER BY id DESC 
         LIMIT 20`
      );
      console.table(allUsers);
    }

    await connection.end();
    console.log('\n✅ Query completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();

