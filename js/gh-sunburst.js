"use strict";
angular.module("gh.sunburst", ["d3charts.sunburst", "githubApi"])
.config(function(githubApiProvider) {
  githubApiProvider.userAgent = "vogelsgesang";
})
.controller("ghSunburstController", function($scope, $http, $q, $window, githubApi) {
  $scope.repository = {
    owner: "vogelsgesang",
    repo: "upc-od"
  };
  $scope.valueDimension = "count";
  $scope.$watch("valueDimension", function(dim) {
    if(dim == "size") {
      $scope.valueFunction = function(d) {return d.size;}
    } else {
      $scope.valueFunction = function(d) {return 1;}
    }
  })

  var reloadTree = $scope.reloadTree = function reloadTree() {
    $scope.status = "loading"
    githubApi.loadTree($scope.repository.owner, $scope.repository.repo)
      .then(function(tree) {
        $scope.status = "ready";
        $scope.extractedTree = tree;
      })
      .then(null, function(e) {
        $scope.status = "error";
        console.log(e);
      });
  }
  reloadTree();
});
