// routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import fashionRoutes from './fashion.routes';
import eventRoutes from './event.routes';
import requestRoutes from './request.routes';
import notificationRoutes from './notification.routes';
import storyRoutes from './story.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/fashion', fashionRoutes);
router.use('/events', eventRoutes);
router.use('/requests', requestRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/stories', storyRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: 'connected',
      redis: process.env.REDIS_HOST ? 'connected' : 'disabled'
    }
  });
});

export default router;
