"use strict";
angular.module("gh.sunburst", ['uri-templates'])
.constant("githubHeaders", {
  "Accept": "application/vnd.github.v3+json",
  "User-Agent": "vogelsgesang"
})
.constant("githubUrls", {
  repository_url: "https://api.github.com/repos/{owner}/{repo}"
})
.controller("ghSunburstController", function($scope, $http, $q, uriTemplate, githubHeaders, githubUrls) {
  $scope.repository = {
    owner: "vogelsgesang",
    repo: "jsonview"
  };
  $http.get(uriTemplate(githubUrls.repository_url).fillFromObject($scope.repository))
    .then(function(response) {
      var repositoryData = response.data;
      $scope.repository.data = repositoryData;
      console.log(uriTemplate(repositoryData.git_refs_url).fillFromObject({sha: "heads/"+repositoryData.default_branch}));
      return $http.get(uriTemplate(repositoryData.git_refs_url).fillFromObject({sha: "heads/"+repositoryData.default_branch}));
    })
    .then(function(response) {
      var headRef = response.data;
      $scope.headRef = headRef;
      if(headRef.object.type == "commit") {
        return $http.get(headRef.object.url);
      } else {
        return $q.reject(new Error("ref does not reference a commit"));
      }
    })
    .then(function(response) {
      var commit = response.data;
      $scope.headCommit = commit;
      return $http.get(commit.tree.url, {params: {recursive: 1}});
    })
    .then(function(response) {
      var tree = response.data;
      $scope.tree = tree;
    })
    .then(null,console.log);
});

