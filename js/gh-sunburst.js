"use strict";
angular.module("gh.sunburst", ["d3charts.sunburst", "githubApi"])
.config(function(githubApiProvider) {
  githubApiProvider.userAgent = "vogelsgesang";
})
.controller("ghSunburstController", function($scope, githubApi) {
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
  });
  $scope.keyFunction = function(d) {return d.sha;}

  var reloadTree = $scope.reloadTree = function reloadTree() {
    $scope.status = "loading";
    githubApi.getRepository($scope.repository.owner, $scope.repository.repo)
      .then(function(response) {
        var branch = response.data.default_branch;
        return githubApi.getBranch($scope.repository.owner, $scope.repository.repo, branch);
      }).then(function(response) {
        var sha = response.data.commit.sha;
        return githubApi.getCompleteTree($scope.repository.owner, $scope.repository.repo, sha)
      })
      .then(function(tree) {
        $scope.status = "ready";
        $scope.extractedTree = tree;
      })
      .then(null, function(e) {
        $scope.status = "error";
        console.log(e);
      });
  };
  reloadTree();
});
