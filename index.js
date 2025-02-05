const {Storage} = require('@google-cloud/storage');
require('dotenv').config();

const projectId = process.env.PROYECTID;
const keyFilename = process.env.KEYFILENAME;
const storage = new Storage({projectId, keyFilename});

async function uploadFile(backetName,file,fileOutputName){ 
    try{
 
        const bucket = storage.bucket(backetName);
        const ret = await bucket.upload(file, {
            destination: fileOutputName,
        });
return ret;
    }catch(err){
        console.log(err);
    }
}
(async () => {
    const ret =  uploadFile(process.env.BUCKETNAME,'uploads/1738480477933.jpeg','coding.txt');
})();