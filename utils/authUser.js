import { ObjectId } from 'mongodb';
import dbClient from './db';
import redisClient from './redis';

export default async function getUserByToken(request, response) {
  const token = request.headers['x-token'];
  const key = `auth_${token}`;
  let userIId = await redisClient.get(key);
  if (!userIId) {
    return undefined;
  }

  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userIId) });

  return user;
}
