const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
//const AuthController = require('../controllers/AuthController');
//const FilesController = require('../controllers/FilesController');

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);

// Auth routes
//router.get('/connect', AuthController.getConnect);
//router.get('/disconnect', AuthController.getDisconnect);
//router.get('/users/me', UsersController.getMe);

// File Controller
//router.post('/files', FilesController.postUpload);
//router.get('/files/:id', FilesController.getShow);
//router.get('/files', FilesController.getIndex);
//router.get('/files/:id/data', FilesController.getFileContent);
//router.put('/files/:id/publish', FilesController.putPublish); // New route
//router.put('/files/:id/unpublish', FilesController.putUnpublish); // New route

module.exports = router;

