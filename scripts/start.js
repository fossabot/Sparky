const Bundler = require('parcel-bundler');
const Path = require('path');
const Child = require("child_process");
const entryFiles = Path.join(__dirname, '../src/sparky.ts');

let already_Open = false;

const options = {
    outDir: './.dist',
    publicUrl: './',
    target: "web"
};

(async function() {
  // Initializes a bundler using the entrypoint location and options provided
  const bundler = new Bundler(entryFiles, options);

  bundler.on('bundled', (bundle) => {
      if(already_Open) return;
      Child.exec("npm run jest");
      already_Open = true;
  });

  // Run the bundler, this returns the main bundle
  // Use the events if you're using watch mode as this promise will only trigger once and not for every rebuild
  const bundle = await bundler.bundle();
})();