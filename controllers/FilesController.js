import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import getUserByToken from '../utils/authUser';

class FilesController {
  static async postUpload(request, response) {
    const user = await getUserByToken(request, response);
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

    if (parentId) {
      const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!file) {
        return response.status(400).send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const userId = user._id;
    let newFile = {};

    if (type === 'folder') {
      newFile = await dbClient.db.collection('files').insertOne({
        userId, name, type, isPublic, parentId: parentId === 0 ? parentId : ObjectId(parentId),
      });

      return response.status(201).send({
        id: newFile.insertedId, userId, name, type, isPublic, parentId,
      });
    }
    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    const folderName = `${path}/${uuidv4()}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recurisve: true });
    }

    const content = Buffer.from(data, 'base64').toString('utf-8');
    fs.writeFile(folderName, content, (err) => {
      if (err) console.log(err);
    });
    newFile = await dbClient.db.collection('files').insertOne({
      userId, name, type, parentId, isPublic, localPath: folderName,
    });

    return response.status(201).send({
      id: newFile.insertedId, userId, name, type, isPublic, parentId,
    });
  }

  static async getShow(request, response) {
    const user = await getUserByToken(request, response);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const userId = user._id;
    const { id } = request.params;
    const findFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId });
    if (!findFile) {
      return response.status(404).send({ error: 'Not found' });
    }
    return response.status(200).send({
      id: findFile._id,
      userId,
      name: findFile.name,
      type: findFile.type,
      isPublic: findFile.isPublic,
      parentId: findFile.parentId,
    });
  }

  static async getIndex(request, response) {
    const user = await getUserByToken(request, response);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const parentId = request.query.parentId || 0;
    const findFile = await dbClient.db.collection('files').findOne({ userId: user._id });
    if (!findFile) {
      return response.status(400).send([]);
    }
    const page = request.query.page || 0;
    const agg = { $and: [{ parentId }] };
    let aggData = [{ $match: agg }, { $skip: page * 20 }, { $limit: 20 }];
    if (parentId === 0) aggData = [{ $skip: page * 20 }, { $limit: 20 }];

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

  static async putPublish(request, response) {
    const { id } = request.params;
    const user = getUserByToken(request, response);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const findFile = dbClient.db.collection('files').findOne({ userId: user._id, _id: ObjectId(id) });
    if (!findFile) {
      response.status(404).send({ error: 'Not found' });
    }
    const newPublic = { $set: { isPublic: true } };
    const query = { userId: user._id, _id: ObjectId(id) };
    await dbClient.db.collection('files').updateOne(query, newPublic);
    const newFindFile = dbClient.db.collection('files').findOne({ userId: user._id, _id: ObjectId(id) });
    return response.status(200).send(newFindFile);
  }

  static async putUnpublish(request, response) {
    const { id } = request.params;
    const user = getUserByToken(request, response);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    const findFile = dbClient.db.collection('files').findOne({ userId: user._id, _id: ObjectId(id) });
    if (!findFile) {
      response.status(404).send({ error: 'Not found' });
    }
    const newPublic = { $set: { isPublic: false } };
    const query = { userId: user._id, _id: ObjectId(id) };
    await dbClient.db.collection('files').updateOne(query, newPublic);
    const newFindFile = dbClient.db.collection('files').findOne({ userId: user._id, _id: ObjectId(id) });
    return response.status(200).send(newFindFile);
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
    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(path)) {
      return response.status(404).send({ error: 'Not Found' });
    }
    const fileName = `${path}/${file.name}`;
    const typeMime = mime.lookup(file.name);
    response.setHeader('Content-Type', typeMime);
    const content = fs.readFileSync(fileName);
    return response.status(200).send(content);
  }
}

export default FilesController;
