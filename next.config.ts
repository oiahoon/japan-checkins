import type {NextConfig} from 'next';
import path from 'node:path';
const nextConfig:NextConfig={
  poweredByHeader:false,
  agentRules:false,
  outputFileTracingIncludes:{'/api/photos/*':['./public/japan-simple.json','./public/china-simple.json','./public/sichuan-cities.json']},
  webpack(config,{webpack}){config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/,path.resolve('lib/no-worker-bindings.ts')));return config;},
  async headers(){return [{source:'/:path*',headers:[{key:'Referrer-Policy',value:'same-origin'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'}]}];},
};
export default nextConfig;
