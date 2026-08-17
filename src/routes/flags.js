const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const { getFlags, listFlags, createFlag, updateFlag, deleteFlag } = require('../controllers/flagsController');

const publicFlagsRouter = express.Router();
publicFlagsRouter.get('/', getFlags);

const adminFlagsRouter = express.Router();
adminFlagsRouter.use(requireAdminKey);
adminFlagsRouter.get('/', listFlags);
adminFlagsRouter.post('/', createFlag);
adminFlagsRouter.patch('/:key', updateFlag);
adminFlagsRouter.delete('/:key', deleteFlag);

module.exports = { publicFlagsRouter, adminFlagsRouter };
