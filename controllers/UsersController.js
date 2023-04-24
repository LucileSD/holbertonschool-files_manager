import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    const { email } = request.body;
    const { password } = request.body;

    if (!email) {
      return response.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return response.status(400).send({ error: 'Missing password' });
    }

    if (await dbClient.db.collection('users').findOne({ email })) {
      return response.status(400).send({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);

    const user = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
    const id = user.insertedId;
    return response.status(201).send({ id, email });
  }

  static async getMe(request, response) {
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    let userId = await redisClient.get(key);
    if (!userId) {
      return response.status(401).send({ error: 'Unauthorized'});
    }
    userId = userId.slice(1, -1);

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if(!user) {
      return response.status(401).send({ error: 'Unauthorized'});
    }
    return response.send({ email: user.email, id: user._id });
  }
}

export default UsersController;
