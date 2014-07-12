"use strict";
angular.module("gh.sunburst", ["d3charts.sunburst", "githubApi"])
.config(function(githubApiProvider) {
  githubApiProvider.userAgent = "vogelsgesang";
})
.controller("ghSunburstController", function($scope, $q, githubApi) {
  function changeRepository(newOwner, newRepo) {
    $scope.status = "loading";
    $scope.repository = {
      owner: newOwner,
      repo: newRepo
    };
    var repositoryPromise = githubApi.getRepository($scope.repository.owner, $scope.repository.repo);
    var branchListPromise = githubApi.listBranches($scope.repository.owner, $scope.repository.repo);
    $q.all([repositoryPromise, branchListPromise])
      .then(function([generalInfo, branches]) {
        $scope.repository.generalInfo = generalInfo;
        $scope.repository.branches = branches;
        $scope.repository.selectedBranch = _.where(branches, {name: generalInfo.default_branch})[0];
        $scope.status = "ready";
      })
      .catch(function(e) {
        $scope.status = "error";
        console.log(e);
      });
  }
  changeRepository("vogelsgesang", "jsonview");

  $scope.$watch("repository.selectedBranch", function(newBranch) {
    if(newBranch !== undefined) {
      $scope.status = "loading";
      var sha = newBranch.commit.sha;
      return githubApi.getCompleteTree($scope.repository.owner, $scope.repository.repo, sha)
        .then(function(tree) {
          $scope.extractedTree = tree;
          $scope.status = "ready";
        })
        .catch(function(e) {
          $scope.status = "error";
          console.log(e);
        });
    }
  });

  $scope.valueDimension = "count";
  $scope.$watch("valueDimension", function(dim) {
    if(dim == "size") {
      $scope.valueFunction = function(d) {return d.size;}
    } else {
      $scope.valueFunction = function(d) {return 1;}
    }
  });
  $scope.keyFunction = function(d) {return d.path.join("/");}
});
