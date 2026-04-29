import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const router = express.Router();

// This loads your YAML file. Make sure swagger.yaml is in your root directory.
const swaggerDocument = YAML.load('./swagger.yaml');

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;