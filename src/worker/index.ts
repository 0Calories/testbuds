import 'dotenv/config';
import { startHttpServer } from './http';

const PORT = Number(process.env.WORKER_PORT ?? 5174);

startHttpServer({ port: PORT });
