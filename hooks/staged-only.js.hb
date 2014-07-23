var exec = require('child_process').exec;
var sh = require('execSync').run;

exec('git diff --cached --quiet', function (err, stdout, stderr) {

  // only run if there are staged changes
  // i.e. what you would be committing if you ran "git commit" without "-a" option.
  if (err) {

    sh('git stash --keep-index --quiet');

    exec('{{escapeBackslashes command}}{{#if task}} {{escapeBackslashes task}}{{/if}}{{#if args}} {{{escapeBackslashes args}}}{{/if}}', {
           cwd: '{{escapeBackslashes gruntfileDirectory}}'
         }, function (err, stdout, stderr) {
      
      console.log(stdout);

    sh('git stash pop --quiet');

      var exitCode = 0;
      if (err) {
        console.log(stderr);
        exitCode = -1;
      }{{#unless preventExit}}

      process.exit(exitCode);{{/unless}}
    });
  }

});

