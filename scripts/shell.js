const {execSync} = require('child_process');

module.exports = function shell (cmd)
{
  try {
    execSync(cmd, {stdio: [0,1,2]});
    return 0;
  }
  catch (err) {return 1}
}

