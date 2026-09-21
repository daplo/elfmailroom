import React from 'react';
import {renderToString} from 'react-dom/server';
import {LocaleProvider} from '@elf/shared/i18n';
import App from './App';
export function render(language){return renderToString(<LocaleProvider initialLanguage={language} publicRoutes><App/></LocaleProvider>)}
