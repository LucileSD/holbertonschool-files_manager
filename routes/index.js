import express from 'express';
import bodyParser from 'body-parser';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

router.get('/status', AppController.getStatus);

router.get('/stats', AppController.getStats);

router.post('/users', bodyParser.json(), (request, response) => {
  UsersController.postNew(request, response);
});

router.get('/connect', (request, response) => {
  AuthController.getConnect(request, response);
});

router.get('/disconnect', (request, response) => {
  AuthController.getDisconnect(request, response);
});

router.get('/users/me', (request, response) => {
  UsersController.getMe(request, response)
});

router.post('/files', bodyParser.json(), (req, res) => {
  FilesController.postUpload(req, res);
});

router.get('/files/:id', (request, response) => {
  FilesController.getShow(request, response);
});

router.get('/files', (request, response) => {
  FilesController.getIndex(request, response);
});

router.put('/files/:id/publish', (request, response) => {
  FilesController.putPublish(request, response);
});

router.put('/files/:id/unpublish', (request, response) => {
  FilesController.putUnpublish(request, response);
});

router.get('/files/:id/data', (request, response) => {
  FilesController.getFile(request, response);
});

export default router;
