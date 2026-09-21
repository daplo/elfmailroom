import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {LocaleProvider} from '@elf/shared/i18n';
import App from './App';
const root=document.getElementById('root');const app=<LocaleProvider publicRoutes><App/></LocaleProvider>;
if(root.hasChildNodes())hydrateRoot(root,app);else createRoot(root).render(app);
