const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const mime = require('mime-types');
const { ObjectId } = require('mongodb');
const fileQueue = require('../utils/fileQueue');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  // Method to handle file or folder upload
  static async postUpload(req, res) {
    try {
      const {
        name, type, parentId = 0, isPublic = false, data,
      } = req.body;

      // Retrieve the user based on the token
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate required fields
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
      }
      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Validate parentId if set
      if (parentId !== 0) {
        const parentFile = await dbClient.db.collection('files').findOne({
          _id: parseInt(parentId, 10),
        });
        if (!parentFile) { return res.status(400).json({ error: 'Parent not found' }); }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Prepare file data to save in DB
      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId,
      };

      if (type === 'folder') {
        // Save folder in DB
        const result = await dbClient.db.collection('files').insertOne(newFile);
        return res.status(201).json({ id: result.insertedId, ...newFile });
      }

      // Handle file or image creation
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileUUID = uuidv4();
      const filePath = path.join(folderPath, fileUUID);

      try {
        // Create folder if it doesn't exist
        await fs.mkdir(folderPath, { recursive: true });

        // Decode base64 and save file to disk
        const fileData = Buffer.from(data, 'base64');
        await fs.writeFile(filePath, fileData);

        // Set localPath for the file document
        newFile.localPath = filePath;

        // Save file document in DB
        const result = await dbClient.db.collection('files').insertOne(newFile);

        // If the file is an image, add a job to the queue for thumbnail generation
        if (type === 'image') {
          await fileQueue.add({ userId, fileId: result.insertedId });
        }

        return res.status(201).json({ id: result.insertedId, ...newFile });
      } catch (error) {
        // Delete partially created file if an error occurs
        await fs.unlink(filePath);
        console.error('Error saving file:', error);
        return res.status(500).json({ error: 'Could not save file' });
      }
    } catch (error) {
      console.error('Error in postUpload:', error);
      return res.status(500).json({ error: 'Could not save file' });
    }
  }

  // Method to retrieve a file by ID
  static async getShow(req, res) {
    console.log('Received request at /files');
    try {
      const { id } = req.params;
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await dbClient.db.collection('files').findOne({
        _id: parseInt(id, 10),
        userId,
      });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file);
    } catch (error) {
      console.error('Error retrieving file:', error);
      return res.status(500).json({ error: 'Could not retrieve file' });
    }
  }

  // Method to list files with pagination
  static async getIndex(req, res) {
    try {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { parentId = 0, page = 0 } = req.query;
      const pageSize = 20;
      const skip = parseInt(page, 10) * pageSize;

      // Validate parentId if set
      const parentIdInt = parseInt(parentId, 10);
      if (Number.isNaN(parentIdInt)) {
        return res.status(400).json({ error: 'Invalid parentId' });
      }

      const files = await dbClient.db
        .collection('files')
        .aggregate([
          { $match: { userId, parentId: parentIdInt } },
          { $skip: skip },
          { $limit: pageSize },
        ])
        .toArray();

      return res.json(files);
    } catch (error) {
      console.error('Error retrieving files:', error);
      return res.status(500).json({ error: 'Could not retrieve files' });
    }
  }

  // Method to get the content of a file by ID
  static async getFileContent(req, res) {
    try {
      const { id } = req.params;
      const { size } = req.query; // Get size from query parameter
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(404).json({ error: 'Not found' });
      }

      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: parseInt(id, 10) });
      if (!file || (!file.isPublic && file.userId !== userId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      try {
        let filePath = file.localPath;
        if (size) {
          filePath = `${filePath}_${size}`; // Append size to the path
        }

        const fileContent = await fs.readFile(filePath);
        const mimeType = mime.lookup(file.name) || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        return res.send(fileContent);
      } catch (error) {
        console.error('Error reading file content:', error);
        return res.status(404).json({ error: 'Not found' });
      }
    } catch (error) {
      console.error('Error retrieving file:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Method to Publish a file
  static async putPublish(req, res) {
    try {
      const { id } = req.params;
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(id),
        userId,
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(id) },
        { $set: { isPublic: true } },
      );

      const updatedFile = await dbClient.db.collection('files').findOne({
        _id: ObjectId(id),
      });

      return res.status(200).json(updatedFile);
    } catch (error) {
      console.error('Error publishing file:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Method to Unpublish a file
  static async putUnpublish(req, res) {
    try {
      const { id } = req.params;
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(id),
        userId,
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(id) },
        { $set: { isPublic: false } },
      );

      const updatedFile = await dbClient.db.collection('files').findOne({
        _id: ObjectId(id),
      });

      return res.status(200).json(updatedFile);
    } catch (error) {
      console.error('Error unpublishing file:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = FilesController;
