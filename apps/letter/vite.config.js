import { defineConfig } from 'vite';
export default defineConfig({base:'/write/',publicDir:'../../public',server:{proxy:{'/api':'http://localhost:3001'}}});
