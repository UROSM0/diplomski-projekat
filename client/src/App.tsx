import { Navigate, Route, Routes } from "react-router-dom";
import { IAdAPI } from "./api/ads/IAdAPI";
import { AdAPI } from "./api/ads/AdAPI";
import { AuthPage } from "./pages/AuthPage";
import { IAuthAPI } from "./api/auth/IAuthAPI";
import { AuthAPI } from "./api/auth/AuthAPI";
import { ITransactionAPI } from "./api/transactions/ITransactionAPI";
import { TransactionAPI } from "./api/transactions/TransactionAPI";
import { IUserAPI } from "./api/users/IUserAPI";
import { UserAPI } from "./api/users/UserAPI";
import { IChatAPI } from "./api/chat/IChatAPI";
import { ChatAPI } from "./api/chat/ChatAPI";
import { IAuditAPI } from "./api/audit/IAuditAPI";
import { AuditAPI } from "./api/audit/AuditAPI";
import { ProtectedRoute } from "./components/protected_route/ProtectedRoute";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChatPage } from "./pages/ChatPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { MarketplaceAllPage } from "./pages/marketplace/MarketplaceAllPage";
import { MarketplaceAdDetailsPage } from "./pages/marketplace/MarketplaceAdDetailsPage";
import { MarketplaceCreatePage } from "./pages/marketplace/MarketplaceCreatePage";
import { MarketplaceFavoritesPage } from "./pages/marketplace/MarketplaceFavoritesPage";
import { MarketplaceLayout } from "./pages/marketplace/MarketplaceLayout";
import { MarketplaceModerationPage } from "./pages/marketplace/MarketplaceModerationPage";

const auth_api: IAuthAPI = new AuthAPI();
const user_api: IUserAPI = new UserAPI();
const ad_api: IAdAPI = new AdAPI();
const transaction_api: ITransactionAPI = new TransactionAPI();
const chat_api: IChatAPI = new ChatAPI();
const audit_api: IAuditAPI = new AuditAPI();

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="admin,manager,user">
              <DashboardPage userAPI={user_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute requiredRole="admin,manager,user">
              <TransactionsPage userAPI={user_api} transactionAPI={transaction_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsersPage userAPI={user_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute requiredRole="admin">
              <AuditLogsPage auditAPI={audit_api} userAPI={user_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute requiredRole="admin,manager,user">
              <ChatPage userAPI={user_api} chatAPI={chat_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute requiredRole="admin,manager,user">
              <ChatPage userAPI={user_api} chatAPI={chat_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute requiredRole="admin,manager,user">
              <NotificationsPage userAPI={user_api} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute requiredRole="admin,manager,user">
              <MarketplaceLayout userAPI={user_api} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="all" replace />} />
          <Route path="all" element={<MarketplaceAllPage userAPI={user_api} adAPI={ad_api} />} />
          <Route
            path="ads/:adId"
            element={<MarketplaceAdDetailsPage userAPI={user_api} adAPI={ad_api} transactionAPI={transaction_api} chatAPI={chat_api} />}
          />
          <Route path="create" element={<MarketplaceCreatePage adAPI={ad_api} />} />
          <Route path="favorites" element={<MarketplaceFavoritesPage userAPI={user_api} adAPI={ad_api} />} />
          <Route path="moderation" element={<MarketplaceModerationPage adAPI={ad_api} userAPI={user_api} />} />
        </Route>
        <Route path="/" element={<AuthPage authAPI={auth_api} />} />
      </Routes>
    </>
  );
}

export default App;
