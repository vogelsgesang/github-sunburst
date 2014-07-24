module.exports = function(grunt) {
  "use strict";
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      build: ['build/*']
    },
    copy: {
      build: {
        files: [
          {expand: true, cwd: 'app', src:'css/**', dest: 'build'},
          {expand: true, cwd: 'app', src:'js/lib/**', dest: 'build'}
        ]
      }
    },
    htmlmin: {
      build: {
        options: {
          removeComments: true,
          collapseWhitespace: true,
          conservativeCollapse: true
        },
        files: [
          {expand: true, cwd: 'app', src: ['index.html'], dest: 'build'}
        ]
      }
    },
    jshint: {
      all: {
        src: ["app/js/*.js"],
        options: {
          ignores: ["app/js/uri-templates.js"],
          strict: true,
          undef: true,
          eqeqeq: true,
          browser: true,
          globals: {
            "_": true,
            "angular": true,
            "d3": true,
            "console": true
          }
        }
      }
    },
    uglify: {
      build: {
        files: [
          {expand: true, cwd: 'app', src: ['js/*.js'], dest: 'build'}
        ],
        options: {
          sourceMap: true,
          sourceMapIncludeSources: true
        }
      }
    },
    githooks: {
      all: {
        'pre-commit': 'jshint',
        options: {
          template: 'hooks/staged-only.js.hb'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-githooks');

  grunt.registerTask('default', [
    'clean:build',
    'copy:build',
    'htmlmin:build',
    'uglify:build'
  ]);
};
