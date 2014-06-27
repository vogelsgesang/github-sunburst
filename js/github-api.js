"use strict";
(function() {
  angular.module("githubApi", ["uri-templates"])
  .provider("githubApi", function() {
    this.$get = function($http, uriTemplate) {
      if(this.userAgent === undefined) {
        throw new Error("githubApi: User-Agent was not initialized");
      }
      var githubApi = {};
      var repositoryUrl = "https://api.github.com/repos/{owner}/{repo}";
      var httpHeaders = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "vogelsgesang"
      }
      //extracts a nice tree structure from the github response
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
          //the "tree" objects are grouped into the corresponding directory
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
        return extractSubtree(_.cloneDeep(ghTree), []);
      }
      githubApi.loadTree = function loadTree(owner, repo) {
        return $http.get(uriTemplate(repositoryUrl).fillFromObject({owner:owner, repo:repo}))
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
      }
      return githubApi;
    }
  });
})();
