const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./src/middlewares/errorMiddleware');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Basic routes
app.get('/', (req, res) => {
  res.send('Atlas-Copco API is running...');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy' });
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
