
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
// const storage = new Storage({
//     projectId: process.env.PROYECTID,
//     keyFilename: process.env.KEYFILENAME // Asegúrate de que el archivo existe en Render
// });



  const io = socketIo(server, {
    cors: {
        origin: 'https://powderblue-donkey-924959.hostingersite.com', // Cambia esto al origen de tu frontend
        methods: ['GET', 'POST'],
        credentials: true // Si necesitas enviar cookies o encabezados de autorización
    }
});
app.use(cors(corsOptions));
const corsOptions = {
    origin: ['https://powderblue-donkey-924959.hostingersite.com', 'http://localhost:4200'],
    methods: ['GET', 'POST'],
    credentials: true,
};



app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

    next();
  });
  
  
  const upload = multer({ storage: multer.memoryStorage() });

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
  
  app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se ha subido ninguna foto.' });
      const cloudUrl = await uploadFile(req.file.buffer, req.file.originalname);
      res.json({ filePath: cloudUrl });
    } catch (error) {
      res.status(500).json({ error: 'Error al procesar la carga' });
    }
  });
  
  module.exports = app;

    server.listen(PORT, () => {
        console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  