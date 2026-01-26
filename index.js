import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors'

const app = express();
const port = 8080;

// Middleware
app.use(express.json());

app.use(cors({
    origin: '*', // Разрешаем все домены (для разработки)
    // Для продакшена лучше указать конкретные домены:
    // origin: ['http://localhost:3000', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true, // Разрешаем передачу кук и авторизационных заголовков
    optionsSuccessStatus: 200
}));

app.use(express.static('public'))


// Импортируем все роуты
import routesVideo from './routes/videos.js'

// Подключаем роуты
app.use(routesVideo);

// Запуск сервера
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Available endpoints:`);
    console.log(`  GET /api/videos - Get video list`);
    console.log(`  GET /api/videos/:id - Get specific video`);
    console.log(`  Static files served from /public`);
})