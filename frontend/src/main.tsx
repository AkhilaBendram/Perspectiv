import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App';
import Upload from './pages/Upload';
import InsightsPage from './pages/InsightsPage';
import DashBoard from './pages/DashBoard';

import './styles/index.css';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/upload', element: <Upload /> },
  { path: '/insights', element: <InsightsPage /> },
  { path: '/dashboard', element: <DashBoard /> },
  { path: '*', element: <App /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
