import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { getToken } from "@/lib/api";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import RedirectDetail from "@/pages/RedirectDetail";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const RequireAuth = () => (getToken() ? <Outlet /> : <Navigate to="/login" replace />);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/redirects/:id" element={<RedirectDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </QueryClientProvider>
  );
}
