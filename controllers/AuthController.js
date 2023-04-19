import redisClient from "../utils/redis";
import sha1 from 'sha1';
import dbClient from "../utils/db";
import { v4 as uuidv4 } from 'uuid';

class AuthController {
  static async getConnect(request, response) {
    const base64 = request.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');
    const user = await dbClient.db.collection('users').findOne({ email, password:sha1(password) });

    if (!user) {
      return response.status(401).send({ error: 'Unauthorized'});
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, JSON.stringify(user._id), 86400);
    return response.status(200).send({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if(!userId) {
      return response.status(401).send({ error: 'Unauthorized'});
    }
    await redisClient.del(key);
    return response.status(204);
  }
}

export default AuthController;
