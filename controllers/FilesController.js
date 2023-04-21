import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
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

    const { name } = request.body;
    const { type } = request.body;
    const parentId = request.body.parentId || 0;
    const isPublic = request.body.isPublic || false;
    let data = '';
    if (type === 'file' || type === 'image') {
      data = request.body.data;
      if (!data) return response.status(400).send({ error: 'Missing data' });
    }

    if (!name) {
      return response.status(400).send({ error: 'Missing name' });
    }

    const typeOfType = ['folder', 'file', 'image'];
    if (!type || !typeOfType.includes(type)) {
      return response.status(400).send({ error: 'Missing type' });
    }

    if (parentId === request.body.parentId) {
      const file = await dbClient.db.collection('files').findOne({ name, parentId });
      if (!file) {
        return response.status(400).send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const userId = user._id;
    await dbClient.db.collection('files').insertOne({ userId });
    let newFile = {};
    let findFile = {};
    if (type === 'folder') {
      newFile = await dbClient.db.collection('files').insertOne({
        name, type, parentId, isPublic, data,
      });
      newFile.insertedId;
      const newValues = { $set: { userId } };
      await dbClient.db.collection('files').updateOne(findFile, newValues);
      findFile = await dbClient.db.collection('files').findOne({ name });
      return response.status(201).send(findFile);
    }
    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    const folderName = `${path}/${uuidv4()}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recurisve: true });
    }

    const content = Buffer.from(data, 'base64').toString('ascii');
    fs.writeFile(folderName, content, (err) => {
      if (err) console.log(err);
    });
    await dbClient.db.collection('files').insertOne({
      name, type, parentId, isPublic, data,
    });
    findFile = await dbClient.db.collection('files').findOne({ name });
    return response.status(200).send(findFile);
  }
}

export default FilesController;
