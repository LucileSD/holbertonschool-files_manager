import UsersController from ('./UsersController');

class FilesController {
  static async postUpload(request, response) {
    const user = await UsersController.getMe(request, response);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    const { name } = request.body;
    const { type } = request.body;
    const parentId = request.body.parentId || 0;
    const isPublic = request.body.isPublic || false;

    if (type == 'file' || type == 'image') {
      const data = request.body.data;
      if (!data) return response.status(400).send({ error: 'Missing data' });
    }

    if (!name) {
      return response.status(400).send({ error: 'Missing name' });
    }

    const typeOfType = ['folder', 'file', 'image'];
    if (!type || !typeOfType.includes(type)) {
      return response.status(400).send({ error: 'Missing type' });
    }

    if (parentId != 0) {
      
    }
  }
}

export default FilesController;
