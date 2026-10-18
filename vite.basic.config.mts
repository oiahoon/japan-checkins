import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('basic'),envDir:false,envPrefix:'BASIC_PUBLIC_',base:process.env.BASIC_BASE_PATH||'./',publicDir:path.resolve('public'),plugins:[react()],resolve:{alias:{'next/dynamic':path.resolve('basic/dynamic.tsx'),'next/link':path.resolve('basic/link.tsx')}},build:{outDir:path.resolve('dist-basic'),emptyOutDir:true},server:{host:'127.0.0.1',port:3022}});
