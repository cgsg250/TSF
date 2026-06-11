import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'user/src/main.js', 
  
  output: {
    file: 'user/dist/bundle.js', 
    format: 'iife',    
    sourcemap: true 
  },
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ]
};
