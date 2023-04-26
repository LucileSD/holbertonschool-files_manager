import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(request, response) {
    const base64 = request.headers.authorization.split(' ')[1];
    if (!base64) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const credentials = Buffer.from(base64, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');
    if (!email || !password) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').findOne({ email, password: sha1(password) });

    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 86400);
    return response.status(200).send({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    await redisClient.del(key);
    return response.status(204).send();
  }
}

export default AuthController;
