import { createHashRouter, RouterProvider, NavigateOptions } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { DemoPage } from '../pages/DemoPage';
import { PreviewPage } from '../pages/PreviewPage';
import { NotFoundPage } from '../pages/NotFoundPage';

const router = createHashRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/neon-lab',
    element: <PreviewPage />,
  },
  {
    path: '/demos',
    element: <DemoPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

/**
 * AppRouter component that provides the router context to the app.
 */
export function AppRouter() {
  return <RouterProvider router={router} />;
}

export { router };
