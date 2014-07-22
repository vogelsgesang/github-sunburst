"use strict";
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      build: ['build']
    },
    copy: {
      build: {
        files: [
          {expand: true, cwd: 'app', src:'js/**', dest: 'build'},
          {expand: true, cwd: 'app', src:'css/**', dest: 'build'}
        ]
      }
    },
    htmlmin: {
      build: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: [{
          expand: true,
          cwd: 'app',
          src: ['index.html'],
          dest: 'build'
        }]
      }
    },
    jshint: {
      all: ["app/js/*.js"]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', [
    'jshint',
    'clean:build',
    'copy:build',
    'htmlmin:build'
  ]);
};
