import { Route, Routes } from 'react-router-dom';
import AdminApp from './app/AdminApp';
import { CheckpointQrPrint } from './features/checkpoints/CheckpointQrPrint';

export default function App() {
  return (
    <Routes>
      <Route path="/print/checkpoints/:checkpointId" element={<CheckpointQrPrint />} />
      <Route path="/*" element={<AdminApp />} />
    </Routes>
  );
}
