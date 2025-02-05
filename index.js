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
const { randomInt } = require('crypto');
const picture = '';
const picName = randomInt(1000000000).toString();
//CLAUD STORAGE
const {Storage} = require('@google-cloud/storage');

require('dotenv').config();

const projectId = process.env.PROYECTID;
const keyFilename = process.env.KEYFILENAME;
const storage2 = new Storage({projectId, keyFilename});


async function listFiles(bucketName) {
    try {
        const [files] = await storage.bucket(bucketName).getFiles();

        console.log(`Archivos en el bucket ${bucketName}:`);
        files.forEach(file => {
            // Filtrar solo imágenes (puedes ajustar las extensiones según sea necesario)
            if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) {
                console.log(file.name);
            }
        });
    } catch (err) {
        console.error('Error al listar archivos:', err);
    }
}
const bucketName = process.env.BUCKETNAME; // Reemplaza con tu nombre de bucket


// Endpoint para obtener todas las fotos
app.get('/a', (req, res) => {
    res.send('hola');
});

app.get('/api/images', (req, res) => {
    const imagesDir = path.join(__dirname, 'uploads');
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading images directory');
        }
        const filess = listFiles(bucketName);
        const images = files.map(file => filess);
        res.json(images);
    });
});



async function uploadFile(backetName,file,fileOutputName){ 
    try{
 
        const bucket = storage2.bucket(backetName);
        const ret = await bucket.upload(file, {
            destination: fileOutputName,
        });
return ret;
    }catch(err){
        console.log(err);
    }
}



// Configuración de CORS para Socket.IO
// const io = socketIo(server, {
//     cors: {
//         origin: 'https://powderblue-donkey-924959.hostingersite.com', // Cambia esto al origen de tu frontend
//         methods: ['GET', 'POST'],
//         credentials: true // Si necesitas enviar cookies o encabezados de autorización
//     }
// });
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:4200/', // Cambia esto al origen de tu frontend
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
// Configuración de Content Security Policy (CSP)
// app.use((req, res, next) => {
//     res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval';"); // Ajusta según tus necesidades
//     next();
// });

io.on('connection', (socket) => {
    console.log('New client connected');

    // Escuchar datos de imagen del cliente
    socket.on('sendImage', (imageData) => {
        // Emitir los datos de la imagen a todos los clientes conectados
        io.emit('receiveImage', imageData);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de multer para la carga de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Agrega un timestamp al nombre del archivo
    },
});

const upload = multer({ storage });

// Endpoint para subir fotos
// app.post('/upload', upload.single('photo'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No se ha subido ninguna foto.');
//     }
 
//     uploadFile(process.env.BUCKETNAME,`./uploads/${req.file.filename}`,req.file.filename);

//     const filePath = `/uploads/${req.file.filename}`;
//     io.emit('receiveImage', `http://localhost:${PORT}${filePath}`);
    
//     res.status(200).json({ filePath });
// });


app.post('/upload', (req, res) => {
    // Lógica para manejar la carga de archivos
    try {
        if (!req.file) {
            return res.status(400).send('No se ha subido ninguna foto.');
        }
     
        uploadFile(process.env.BUCKETNAME,`/${req.file.filename}`,req.file.filename);
    
        const filePath = `${req.file.filename}`;
        io.emit('receiveImage', `https://boda-back.vercel.app/upload${filePath}`);
        
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

