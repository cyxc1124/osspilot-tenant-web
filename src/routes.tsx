import { Navigate, Route, Routes } from 'react-router-dom';
import AuditGuard from './components/auth/AuditGuard';
import AuthGuard from './components/auth/AuthGuard';
import TenantAdminGuard from './components/auth/TenantAdminGuard';
import AppLayout from './components/layout/AppLayout';
import BucketLayout from './components/layout/BucketLayout';
import AuditPage from './pages/Audit/AuditPage';
import BucketCorsPage from './pages/BucketCors/BucketCorsPage';
import BucketPolicyPage from './pages/BucketPolicy/BucketPolicyPage';
import BucketsPage from './pages/Buckets/BucketsPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import FilesPage from './pages/Files/FilesPage';
import FilePreviewPage from './pages/Preview/FilePreviewPage';
import LoginPage from './pages/Login/LoginPage';
import OfficeEditorPage from './pages/Editor/OfficeEditorPage';
import TextEditorPage from './pages/Editor/TextEditorPage';
import ShareLandingPage from './pages/Share/ShareLandingPage';
import TrashPage from './pages/Trash/TrashPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/s/:token" element={<ShareLandingPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="buckets" element={<BucketsPage />} />
          <Route path="buckets/:bucketName" element={<BucketLayout />}>
            <Route index element={<FilesPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route element={<TenantAdminGuard />}>
              <Route path="policy" element={<BucketPolicyPage />} />
              <Route path="cors" element={<BucketCorsPage />} />
            </Route>
          </Route>
          <Route path="buckets/:bucketName/preview" element={<FilePreviewPage />} />
          <Route path="editor/office" element={<OfficeEditorPage />} />
          <Route path="editor/text" element={<TextEditorPage />} />
          <Route element={<AuditGuard />}>
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
