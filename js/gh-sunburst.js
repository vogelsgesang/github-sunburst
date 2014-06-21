"use strict";
angular.module("gh.sunburst", ['uri-templates'])
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
    repo: "jsonview"
  };
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
})
.directive("sunburst", function($window) {
  return {
    restrict: "E",
    scope: {
      hierarchy: "=",
    },
    link: function(scope, element, attrs) {
      //read the initial width
      scope.width = element[0].offsetWidth;
      //listen for resize events
      $window.addEventListener("resize", function() {
        scope.width = element[0].offsetWidth;
        scope.$apply();
      });

      //we need to keep a copy of the tree since d3.layout.partion modifies the
      //the tree (adds some properties) and I do not want to expose these
      //changes to the user of this directive.
      var hierarchyCopy = _.cloneDeep(scope.hierarchy);
      //watch the variables and redraw chart if necessary
      scope.$watch("hierarchy", function(newHierarchy) {
        hierarchyCopy = _.cloneDeep(scope.hierarchy);
        redraw();
      });
      scope.$watch("width", function() {
        redraw();
      });

      //create the d3 instances which are reused
      var colorScale = d3.scale.category20b();
      var partition = d3.layout.partition()
        .sort(null)
        .size([1, 1])
        .value(function(d) { return 1; });
      //create the SVG skeleton
      var svg = d3.select(element[0])
        .append("svg")
          .style("width", "100%");
      var mainGroup = svg.append("g");
      
      function redraw() {
        //adjust the basic layout
        var width = scope.width;
        var height = width;
        partition.size([width, height]);
        svg.style("height", height+"px");
        //mainGroup.attr("transform", "translate(" + width/2 + "," + height/2 + ")");
        if(hierarchyCopy) {
          mainGroup.selectAll("*").remove();
          var path = mainGroup.datum(hierarchyCopy).selectAll("rect")
              .data(partition.nodes);
          path.exit().remove();
          path.enter().append("rect")
              .attr("x", _.property("x"))
              .attr("y", _.property("y"))
              .attr("width", _.property("dx"))
              .attr("height", _.property("dy"))
              .style("fill", function(d) {return colorScale(d.path)})
              .attr("title", _.property("path"));
        } else {
          mainGroup.selectAll("*").remove();
        }
      }

    }
  }
});
