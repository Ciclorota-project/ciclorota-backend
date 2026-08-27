import express from 'express';
import cors from 'cors';
import { createCorsOptions, getHealthPayload, getReadinessPayload } from './config/http.js';
import { loadEnvironment } from './config/loadEnv.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import routes from './routes/index.js';

loadEnvironment();

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: '1mb' }));

  app.get(['/health', '/api/health'], (_request, response) => {
    response.json(getHealthPayload());
  });

  app.get(['/ready', '/api/ready'], (_request, response) => {
    const payload = getReadinessPayload();
    response.status(payload.status === 'ready' ? 200 : 503).json(payload);
  });

  app.use('/api', routes);
  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
