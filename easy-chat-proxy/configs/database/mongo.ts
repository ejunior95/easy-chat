import { MongoClient, Db } from 'mongodb';

let cachedDb: Db | null = null;

export async function connectToDatabase(uri: string) {
  if (cachedDb) return cachedDb;
  
  const client = await MongoClient.connect(uri, { 
    connectTimeoutMS: 5000,
    maxPoolSize: 10 
  });
  
  const db = client.db('easychat_logs');
  cachedDb = db;
  return db;
}