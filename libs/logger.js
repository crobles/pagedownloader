const config = require('config');
const winston = require('winston');
const rfr = require('rfr');
const process = require('process');
const { combine, timestamp, printf } = require('logform').format;
const appInsights = require('applicationinsights');
const { ApplicationInsightsTransport } = require('winston-application-insights-transport');
const shouldPushToAppInsights = config.get('loggerWinston.APPINSIGHTS_INSTRUMENTATIONKEY');
const at = rfr('libs/at');

let logger;
const isProduction = 'production' === process.env.NODE_ENV;
const logLevel = (process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : config.get('loggerWinston.logLevel');
appInsights.setup(shouldPushToAppInsights).start();

if (isProduction) {
  logger = winston.createLogger({
    level: logLevel || 'error',
    format: combine(
      timestamp(),
      printf(o => `${o.timestamp} [${o.level}] ${o.message}`)
    ),
    transports: [
      new ApplicationInsightsTransport({client:appInsights.defaultClient}),
    ],
  });
} else {
  // only show logs on the console in `development`
  logger = winston.createLogger({
    level: logLevel || 'debug',
    format: combine(
      winston.format.colorize(),
      timestamp(),
      printf(o => `[${o.level}] ${o.message}`)
    ),
    transports: [
      new winston.transports.Console(),
    ],
    exceptionHandlers: [
      new winston.transports.Console(),
    ],
  });
}
const logLevels = [ 'error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly' ];

if(process.env.NODE_ENV === 'test') {
  module.exports = { log:logLevels.reduce((o, level) => {
    o[level] = msg => console.log(msg);
    return o;
  }, {})};
} else {
  module.exports = { log:logLevels.reduce((o, level) => {
    o[level] = msg => logger[level](at(msg, 3));
    return o;
  }, {})};
}

