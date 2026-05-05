const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { port, nodeEnv } = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const rateLimiter = require('./middleware/rateLimiter');
const analyzeRouter = require('./routes/analyze');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(requestLogger(nodeEnv));

app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

app.get('/health', async (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptime_seconds: Number(process.uptime().toFixed(2)),
    environment: nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/analyze', rateLimiter, analyzeRouter);

app.use((req, res, next) => {
  const notFoundError = new Error('Route not found');
  notFoundError.status = 404;
  notFoundError.code = 'NOT_FOUND';
  return next(notFoundError);
});

app.use(errorHandler);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Fake-News-Shield backend listening on port ${port} in ${nodeEnv} mode`);
});
