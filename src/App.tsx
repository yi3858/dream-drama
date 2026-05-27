import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import SplashScreen from '@/components/common/SplashScreen';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RechargeModalProvider } from '@/contexts/RechargeModalContext';
import { useFaviconAnimation } from '@/hooks/use-favicon-animation';

import MainLayout from '@/components/layouts/MainLayout';
import ProfileLayout from '@/components/layouts/ProfileLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NovelToComicPage from '@/pages/NovelToComicPage';
import VideoToAnimePage from '@/pages/VideoToAnimePage';
import ShowcasePage from '@/pages/ShowcasePage';
import TrendingPage from '@/pages/TrendingPage';
import AnalysisPage from '@/pages/AnalysisPage';
import PricingPage from '@/pages/PricingPage';
import AgentPage from '@/pages/AgentPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import DashboardPage from '@/pages/DashboardPage';

import ProfileOverview from '@/pages/profile/ProfilePage';
import WalletPage from '@/pages/profile/WalletPage';
import InvitePage from '@/pages/profile/InvitePage';
import RechargePage from '@/pages/profile/RechargePage';
import OrdersPage from '@/pages/profile/OrdersPage';
import CreditLogsPage from '@/pages/profile/CreditLogsPage';
import WorksPage from '@/pages/profile/WorksPage';
import GenerationRecordsPage from '@/pages/profile/GenerationRecordsPage';
import PromotePage from '@/pages/profile/PromotePage';
import SupportPage from '@/pages/profile/SupportPage';
import BindEmailPage from '@/pages/profile/BindEmailPage';
import NotificationsPage from '@/pages/profile/NotificationsPage';
import AgentCenterPage from '@/pages/profile/AgentCenterPage';
import AgentPromotionsPage from '@/pages/profile/AgentPromotionsPage';
import AgentPointsDetailPage from '@/pages/profile/AgentPointsDetailPage';
import AgentWithdrawApplyPage from '@/pages/profile/AgentWithdrawApplyPage';
import AgentWithdrawalsPage from '@/pages/profile/AgentWithdrawalsPage';

import AdminIndexPage from '@/pages/admin/IndexPage';
import AdminUsersPage from '@/pages/admin/UsersPage';
import AdminCreditsPage from '@/pages/admin/CreditsPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';
import AdminOrdersPage from '@/pages/admin/OrdersPage';
import AdminContentReviewPage from '@/pages/admin/ContentReviewPage';
import AdminAgentSettingsPage from '@/pages/admin/AgentSettingsPage';
import AdminWorksPage from '@/pages/admin/WorksPage';
import AdminSystemConfigPage from '@/pages/admin/SystemConfigPage';
import AdminStylesPage from '@/pages/admin/StylesPage';
import AdminCharactersPage from '@/pages/admin/CharactersPage';
import AdminPointSettingsPage from '@/pages/admin/PointSettingsPage';
import AdminInvitesPage from '@/pages/admin/InvitesPage';
import AdminChannelsPage from '@/pages/admin/ChannelsPage';
import AdminPricingPage from '@/pages/admin/PricingPage';
import CharactersPage from '@/pages/CharactersPage';
import AdMakerPage from '@/pages/AdMakerPage';
import TextToImagePage from '@/pages/TextToImagePage';
import ImageToVideoPage from '@/pages/ImageToVideoPage';
import MotionTransferPage from '@/pages/MotionTransferPage';

const App: React.FC = () => {
  useFaviconAnimation();

  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <RechargeModalProvider>
            <SplashScreen />
            <IntersectObserver />
            <Routes>
              {/* 主布局路由 */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/novel-to-comic" element={<NovelToComicPage />} />
                <Route path="/video-to-anime" element={<VideoToAnimePage />} />
                <Route path="/showcase" element={<ShowcasePage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/agent" element={<AgentPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/ad-maker" element={<AdMakerPage />} />
                <Route path="/text-to-image" element={<TextToImagePage />} />
                <Route path="/image-to-video" element={<ImageToVideoPage />} />
                <Route path="/motion-transfer" element={<MotionTransferPage />} />
              </Route>

              {/* 独立页面（无主布局） */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* 个人中心（嵌套侧边栏布局） */}
              <Route path="/profile" element={<ProfileLayout />}>
                <Route index element={<ProfileOverview />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="invite" element={<InvitePage />} />
                <Route path="recharge" element={<RechargePage />} />
                <Route path="credits" element={<CreditLogsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="works" element={<WorksPage />} />
                <Route path="generation-records" element={<GenerationRecordsPage />} />
                <Route path="promote" element={<PromotePage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="bind-email" element={<BindEmailPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="agent" element={<AgentCenterPage />} />
                <Route path="agent/promotions" element={<AgentPromotionsPage />} />
                <Route path="agent/points" element={<AgentPointsDetailPage />} />
                <Route path="agent/withdraw" element={<AgentWithdrawApplyPage />} />
                <Route path="agent/withdrawals" element={<AgentWithdrawalsPage />} />
              </Route>

              {/* 管理后台 */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminIndexPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="credits" element={<AdminCreditsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="review" element={<AdminContentReviewPage />} />
                <Route path="agents" element={<AdminAgentSettingsPage />} />
                <Route path="works" element={<AdminWorksPage />} />
                <Route path="points" element={<AdminPointSettingsPage />} />
                <Route path="invites" element={<AdminInvitesPage />} />
                <Route path="config" element={<AdminSystemConfigPage />} />
                <Route path="styles" element={<AdminStylesPage />} />
                <Route path="characters" element={<AdminCharactersPage />} />
                <Route path="pricing" element={<AdminPricingPage />} />
                <Route path="channels" element={<AdminChannelsPage />} />
              </Route>

              {/* 订单详情（独立页面，无主导航遮挡二维码） */}
              <Route element={<MainLayout />}>
                <Route path="/orders/:orderNo" element={<OrderDetailPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </RechargeModalProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};


export default App;
