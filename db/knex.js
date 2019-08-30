const config = require('config');
const dbConf = config.get('dbConnection');

const knex = require('knex')({
  client: 'pg',
  searchPath: ['pageDownload'],
  connection: {
    host: dbConf.host,
    port: dbConf.port,
    user: dbConf.user,
    password: dbConf.password,
    database: dbConf.db
  },
  debug: false,
});

knex.table = (table) => {
  const schema = process.env.NODE_ENV === 'test' ? 'test' : dbConf.schema;
  return knex.withSchema(schema).table(table);
};

module.exports = knex;
