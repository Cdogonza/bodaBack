const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const { Storage } = require('@google-cloud/storage');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'https://powderblue-donkey-924959.hostingersite.com', 
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const projectId = process.env.PROYECTID;
const keyFilename = process.env.KEYFILENAME;
const bucketName = process.env.BUCKETNAME;
const storage = new Storage({ projectId, keyFilename });
const bucket = storage.bucket(bucketName);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Asegurar que la carpeta 'uploads' existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configuración de multer
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        },
    }),
});

// Listar archivos en Google Cloud Storage
async function listFiles() {
    try {
        const [files] = await bucket.getFiles();
        return files
            .filter(file => /\.(jpg|jpeg|png)$/i.test(file.name))
            .map(file => `https://storage.googleapis.com/${bucketName}/${file.name}`);
    } catch (err) {
        console.error('Error al listar archivos:', err);
        return [];
    }
}

// Endpoint para obtener imágenes
app.get('/api/images', async (req, res) => {
    try {
        const images = await listFiles();
        res.json(images);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener imágenes' });
    }
});

// Subir archivo a Google Cloud Storage
async function uploadFile(localFilePath, destination) {
    try {
        await bucket.upload(localFilePath, { destination });
        return `https://storage.googleapis.com/${bucketName}/${destination}`;
    } catch (err) {
        console.error('Error al subir el archivo:', err);
        throw new Error('Error al subir el archivo');
    }
}

// Subir imagen
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se ha subido ninguna foto.' });

        const localFilePath = path.join(uploadsDir, req.file.filename);
        const cloudUrl = await uploadFile(localFilePath, req.file.filename);

        io.emit('receiveImage', cloudUrl);
        res.json({ filePath: cloudUrl });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la carga' });
    }
});

// WebSocket
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    socket.on('sendImage', (imageData) => {
        io.emit('receiveImage', imageData);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
