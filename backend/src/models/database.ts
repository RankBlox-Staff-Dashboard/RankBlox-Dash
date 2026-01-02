import { MongoClient, Db, Collection, ObjectId, Filter, UpdateFilter, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'rankblox_staff';

let client: MongoClient | null = null;
let db: Db | null = null;

// Initialize MongoDB connection
export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
console.log('[Database] ========================================');
    console.log('[Database] MongoDB Database Connection');
console.log('[Database] ========================================');
    console.log('[Database] URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    console.log('[Database] Database:', DB_NAME);
    console.log('[Database] Type: MongoDB');
console.log('[Database] ========================================');
    console.log('[Database] ✅ MongoDB database connection successful');
    
    return db;
  } catch (error: any) {
    console.error('[Database] ❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Helper function to get a collection
export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db.collection<T>(name);
}

// Get next numeric ID for a collection (using counter pattern)
async function getNextId(collectionName: string): Promise<number> {
  const countersCollection = getCollection<{ _id: string; seq: number }>('counters');
  const result = await countersCollection.findOneAndUpdate(
    { _id: collectionName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result?.seq || 1;
}

// Convert SQL-style queries to MongoDB
// This wrapper mimics the existing database API for compatibility
class DatabaseWrapper {
  prepare(sql: string) {
    return {
      // SELECT queries -> find operations
      get: async (...params: any[]) => {
        const parsed = this.parseSQL(sql, params);
        if (parsed.type === 'count') {
          // Handle COUNT queries
          const collection = getCollection(parsed.collection);
          const count = await collection.countDocuments(parsed.filter);
          return { count };
        } else if (parsed.type === 'findOne') {
          const collection = getCollection(parsed.collection);
          const result = await collection.findOne(parsed.filter) as any;
          // Convert ObjectId to string for _id if present
          if (result && result._id) {
            result._id = result._id.toString();
          }
          return result;
        } else if (parsed.type === 'find') {
          // Handle regular SELECT queries - get() should return first result only
          const collection = getCollection(parsed.collection);
          let cursor = collection.find(parsed.filter);
          if (parsed.sort) {
            cursor = cursor.sort(parsed.sort);
          }
          // Limit to 1 since get() should return a single row
          cursor = cursor.limit(1);
          const results = await cursor.toArray() as any[];
          const result = results[0] || null;
          // Convert ObjectId to string for _id if present
          if (result && result._id) {
            result._id = result._id.toString();
          }
          return result;
        } else if (parsed.type === 'findWithJoin') {
          // Handle JOIN queries
          const mainCollection = getCollection(parsed.collection);
          const joinCollection = getCollection(parsed.joinCollection);
          const mainDocs = await mainCollection.find(parsed.filter).toArray();
          const results = await Promise.all(mainDocs.map(async (doc: any) => {
            const joinFilter: any = {};
            joinFilter[parsed.join.foreignField] = doc[parsed.join.localField];
            const joined = await joinCollection.findOne(joinFilter);
            return { ...doc, [parsed.join.as]: joined };
          }));
          return results[0] || null;
        }
        throw new Error(`Unsupported query type for get: ${sql}`);
      },
      
      // INSERT/UPDATE/DELETE queries -> insertOne/updateOne/deleteOne
      run: async (...params: any[]) => {
        const parsed = this.parseSQL(sql, params);
        const collection = getCollection(parsed.collection);
        
        if (parsed.type === 'insertOne') {
          // Add numeric ID if not present
          if (!parsed.document.id) {
            try {
              parsed.document.id = await getNextId(parsed.collection);
            } catch (idError: any) {
              console.error(`[Database] Error getting next ID for ${parsed.collection}:`, idError);
              throw new Error(`Failed to generate ID for ${parsed.collection}: ${idError.message}`);
            }
          }
          try {
            const result = await collection.insertOne(parsed.document);
            return {
              lastInsertRowid: parsed.document.id,
              changes: result.acknowledged ? 1 : 0,
            };
          } catch (insertError: any) {
            // Re-throw with more context
            console.error(`[Database] Insert error for ${parsed.collection}:`, {
              code: insertError.code,
              message: insertError.message,
              document: JSON.stringify(parsed.document).substring(0, 200),
            });
            throw insertError;
          }
        } else if (parsed.type === 'updateOne') {
          const result = await collection.updateOne(parsed.filter, parsed.update);
          return {
            lastInsertRowid: null,
            changes: result.modifiedCount,
          };
        } else if (parsed.type === 'deleteOne') {
          const result = await collection.deleteOne(parsed.filter);
        return {
            lastInsertRowid: null,
            changes: result.deletedCount,
        };
        }
        throw new Error(`Unsupported query type for run: ${sql}`);
      },
      
      // SELECT queries returning multiple rows -> find operations
      all: async (...params: any[]) => {
        const parsed = this.parseSQL(sql, params);
        if (parsed.type === 'find') {
          const collection = getCollection(parsed.collection);
          const cursor = collection.find(parsed.filter);
          if (parsed.sort) {
            cursor.sort(parsed.sort);
          }
          if (parsed.limit) {
            cursor.limit(parsed.limit);
          }
          const results = await cursor.toArray() as any[];
          // Convert ObjectId to string for _id if present
          return results.map((doc: any) => {
            if (doc && doc._id) {
              doc._id = doc._id.toString();
            }
            return doc;
          });
        } else if (parsed.type === 'findWithJoin') {
          // Handle JOIN queries
          const mainCollection = getCollection(parsed.collection);
          const joinCollection = getCollection(parsed.joinCollection);
          let cursor = mainCollection.find(parsed.filter);
          if (parsed.sort) {
            cursor = cursor.sort(parsed.sort);
          }
          if (parsed.limit) {
            cursor = cursor.limit(parsed.limit);
          }
          const mainDocs = await cursor.toArray();
          const results = await Promise.all(mainDocs.map(async (doc: any) => {
            const joinFilter: any = {};
            joinFilter[parsed.join.foreignField] = doc[parsed.join.localField];
            const joined = await joinCollection.findOne(joinFilter);
            return { ...doc, [parsed.join.as]: joined };
          }));
          return results;
        } else if (parsed.type === 'count') {
          const collection = getCollection(parsed.collection);
          const count = await collection.countDocuments(parsed.filter);
          return [{ count }];
        }
        throw new Error(`Unsupported query type for all: ${sql}`);
      },
    };
  }

  async exec(sql: string) {
    // For schema initialization
    const parsed = this.parseSQL(sql, []);
    if (parsed.type === 'createCollection') {
      const collection = getCollection(parsed.collection);
      // Collections are created automatically in MongoDB
      return { acknowledged: true };
    }
    return { acknowledged: true };
  }

  async transaction<T>(fn: (tx: DatabaseWrapper) => Promise<T> | T): Promise<T> {
    // MongoDB transactions require a session
    if (!client) {
      throw new Error('Database client not initialized');
    }
    const session = client.startSession();
    try {
      session.startTransaction();
      const result = await Promise.resolve(fn(this));
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async close() {
    if (client) {
      await client.close();
      client = null;
      db = null;
    }
  }

  // Parse SQL-like queries and convert to MongoDB operations
  private parseSQL(sql: string, params: any[]): any {
    const normalized = sql.trim().replace(/\s+/g, ' ');
    
    // INSERT INTO table (cols) VALUES (?, ?)
    if (normalized.match(/^INSERT\s+INTO\s+(\w+)/i)) {
      const match = normalized.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const [, table, cols, values] = match;
        const columns = cols.split(',').map(c => c.trim().replace(/`/g, ''));
        const document: any = {};
        columns.forEach((col, idx) => {
          const value = params[idx];
          // Convert SQL column names to MongoDB field names (removes backticks, handles reserved keywords)
          const fieldName = this.convertColumnName(col);
          // Handle special values
          if (value === null || value === undefined) {
            document[fieldName] = null;
          } else if (typeof value === 'string' && (value.includes('NOW()') || value.includes('CURRENT_TIMESTAMP'))) {
            document[fieldName] = new Date();
          } else {
            document[fieldName] = value;
          }
        });
        // Add created_at/updated_at if not present
        if (!document.created_at) document.created_at = new Date();
        if (!document.updated_at) document.updated_at = new Date();
        return { type: 'insertOne', collection: table, document };
      }
    }
    
    // UPDATE table SET col = ? WHERE condition
    if (normalized.match(/^UPDATE\s+(\w+)/i)) {
      const match = normalized.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const [, table, setClause, whereClause] = match;
        const update: any = {};
        
        // Parse SET clause first - parameters come before WHERE parameters in SQL
        const sets = setClause.split(',').map(s => s.trim());
        let setParamIdx = 0;
        sets.forEach(set => {
          const [col, val] = set.split('=').map(s => s.trim());
          const fieldName = this.convertColumnName(col);
          if (val === '?') {
            update[fieldName] = params[setParamIdx++];
          } else if (val === 'NOW()') {
            update[fieldName] = new Date();
          } else {
            update[fieldName] = this.parseValue(val);
          }
        });
        
        // Parse WHERE clause starting after SET parameters
        const filter = this.parseWhere(whereClause, params, setParamIdx);
        
        return { type: 'updateOne', collection: table, filter, update: { $set: update } };
      }
    }
    
    // DELETE FROM table WHERE condition
    if (normalized.match(/^DELETE\s+FROM\s+(\w+)/i)) {
      const match = normalized.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const [, table, whereClause] = match;
        const filter = this.parseWhere(whereClause, params);
        return { type: 'deleteOne', collection: table, filter };
      }
    }
    
    // SELECT ... FROM table WHERE ... ORDER BY ... LIMIT ...
    if (normalized.match(/^SELECT/i)) {
      // Check if it's a COUNT query FIRST (before parsing WHERE clause)
      // This is important because COUNT queries need special handling
      const isCountQuery = normalized.match(/COUNT\(\*\)/i);
      
      // Use a more robust regex that captures the full WHERE clause
      // Match everything from WHERE to ORDER BY, LIMIT, or end of string
      const match = normalized.match(/FROM\s+(\w+)(?:\s+WHERE\s+((?:(?!\s+ORDER\s+BY|\s+LIMIT|$).)+))?(?:\s+ORDER\s+BY\s+((?:(?!\s+LIMIT|$).)+))?(?:\s+LIMIT\s+(\d+))?$/i);
      if (match) {
        const [, table, whereClause, orderBy, limit] = match;
        const filter = whereClause ? this.parseWhere(whereClause.trim(), params) : {};
        const sort = orderBy ? this.parseOrderBy(orderBy.trim()) : undefined;
        const limitNum = limit ? parseInt(limit) : undefined;
        
        // Check if it's a COUNT query
        if (isCountQuery) {
          // For COUNT, use MongoDB countDocuments
          return { type: 'count', collection: table, filter };
        }
        
        // Handle JOIN queries - for now, we'll do a simple find and manually join
        if (normalized.match(/LEFT\s+JOIN/i) || normalized.match(/JOIN/i)) {
          // Extract the main table and joined table
          const joinMatch = normalized.match(/FROM\s+(\w+)\s+(?:LEFT\s+)?JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
          if (joinMatch) {
            const [, mainTable, joinTable, mainTableAlias, mainCol, joinTableAlias, joinCol] = joinMatch;
            return { 
              type: 'findWithJoin', 
              collection: mainTable, 
              joinCollection: joinTable,
              filter,
              join: {
                localField: mainCol,
                foreignField: joinCol,
                as: joinTable
              },
              sort,
              limit: limitNum
            };
          }
        }
        
        return { type: 'find', collection: table, filter, sort, limit: limitNum };
      }
    }
    
    // CREATE TABLE IF NOT EXISTS -> create collection
    if (normalized.match(/^CREATE\s+TABLE/i)) {
      const match = normalized.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (match) {
        return { type: 'createCollection', collection: match[1] };
      }
    }
    
    throw new Error(`Unable to parse SQL: ${sql}`);
  }

  private parseWhere(whereClause: string | undefined, params: any[], paramOffset: number = 0): Filter<any> {
    if (!whereClause) return {};
    
    const filter: any = {};
    let paramIdx = paramOffset;
    
    // Simple WHERE parsing - handles: col = ?, col IS NULL, col IS NOT NULL, col IN (?)
    const conditions = whereClause.split(/\s+AND\s+/i).map(c => c.trim());
    
    conditions.forEach(condition => {
      // Handle LOWER(field) = LOWER(?) for case-insensitive comparison
      const lowerMatch = condition.match(/LOWER\((\w+)\)\s*=\s*LOWER\(\?\)/i);
      if (lowerMatch) {
        const [, col] = lowerMatch;
        const fieldName = this.convertColumnName(col);
        const value = params[paramIdx++];
        if (typeof value === 'string') {
          // Use case-insensitive regex for MongoDB
          filter[fieldName] = { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
        } else {
          filter[fieldName] = value;
        }
      } else if (condition.includes(' = ?')) {
        const [col] = condition.split(' = ?');
        const fieldName = this.convertColumnName(col.trim());
        const value = params[paramIdx++];
        // Convert string IDs to numbers if the field is 'id'
        if (fieldName === 'id' && typeof value === 'string' && !isNaN(Number(value))) {
          filter[fieldName] = Number(value);
        } else {
          filter[fieldName] = value;
        }
      } else if (condition.includes(' IS NULL')) {
        const col = condition.replace(' IS NULL', '').trim();
        const fieldName = this.convertColumnName(col);
        filter[fieldName] = null;
      } else if (condition.includes(' IS NOT NULL')) {
        const col = condition.replace(' IS NOT NULL', '').trim();
        const fieldName = this.convertColumnName(col);
        filter[fieldName] = { $ne: null };
      } else if (condition.match(/\s+=\s+false$/i)) {
        // Handle literal boolean false (e.g., voided = false)
        const col = condition.replace(/\s+=\s+false$/i, '').trim();
        const fieldName = this.convertColumnName(col);
        filter[fieldName] = false;
      } else if (condition.match(/\s+=\s+true$/i)) {
        // Handle literal boolean true (e.g., active = true)
        const col = condition.replace(/\s+=\s+true$/i, '').trim();
        const fieldName = this.convertColumnName(col);
        filter[fieldName] = true;
      } else if (condition.match(/\s+=\s+0$/)) {
        // Handle literal integer 0 (e.g., voided = 0)
        const col = condition.replace(/\s+=\s+0$/, '').trim();
        const fieldName = this.convertColumnName(col);
        filter[fieldName] = 0;
      } else if (condition.match(/\s+=\s+1$/)) {
        // Handle literal integer 1 (e.g., voided = 1)
        const col = condition.replace(/\s+=\s+1$/, '').trim();
        const fieldName = this.convertColumnName(col);
        filter[fieldName] = 1;
      } else if (condition.includes(' >= ?')) {
        const [col, val] = condition.split(' >= ?');
        const fieldName = this.convertColumnName(col.trim());
        filter[fieldName] = { $gte: params[paramIdx++] };
      } else if (condition.includes(' > ?')) {
        const [col, val] = condition.split(' > ?');
        const fieldName = this.convertColumnName(col.trim());
        filter[fieldName] = { $gt: params[paramIdx++] };
      } else if (condition.includes(' IN (')) {
        const match = condition.match(/(\w+)\s+IN\s+\(([^)]+)\)/);
        if (match) {
          const [, col, values] = match;
          const fieldName = this.convertColumnName(col);
          // For IN (?), we expect a single param that is an array
          filter[fieldName] = { $in: params[paramIdx++] };
        }
      } else if (condition.includes(' LIKE ')) {
        // Handle LIKE with % wildcards
        const match = condition.match(/(\w+)\s+LIKE\s+(.+)/);
        if (match) {
          const [, col, pattern] = match;
          const fieldName = this.convertColumnName(col);
          const patternValue = params[paramIdx++];
          if (typeof patternValue === 'string') {
            // Convert SQL LIKE pattern to MongoDB regex
            const regexPattern = patternValue.replace(/%/g, '.*').replace(/_/g, '.');
            filter[fieldName] = { $regex: regexPattern, $options: 'i' };
          }
        }
      } else if (condition.includes(' > DATE_SUB')) {
        // Handle DATE_SUB for date comparisons
        const match = condition.match(/(\w+)\s+>\s+DATE_SUB\((.+?),\s+INTERVAL\s+(\d+)\s+(\w+)\)/);
        if (match) {
          const [, col, dateRef, interval, unit] = match;
          const fieldName = this.convertColumnName(col);
          const dateValue = params[paramIdx++];
          const date = new Date(dateValue);
          // Subtract interval
          if (unit === 'DAY' || unit === 'DAYS') {
            date.setDate(date.getDate() - parseInt(interval));
          } else if (unit === 'HOUR' || unit === 'HOURS') {
            date.setHours(date.getHours() - parseInt(interval));
          }
          filter[fieldName] = { $gt: date };
        }
      } else if (condition.includes(' >= CURDATE()') || condition.includes(' >= ?')) {
        // Handle CURDATE() and date comparisons
        const match = condition.match(/(\w+)\s+>=\s+(CURDATE\(\)|\?)/);
        if (match) {
          const [, col, dateRef] = match;
          const fieldName = this.convertColumnName(col);
          if (dateRef === 'CURDATE()') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filter[fieldName] = { $gte: today };
          } else {
            const dateValue = params[paramIdx++];
            filter[fieldName] = { $gte: new Date(dateValue) };
          }
        }
      } else if (condition.includes(' > NOW()')) {
        // Handle NOW() for current timestamp comparisons
        const match = condition.match(/(\w+)\s+>\s+NOW\(\)/);
        if (match) {
          const [, col] = match;
          const fieldName = this.convertColumnName(col);
          filter[fieldName] = { $gt: new Date() };
        }
      } else if (condition.includes(' >= NOW()')) {
        // Handle >= NOW() for current timestamp comparisons
        const match = condition.match(/(\w+)\s+>=\s+NOW\(\)/);
        if (match) {
          const [, col] = match;
          const fieldName = this.convertColumnName(col);
          filter[fieldName] = { $gte: new Date() };
        }
      }
    });
    
    return filter;
  }

  private parseOrderBy(orderBy: string | undefined): any {
    if (!orderBy) return undefined;
    
    const sort: any = {};
    const parts = orderBy.split(',').map(p => p.trim());
    parts.forEach(part => {
      const [col, dir] = part.split(/\s+/);
      const fieldName = this.convertColumnName(col);
      sort[fieldName] = dir?.toUpperCase() === 'DESC' ? -1 : 1;
    });
    
    return sort;
  }

  private parseValue(value: string): any {
    if (value === 'NOW()' || value === 'CURRENT_TIMESTAMP') {
      return new Date();
    }
    if (value === 'false' || value === 'FALSE') return false;
    if (value === 'true' || value === 'TRUE') return true;
    if (!isNaN(Number(value))) return Number(value);
    // Strip single quotes from string literals (e.g., 'active' -> active)
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1);
    }
    return value;
  }

  private convertColumnName(col: string): string {
    // Remove backticks from SQL identifiers (used for reserved keywords like 'rank')
    const cleaned = col.replace(/`/g, '').trim();
    // Field names are used as-is in MongoDB
    return cleaned;
  }
}

const dbWrapper = new DatabaseWrapper();

// Initialize database schema
export async function initializeDatabase() {
  try {
    await connectDatabase();
    
    // Create indexes for better performance
    const usersCollection = getCollection('users');
    await usersCollection.createIndex({ discord_id: 1 }, { unique: true });
    await usersCollection.createIndex({ roblox_id: 1 });
    await usersCollection.createIndex({ rank: 1 });
    
    const sessionsCollection = getCollection('sessions');
    await sessionsCollection.createIndex({ user_id: 1 });
    await sessionsCollection.createIndex({ token: 1 }, { unique: true });
    await sessionsCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    
    const verificationCodesCollection = getCollection('verification_codes');
    await verificationCodesCollection.createIndex({ user_id: 1 });
    await verificationCodesCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    
    const permissionsCollection = getCollection('permissions');
    await permissionsCollection.createIndex({ user_id: 1, permission_flag: 1 }, { unique: true });
    
    const activityLogsCollection = getCollection('activity_logs');
    await activityLogsCollection.createIndex({ user_id: 1, week_start: 1 }, { unique: true });
    
    const infractionsCollection = getCollection('infractions');
    await infractionsCollection.createIndex({ user_id: 1 });
    
    const ticketsCollection = getCollection('tickets');
    await ticketsCollection.createIndex({ discord_channel_id: 1 }, { unique: true });
    await ticketsCollection.createIndex({ claimed_by: 1 });
    
    const trackedChannelsCollection = getCollection('tracked_channels');
    await trackedChannelsCollection.createIndex({ discord_channel_id: 1 }, { unique: true });
    
    const loaRequestsCollection = getCollection('loa_requests');
    await loaRequestsCollection.createIndex({ user_id: 1 });
    
    const discordMessagesCollection = getCollection('discord_messages');
    
    // OAuth states collection for temporary state storage
    const oauthStatesCollection = getCollection('oauth_states');
    await oauthStatesCollection.createIndex({ state: 1 }, { unique: true });
    await oauthStatesCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    await discordMessagesCollection.createIndex({ discord_message_id: 1 }, { unique: true });
    await discordMessagesCollection.createIndex({ user_id: 1, created_at: 1 });
    await discordMessagesCollection.createIndex({ discord_channel_id: 1, created_at: 1 });
    
    console.log('MongoDB database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export database instance and helper functions
export { dbWrapper as db };
// getCollection is already exported above

// Helper functions for direct MongoDB operations (for complex queries)
export async function query(collectionName: string, filter: Filter<any> = {}, options: any = {}) {
  const collection = getCollection(collectionName);
  if (options.count) {
    return await collection.countDocuments(filter);
  }
  let cursor = collection.find(filter);
  if (options.sort) {
    cursor = cursor.sort(options.sort);
  }
  if (options.limit) {
    cursor = cursor.limit(options.limit);
  }
  return await cursor.toArray();
}

export async function dbGet(collectionName: string, filter: Filter<any> = {}) {
  const collection = getCollection(collectionName);
  return await collection.findOne(filter);
}

export async function dbRun(collectionName: string, operation: 'insert' | 'update' | 'delete', data: any) {
  const collection = getCollection(collectionName);
  if (operation === 'insert') {
    const result = await collection.insertOne(data);
    return { insertedId: result.insertedId, acknowledged: result.acknowledged };
  } else if (operation === 'update') {
    const { filter, update } = data;
    const result = await collection.updateOne(filter, update);
    return { modifiedCount: result.modifiedCount, acknowledged: result.acknowledged };
  } else if (operation === 'delete') {
    const result = await collection.deleteOne(data);
    return { deletedCount: result.deletedCount, acknowledged: result.acknowledged };
  }
}

export async function dbAll(collectionName: string, filter: Filter<any> = {}, options: any = {}) {
  const collection = getCollection(collectionName);
  let cursor = collection.find(filter);
  if (options.sort) {
    cursor = cursor.sort(options.sort);
  }
  if (options.limit) {
    cursor = cursor.limit(options.limit);
  }
  return await cursor.toArray();
}
