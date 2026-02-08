import cors from 'cors';
import express, { Application } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import router from './router';
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Express API',
        version: '1.0.0',
        description: 'REST API with TypeScript',
        license: {
            name: 'Licensed Under MIT',
            url: 'https://spdx.org/licenses/MIT.html',
        },
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development server',
        },
    ],
};

const options = {
    swaggerDefinition,
    apis: ['./src/modules/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(router);
app.use(errorHandler);

export default app;