import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { validate } from '../middleware/validation';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), (req, res) => {
  const { username, password } = req.body;

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin';

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: 'admin', role: 'admin' },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  res.json({ token, expiresIn: '24h' });
});
