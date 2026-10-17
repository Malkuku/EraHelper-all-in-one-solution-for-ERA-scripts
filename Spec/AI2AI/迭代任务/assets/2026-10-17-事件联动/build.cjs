const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = process.cwd();
const req = createRequire(path.join(root, 'package.json'));
const webpack = req('webpack');
const { VueLoaderPlugin } = req('vue-loader');
const entry = fs.readFileSync(path.join(__dirname,'entry-fixture.ts'),'utf8');
fs.writeFileSync(path.join(__dirname,'entry.ts'),entry);
webpack({mode:'development',entry:path.join(__dirname,'entry.ts'),context:root,output:{path:__dirname,filename:'bundle.js'},devtool:false,
resolve:{extensions:['.ts','.js','.vue'],alias:{'@':path.join(root,'src')},modules:['node_modules',path.join(root,'node_modules')]},resolveLoader:{modules:['node_modules',path.join(root,'node_modules')]},
module:{rules:[{test:/\.vue$/,loader:'vue-loader'},{test:/\.ts$/,loader:'ts-loader',options:{transpileOnly:true,configFile:path.join(root,'tsconfig.json'),appendTsSuffixTo:[/\.vue$/]}},{test:/\.s?css$/,use:['style-loader','css-loader','sass-loader']}]},
plugins:[new VueLoaderPlugin(),new webpack.DefinePlugin({__VUE_OPTIONS_API__:false,__VUE_PROD_DEVTOOLS__:false,__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:false})],optimization:{minimize:false}},(error,stats)=>{if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;}else{fs.writeFileSync(path.join(__dirname,'index.html'),'<!doctype html><meta charset="UTF-8"><style>body{margin:0;font:14px Arial}*{box-sizing:border-box}</style><div id="app"></div><script src="bundle.js"></script>'); console.log('UI fixture built');}});




