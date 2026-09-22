import React from 'react';
import App from './App';
import {BlogArticle,BlogIndex} from './Blog';

export function routeFromPath(pathname='/'){
 const path=pathname.replace(/^\/(?:de|es|fr|pl)(?=\/|$)/,'');
 if(/^\/blog\/?$/.test(path))return {type:'blog'};
 const match=/^\/blog\/([^/]+)\/?$/.exec(path);
 return match?{type:'article',slug:match[1]}:{type:'landing'};
}
export default function Site({pathname=typeof location==='undefined'?'/':location.pathname}){const route=routeFromPath(pathname);if(route.type==='blog')return <BlogIndex/>;if(route.type==='article')return <BlogArticle slug={route.slug}/>;return <App/>}
