import React from 'react';
import {renderToString} from 'react-dom/server';
import {LocaleProvider} from '@elf/shared/i18n';
import Site from './Site';
export function render(language,pathname='/'){return renderToString(<LocaleProvider initialLanguage={language} publicRoutes><Site pathname={pathname}/></LocaleProvider>)}
