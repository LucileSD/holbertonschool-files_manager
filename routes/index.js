import express from 'express';
import bodyParser from 'body-parser';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

router.get('/status', AppController.getStatus);

router.get('/stats', AppController.getStats);

router.post('/users', bodyParser.json(), (request, response) => {
  UsersController.postNew(request, response);
});

export default router;
