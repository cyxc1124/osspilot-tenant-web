import { BrowserRouter } from 'react-router-dom';
import AuthBootstrap from './components/auth/AuthBootstrap';
import AppRoutes from './routes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <AppRoutes />
    </BrowserRouter>
  );
}
