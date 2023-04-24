import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import getUserByToken from '../utils/authUser';

class FilesController {
  static async postUpload(request, response) {
    const user = await getUserByToken(request, response);

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
    let newFile = {};
    let findFile = {};
    if (type === 'folder') {
      newFile = await dbClient.db.collection('files').insertOne({
        userId, name, type, parentId, isPublic, data,
      });

      findFile = await dbClient.db.collection('files').findOne({ name });
      return response.status(201).send({
        id: newFile.insertedId, userId, name, type, parentId, isPublic, data,
      });
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
    newFile = await dbClient.db.collection('files').insertOne({
      userId, name, type, parentId, isPublic, data,
    });
    findFile = await dbClient.db.collection('files').findOne({ name });
    return response.status(201).send({
      id: newFile.insertedId, userId, name, type, parentId, isPublic, data,
    });
  }

  static async getShow(request, response) {
    const user = await getUserByToken(request, response);
    const userId = user._id;
    const { id } = request.params;
    const findFile = await dbClient.db.collection('files').findOne({ _id: id, userId });
    if (!findFile) {
      response.status(404).send({ error: 'Not found' });
    }
    return findFile;
  }

  static async getIndex(request, response) {
    const user = await getUserByToken(request, response);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const parentId = request.query.parentId || 0;
    const findFile = await dbClient.db.collection('files').findOne({ parentId });
    if (!findFile) {
      return response.status(200).send([]);
    }
    const page = request.query.page || 0;
    const agg = { $and: [{ parentId }] };
    let aggData = [{ $match: agg }, { $skip: page * 20 }, { $limit: 20 }];
    if (parentId === 0) aggData = [{ $skip: page * 20 }, { $limit: 20 }];
    console.log(aggData);
    const pageFiles = await dbClient.db.collection('files').aggregate(aggData);
    const files = [];
    await pageFiles.forEach((file) => {
      const fileObj = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };
      files.push(fileObj);
    });
    return response.status(200).send(files);
  }

  static async getFile(request, response) {
    const { id } = request.params;
    const file = dbClient.db.collection('files').findOne({ id });
    if (!file) {
      response.status(404).send({ error: 'Not found' });
    }
    if (file.isPublic === 'false') {
      return response.status(404).send({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return response.status(400).send({ error: 'A folder doesn\'t have content' });
    }
  }
}

export default FilesController;
