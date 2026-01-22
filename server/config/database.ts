import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/** Create default admin when users collection is empty. Set SEED_DEFAULT_ADMIN=true to enable. */
async function seedDefaultAdmin(database: Db): Promise<void> {
  if (process.env.SEED_DEFAULT_ADMIN !== 'true') return;

  const usersCollection = database.collection('users');
  const count = await usersCollection.countDocuments();
  if (count > 0) return;

  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const plainPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

  await usersCollection.insertOne({
    username: adminUsername,
    password: plainPassword,
    fullName: 'Admin',
    email: '',
    phone: '',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Seeded default admin user "${adminUsername}". Change the password after first login.`);
}

export async function connectToDatabase(): Promise<Db> {
  // Get MongoDB connection variables
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const cluster = process.env.MONGODB_CLUSTER;
  const appName = process.env.MONGODB_APP_NAME || 'restaurant-cluster';
  const dbName = process.env.DB_NAME || 'restaurant';
  const useAtlas = process.env.MONGODB_USE_ATLAS === 'true' || cluster?.includes('.mongodb.net');

  // Check if all required variables are present
  if (!username || !password || !cluster) {
    throw new Error('MongoDB connection variables are missing. Please check MONGODB_USERNAME, MONGODB_PASSWORD, and MONGODB_CLUSTER in your .env file');
  }

  let connectionString: string;

  if (useAtlas) {
    // MongoDB Atlas connection (mongodb+srv://)
    const encodedPassword = encodeURIComponent(password);
    connectionString = `mongodb+srv://${username}:${encodedPassword}@${cluster}/?appName=${appName}`;
  } else {
    // Local MongoDB connection (mongodb://)
    const encodedPassword = encodeURIComponent(password);
    connectionString = `mongodb://${username}:${encodedPassword}@${cluster}/${dbName}?authSource=admin`;
  }

  if (client && db) {
    return db;
  }

  try {
    client = new MongoClient(connectionString);
    await client.connect();
    
    db = client.db(dbName);
    
    console.log(`✅ Connected to database: ${dbName}`);

    await seedDefaultAdmin(db).catch((err) => {
      console.error('❌ Failed to seed default admin:', err);
    });

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}
