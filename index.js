
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
  const storage2 = new Storage({ projectId, keyFilename });
  
  const io = socketIo(server, {
    cors: {
        origin: 'https://powderblue-donkey-924959.hostingersite.com/', // Cambia esto al origen de tu frontend
        methods: ['GET', 'POST'],
        credentials: true // Si necesitas enviar cookies o encabezados de autorización
    }
});

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
  


async function uploadFile(bucketName, file, fileOutputName) { 
    try {
        const bucket = storage2.bucket(bucketName);
        const ret = await bucket.upload(file, {
            destination: fileOutputName,
        });
        return ret;
    } catch (err) {
        console.error('Error al subir el archivo:', err);
        throw new Error('Error al subir el archivo'); // Lanza un error para manejarlo en el endpoint
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
      storage: multer.diskStorage({
          destination: (req, file, cb) => {
              cb(null, path.join(__dirname, 'uploads'));
          },
          filename: (req, file, cb) => {
              cb(null, Date.now() + path.extname(file.originalname));
          },
      }),
  });
  
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  app.post('/upload', upload.single('photo'), async (req, res) => {
      try {
          if (!req.file) {
              return res.status(400).send('No se ha subido ninguna foto.');
          }
     //     const filePath = `http://localhost:3000/uploads/${req.file.filename}`;
          const filePath = `https://powderblue-donkey-924959.hostingersite.com/uploads/${req.file.filename}`;
          io.emit('receiveImage', filePath);
          await uploadFile(process.env.BUCKETNAME, `./uploads/${req.file.filename}`, req.file.filename);
          res.status(200).json({ filePath });
      } catch (error) {
          console.error('Error al procesar la carga:', error);
          res.status(500).send('Error interno del servidor');
      }
  });
  
  // Iniciar el servidor
  server.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });