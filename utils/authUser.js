import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default async function getUserByToken(request, response) {
  const token = request.headers['x-token'];
  const key = `auth_${token}`;
  let userIId = await redisClient.get(key);
  if (!userIId) {
    return response.status(401).send({ error: 'Unauthorized' });
  }
  userIId = userIId.slice(1, -1);

  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userIId) });
  if (!user) {
    return response.status(401).send({ error: 'Unauthorized' });
  }
  return user;
}
