const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./src/middlewares/errorMiddleware');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

app.use('/api/auth', authRoutes);
const regionRoutes = require('./src/routes/regionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const visitRoutes = require('./src/routes/visitRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

app.use('/api/regions', regionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reports', reportRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
