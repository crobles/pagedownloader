const {Storage} = require('@google-cloud/storage');
const config = require('config');
const gcp = config.get('gcp');

const storage = new Storage({
  projectId: gcp.projectId,
  keyFilename: gcp.keyFilename
});

module.exports = {
  storage
};
