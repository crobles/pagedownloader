const fs = require('fs');
const rfr = require('rfr');
const storageUrl = rfr('storage/url');
const dirname = './docs/';

fs.readdir(dirname, (err, filenames) => {
  if (err) {
    console.error(err);
    return;
  }
  filenames.forEach((filename) => {
    fs.readFile(`${dirname}${filename}`, 'utf-8', (err, content) => {
      if (err) {
        console.error(err);
        return;
      }
      storageUrl.uploadUrl(filename, content, (err) => {
        if (err) {
          console.error(err);
        }
      });
    });
    fs.unlink(`${dirname}${filename}`, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });
  console.log('Carga de archivos finalizada');
});
