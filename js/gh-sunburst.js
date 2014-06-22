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
      //extracts a subtree from a set of children
      function extractSubtree(children, subtreePath) {
        //the own tree has an empty path
        var ownTree = _.find(children, {path: ""});
        if(ownTree) {
          _.pull(children, ownTree);
        } else {
          ownTree = {};
        }
        //group by the directory of files
        //the "tree"s are grouped into the corresponding directory
        //(this is the reason for this ternary expression)
        var subtrees = _.groupBy(children, function(child) {
          var i = child.path.indexOf("/");
          return i < 0 && child.type=="tree" ? child.path : child.path.substr(0, i);
        });
        //handle the direct children
        var directChildren = subtrees[""] !== undefined ? subtrees[""] : [];
        _.forEach(directChildren, function(child) {
          child.name = child.path;
          child.path = subtreePath.concat(child.name);
        });
        delete subtrees[""];
        //now, handle the subfolders
        subtrees = _.map(subtrees, function(subtree, pathFragment) {
          //build the subpath
          var subPath = subtreePath.concat([pathFragment])
          //remove the pathFragment form the path of all children
          _.forEach(subtree, function(c) {
            c.path = c.path.substr(pathFragment.length+1);
          });
          //extract the subTree
          return extractSubtree(subtree, subPath);
        });
        //finally, return this level of the tree
        return _.assign(ownTree, {
          path: subtreePath,
          name: subtreePath[subtreePath.length-1],
          children: subtrees.concat(directChildren)
        });
      };
      //the cloneDeep is necessary in order to avoid modifying the passed in ghTree
      return extractSubtree(_.cloneDeep(ghTree), ['/']);
    }
  }
});
