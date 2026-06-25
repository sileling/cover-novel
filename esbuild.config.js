const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: [path.resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node14',
  sourcemap: false,
  minify: true,
  treeShaking: true,
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('[esbuild] Watching for changes...');
  } else {
    const result = await esbuild.build(config);
    if (result.errors.length > 0) {
      console.error('[esbuild] Build failed:', result.errors);
      process.exit(1);
    }
    console.log('[esbuild] Build succeeded → dist/extension.js');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
