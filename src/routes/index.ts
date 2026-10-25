import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import fashionRoutes from './fashion.routes';
import eventRoutes from './event.routes';
import requestRoutes from './request.routes';
import notificationRoutes from './notification.routes';
import storyRoutes from './story.routes';
import adminRoutes from './admin.routes';
import chatRoutes from './chat.routes';
import deviceRoutes from './device.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/fashion', fashionRoutes);
router.use('/events', eventRoutes);
router.use('/requests', requestRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/stories', storyRoutes);
router.use('/chat', chatRoutes);
router.use('/devices', deviceRoutes);

export default router;
