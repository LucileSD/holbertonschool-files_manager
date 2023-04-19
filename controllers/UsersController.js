import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import BSON from 'mongodb';

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
    const id = new ObjectId(user.insertedId);
    return response.status(201).send({ id, email });
  }

  static async getMe(request, response) {
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    console.log(`user: ${userId}`);
    const objectId = ObjectId(userId.insertedId);
    console.log(`objectId: ${objectId}`);
    console.log(`ObjectId: ${ObjectId("643e670f2af91f142956ef6b")}`)
   
    const user = await dbClient.db.collection('users').findOne({ _id: objectId });
    console.log(user)
    console.log(user.email)
    console.log(user._id)
    if(!user) {
      return response.status(401).send({ error: 'Unauthorized'});
    }
    return response.send({ email: user.email, id: user._id });
  }
}

export default UsersController;
