"use strict";
angular.module("gh.sunburst", ["uri-templates", "d3charts.sunburst"])
.constant("githubHeaders", {
  "Accept": "application/vnd.github.v3+json",
  "User-Agent": "vogelsgesang"
})
.constant("githubUrls", {
  repository_url: "https://api.github.com/repos/{owner}/{repo}"
})
.controller("ghSunburstController", function($scope, $http, $q, $window, uriTemplate, githubHeaders, githubUrls) {
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
    loadTree($scope.repository.owner, $scope.repository.repo)
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
  function loadTree(owner, repo) {
    return $http.get(uriTemplate(githubUrls.repository_url).fillFromObject({owner:owner, repo:repo}))
      .then(function(response) {
        var repositoryData = response.data;
        return $http.get(uriTemplate(repositoryData.git_refs_url).fillFromObject({sha: "heads/"+repositoryData.default_branch}));
      })
      .then(function(response) {
        var headRef = response.data;
        if(headRef.object.type == "commit") {
          return $http.get(headRef.object.url);
        } else {
          return $q.reject(new Error("ref does not reference a commit"));
        }
      })
      .then(function(response) {
        var commit = response.data;
        return $http.get(commit.tree.url, {params: {recursive: 1}});
      })
      .then(function(response) {
        return extractTree(response.data.tree);
      });
    function extractTree(ghTree) {
      function extractSubtree(children) {
        var children = _.groupBy(children, function(child) {return child.path.substr(0, child.path.indexOf("/"))});
        var directChildren = children[""] !== undefined ? children[""] : [];
        delete children[""];
        children = _.map(children, function(subtree, path) {
          var children = _.map(subtree, function(c) {
            c.path = c.path.substr(c.path.indexOf("/")+1);
            return c;
          });
          return {
            path: path,
            children: extractSubtree(children)
          };
        });
        children = children.concat(directChildren);
        return children;
      };
      var blobs = _.where(ghTree, {type: "blob"});
      var tree = extractSubtree(blobs);
      return {
        path: "/",
        children: tree
      };
    }
  }
});
