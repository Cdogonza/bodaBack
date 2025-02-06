
  const express = require('express');
  const multer = require('multer');
  const cors = require('cors');
  const fs = require('fs');
  const path = require('path');
  require('dotenv').config();
  const http = require('http');
  const socketIo = require('socket.io');
  const app = express();
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(app);
  
  // Google Cloud Storage
  const { Storage } = require('@google-cloud/storage');
  const projectId = process.env.PROYECTID;
  const keyFilename = process.env.KEYFILENAME;
  const storage = new Storage({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
});

const cors = require('cors');
app.use(cors({
    origin: '*',  // O reemplázalo con tu frontend
    methods: ['GET', 'POST'],
    credentials: true
}));

  const io = socketIo(server, {
    cors: {
        origin: 'https://powderblue-donkey-924959.hostingersite.com', // Cambia esto al origen de tu frontend
        methods: ['GET', 'POST'],
        credentials: true // Si necesitas enviar cookies o encabezados de autorización
    }
});
const corsOptions = {
    origin: ['https://powderblue-donkey-924959.hostingersite.com', 'http://localhost:4200'],
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

    next();
  });
  async function listFiles(bucketName) {
      try {
          const [files] = await storage2.bucket(bucketName).getFiles();
          console.log(`Archivos en el bucket ${bucketName}:`);
          return files.filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png'));
      } catch (err) {
          console.error('Error al listar archivos:', err);
          return [];
      }
  }
  
  const bucketName = process.env.BUCKETNAME;
  


  async function uploadFile(fileBuffer, fileName) {
    try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.save(fileBuffer);
        return `https://storage.googleapis.com/${bucketName}/${fileName}`;
    } catch (err) {
        console.error('Error al subir el archivo:', err);
        throw new Error('Error al subir el archivo');
    }
}


  app.get('/api/images', async (req, res) => {
      const imagesDir = path.join(__dirname, 'uploads');
      try {
          const files = await fs.promises.readdir(imagesDir);
          const cloudFiles = await listFiles(bucketName);
          res.json({ localFiles: files, cloudFiles });
      } catch (err) {
          return res.status(500).send('Error reading images directory');
      }
  });
  
  const upload = multer({
    storage: multer.memoryStorage(), // Almacena la imagen en memoria en lugar de en disco
});

  
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se ha subido ninguna foto.' });

        const cloudUrl = await uploadFile(req.file.buffer, req.file.originalname);

        io.emit('receiveImage', cloudUrl);
        res.json({ filePath: cloudUrl });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la carga' });
    }
});

  
  // Iniciar el servidor
  server.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });