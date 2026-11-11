import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/require-auth'
import { RequirePermission } from '@/components/require-permission'
import { AppLayout } from '@/layouts/app-layout'
import { AuthProvider } from '@/lib/auth'
import LoginPage from '@/pages/auth/login'
import DashboardPage from '@/pages/dashboard'
import DestinationsPage from '@/pages/destinations'
import DestinationFormPage from '@/pages/destinations/form'
import NotFoundPage from '@/pages/not-found'
import PostFormPage from '@/pages/posts/form'
import PostsPage from '@/pages/posts'
import PublicBlogDetailPage from '@/pages/public/blog/detail'
import PublicBlogListPage from '@/pages/public/blog/list'
import PublicMapPage from '@/pages/public/map'

function ProtectedShell() {
    return (
        <RequireAuth>
            <AppLayout>
                <Outlet />
            </AppLayout>
        </RequireAuth>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<PublicMapPage />} />
                    <Route path="/blog" element={<PublicBlogListPage />} />
                    <Route path="/blog/:slug" element={<PublicBlogDetailPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedShell />}>
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route
                            path="posts"
                            element={
                                <RequirePermission permission="blog:read">
                                    <PostsPage />
                                </RequirePermission>
                            }
                        />
                        <Route
                            path="posts/new"
                            element={
                                <RequirePermission permission="blog:write">
                                    <PostFormPage />
                                </RequirePermission>
                            }
                        />
                        <Route
                            path="posts/:id/edit"
                            element={
                                <RequirePermission permission="blog:write">
                                    <PostFormPage />
                                </RequirePermission>
                            }
                        />
                        <Route
                            path="destinations"
                            element={
                                <RequirePermission permission="destination:read">
                                    <DestinationsPage />
                                </RequirePermission>
                            }
                        />
                        <Route
                            path="destinations/new"
                            element={
                                <RequirePermission permission="destination:write">
                                    <DestinationFormPage />
                                </RequirePermission>
                            }
                        />
                        <Route
                            path="destinations/:id/edit"
                            element={
                                <RequirePermission permission="destination:write">
                                    <DestinationFormPage />
                                </RequirePermission>
                            }
                        />
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}
