const exec = require('child_process').exec;
const path = require('path');

function execute(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec( command,
      options,
      function (error, stdout, stderr) {
        if (error) {
          return reject({error, stdout, stderr});
        }
        return resolve({stdout, stderr});
      });
  });

}


class NpmZipInstall {
  apply(compiler) {
    compiler.hooks.done.tap('NPM & Zipper Plugin', async (
      stats /* stats is passed as an argument when done hook is tapped.  */
    ) => {
      const distFolder = stats.compilation.outputOptions.path;
      const zipFileName = path.basename(distFolder);
      await execute(`npm install --only=prod`, {cwd: distFolder}).catch(console.error);
      await execute(`zip -r ../${zipFileName}.zip ./*`, {cwd: `${distFolder}`}).catch(console.error);
    });
  }
}



module.exports = NpmZipInstall;
