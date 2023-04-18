import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';

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
}

export default UsersController;
