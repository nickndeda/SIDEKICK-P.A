import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource-variable/inter';

import App from './app';

import '../index.css';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/global.css';
import './styles/sidebar.css';
import './styles/topbar.css';
import './styles/dashboard.css';

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);