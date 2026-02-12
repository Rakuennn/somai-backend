import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
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
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    }
};

const options = {
    swaggerDefinition,
    apis: ['./src/modules/**/*.ts', './dist/modules/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/docs', swaggerUi.serve, (req: Request, res: Response, next: NextFunction) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    (swaggerSpec as any).servers = [
        { url: `${protocol}://${host}`, description: 'Current server' },
    ];
    swaggerUi.setup(swaggerSpec)(req, res, next);
});
app.use(router);
app.use(errorHandler);

export default app;