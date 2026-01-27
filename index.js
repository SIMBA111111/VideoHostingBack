// index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';

const app = express();
const port = 8080;

app.use(cors({ /* ... */ }));

app.use(express.static('public'));

import routesVideo from './routes/videos.js';
app.use('/api', routesVideo);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
