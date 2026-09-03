import { Route, Routes } from 'react-router-dom';
import AdminApp from './app/AdminApp';
import { CheckpointQrPrint } from './features/checkpoints/CheckpointQrPrint';
import { CertificateVerifyPage } from './features/certificates/CertificateVerifyPage';
import { EmailConfirmedPage } from './features/auth/EmailConfirmedPage';

export default function App() {
  return (
    <Routes>
      <Route path="/print/checkpoints/:checkpointId" element={<CheckpointQrPrint />} />
      <Route path="/certificates/verify/:code" element={<CertificateVerifyPage />} />
      <Route path="/auth/confirmed" element={<EmailConfirmedPage />} />
      <Route path="/*" element={<AdminApp />} />
    </Routes>
  );
}
