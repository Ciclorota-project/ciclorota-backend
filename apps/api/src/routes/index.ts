import { Router } from 'express';
import { uploadCheckpointImages, uploadProfileAvatar } from '../config/upload.js';
import { requireAdmin, requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { AdminController } from '../controllers/AdminController.js';
import { AuthController } from '../controllers/AuthController.js';
import { CertificateController } from '../controllers/CertificateController.js';
import { CheckinController } from '../controllers/CheckinController.js';
import { CheckpointController } from '../controllers/CheckpointController.js';
import { ProfileController } from '../controllers/ProfileController.js';
import { ProgressController } from '../controllers/ProgressController.js';
import { SettingsController } from '../controllers/SettingsController.js';

const routes = Router();
const adminController = new AdminController();
const authController = new AuthController();
const checkpointController = new CheckpointController();
const checkinController = new CheckinController();
const progressController = new ProgressController();
const certificateController = new CertificateController();
const profileController = new ProfileController();
const settingsController = new SettingsController();

routes.get('/', (request, response) => {
  response.json({ mensagem: 'Bem-vindo à API do Passaporte da Ciclorota! 🚴‍♂️' });
});

routes.post('/auth/login', authController.login.bind(authController));
routes.post('/auth/refresh', authController.refresh.bind(authController));
routes.get('/auth/me', requireAuth, authController.me.bind(authController));
routes.delete('/me/account', requireAuth, authController.deleteMyAccount.bind(authController));

routes.get('/checkpoints', checkpointController.index.bind(checkpointController));

// Rota pública de verificação: qualquer pessoa (sem login) pode confirmar
// a autenticidade de um certificado escaneando o QR ou digitando o código.
routes.get('/certificates/verify/:code', certificateController.verify.bind(certificateController));

routes.get('/me/profile', requireAuth, profileController.showMe.bind(profileController));
routes.put('/me/profile', requireAuth, profileController.updateMe.bind(profileController));
routes.post('/me/profile/avatar', requireAuth, uploadProfileAvatar, profileController.uploadMyAvatar.bind(profileController));
routes.get('/me/progress', requireAuth, progressController.showMe.bind(progressController));
routes.post('/me/checkins', requireAuth, checkinController.storeMe.bind(checkinController));
routes.post('/me/certificates', requireAuth, certificateController.storeMe.bind(certificateController));
routes.get('/me/certificates/pdf', requireAuth, certificateController.downloadMe.bind(certificateController));

routes.get('/admin/settings', requireAdmin, settingsController.show.bind(settingsController));
routes.patch('/admin/settings', requireSuperAdmin, settingsController.update.bind(settingsController));
routes.get('/admin/overview', requireAdmin, adminController.overview.bind(adminController));
routes.get('/admin/users', requireAdmin, adminController.users.bind(adminController));
routes.get('/admin/users/:userId', requireAdmin, adminController.showUser.bind(adminController));
routes.patch('/admin/users/:userId', requireAdmin, adminController.updateUser.bind(adminController));
routes.get('/admin/checkins', requireAdmin, adminController.checkins.bind(adminController));
routes.get('/admin/checkpoints', requireAdmin, checkpointController.adminIndex.bind(checkpointController));
routes.post('/admin/checkpoints', requireAdmin, checkpointController.store.bind(checkpointController));
routes.patch('/admin/checkpoints/:checkpointId', requireAdmin, checkpointController.update.bind(checkpointController));
routes.delete('/admin/checkpoints/:checkpointId', requireAdmin, checkpointController.destroy.bind(checkpointController));
routes.get('/admin/checkpoints/:checkpointId/qr.png', requireAdmin, checkpointController.getQrImage.bind(checkpointController));
routes.get('/admin/checkpoints/:checkpointId/images', requireAdmin, checkpointController.listImages.bind(checkpointController));
routes.post('/admin/checkpoints/:checkpointId/images', requireAdmin, uploadCheckpointImages, checkpointController.addImages.bind(checkpointController));
routes.delete('/admin/checkpoints/:checkpointId/images/:imageId', requireAdmin, checkpointController.deleteImage.bind(checkpointController));
routes.get('/admin/certificates', requireAdmin, certificateController.adminIndex.bind(certificateController));
routes.post('/admin/certificates/:userId/issue', requireAdmin, certificateController.adminIssue.bind(certificateController));
routes.get('/admin/certificates/:userId/pdf', requireAdmin, certificateController.downloadByUser.bind(certificateController));

routes.post('/checkins', requireAuth, checkinController.store.bind(checkinController));
routes.get('/progress/:userId', requireAuth, progressController.show.bind(progressController));
routes.post('/certificates', requireAuth, certificateController.store.bind(certificateController));
routes.get('/profiles/:userId', requireAuth, profileController.show.bind(profileController));
routes.put('/profiles/:userId', requireAuth, profileController.update.bind(profileController));

export default routes;
