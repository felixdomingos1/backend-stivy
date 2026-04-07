import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/fashion', fashionRoutes);

export default router;
