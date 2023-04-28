import Queue from 'bull';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const fileId = job.data.fileId;
  const userId = job.data.userId;

  if (!fileId) {
    throw Error('Missing fileId');
  }
  if (!userId) {
    throw Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
  if (!file) {
    throw Error('File not found');
  }

  try {
    const thumbnail100 = await imageThumbnail(file.localPath, { width: 100 });
    fs.writeFileSync(`${file.localPath}_100`, thumbnail100);
    const thumbnail250 = await imageThumbnail(file.localPath, { width: 250 });
    fs.writeFileSync(`${file.localPath}_250`, thumbnail250);
    const thumbnail500 = await imageThumbnail(file.localPath, { width: 500 });
    fs.writeFileSync(`${file.localPath}_500`, thumbnail500);
  } catch (err) {
    console.error(err);
  }
})
