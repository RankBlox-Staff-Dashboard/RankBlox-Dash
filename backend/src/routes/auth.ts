// Implementation of rate limiting for authentication routes
import express from 'express';
import rateLimit from 'express-rate-limit';

const authRouter = express.Router();

// Updated rate limiting: Increase limit to 200 requests per 10 minutes
const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes in milliseconds
  max: 200, // Limit each IP to 200 requests per `window` (here, per 10 minutes)
  message: "Too many requests, please try again later."
});

authRouter.use(authRateLimiter);

authRouter.post('/login', (req, res) => {
  // login logic here
  res.send('Login successful');
});

authRouter.post('/register', (req, res) => {
  // registration logic here
  res.send('Registration successful');
});

export default authRouter;