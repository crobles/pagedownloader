const rfr = require('rfr');
const st = rfr('storage/storage');
const bucketName = 'mm-input-store';
const config = require('config');
const gcpConf = config.get('gcp');
const bucket = st.storage.bucket(bucketName);

const uploadUrl = (filename, urlData, callback) => {
  let folderFile = `${gcpConf.bucketFolder}/${filename}`;
  let file = bucket.file(folderFile);
  let stream = file.createWriteStream();
  stream.on('error', callback);
  stream.on('finish', () => {
    callback(null);
  });
  stream.end(urlData);
};

module.exports = {
  uploadUrl
};
