import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InteractiveBackground } from './components/InteractiveBackground';

import { LandingPage } from './pages/LandingPage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { UploadStatementPage } from './pages/UploadStatementPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex bg-[#EDF1F4] text-[#273869] font-sans selection:bg-[#273869] selection:text-white relative">
          {/* Restrained Interactive Canvas / Pointer Background */}
          <InteractiveBackground />

          {/* Left Sidebar with Dropdown Navigation */}
          <Sidebar
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 z-10">
            <Navbar onMenuToggle={() => setMobileMenuOpen(true)} />
            <main className="flex-1 w-full">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/workbench" element={<WorkbenchPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/upload" element={<UploadStatementPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/account" element={<AccountSettingsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
