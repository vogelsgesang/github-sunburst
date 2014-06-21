"use strict";
angular.module("d3charts.sunburst", [])
.directive("sunburst", function($window) {
  return {
    restrict: "E",
    scope: {
      hierarchy: "=",
      valueFunction: "="
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
      scope.$watch("valueFunction", function(newValueFunction) {
        console.log(newValueFunction);
        if(newValueFunction) {
          partition.value(newValueFunction);
        } else {
          partition.value(function(d) {return 1;});
        }
        redraw();
      });

      //create the d3 instances which are reused
      var colorScale = d3.scale.category20();
      var partition = d3.layout.partition()
        .sort(null)
        .size([1, 1])
        .value(function(d) { return 1; });
      var arc = d3.svg.arc()
        .startAngle(function(d) { return d.x; })
        .endAngle(function(d) { return d.x + d.dx; })
        .innerRadius(function(d) { return Math.sqrt(d.y); })
        .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });
      //create the SVG skeleton
      var svg = d3.select(element[0])
        .append("svg")
          .style("width", "100%");
      var mainGroup = svg.append("g");
      
      //redraws the chart
      function redraw() {
        //adjust the basic layout
        var width = scope.width;
        var height = width;
        var radius = width/2;
        partition.size([2*Math.PI, radius*radius]);
        svg.style("height", height+"px");
        mainGroup.attr("transform", "translate(" + radius + "," + radius + ")");
        if(hierarchyCopy) {
          var path = mainGroup.datum(hierarchyCopy).selectAll("path")
              .data(partition.nodes);
          //UPDATE
          path.transition()
            .duration(1000)
            .attrTween("d", arcTween);
          //ENTER
          path.enter().append("path")
            .each(storeForTransition);
          //UPDATE + ENTER
          path.attr("d", arc)
              .attr("d", arc)
              .style("fill", function(d) {return colorScale(d.path);})
              .style("display", function(d) {return d.parent ? "block":"none";})
              .attr("title", _.property("path"));
          //EXIT
          path.exit().remove();
        } else {
          mainGroup.selectAll("*").remove();
        }
      }
      //saves the values for the transition
      function storeForTransition(d) {
        d._x = d.x;
        d._dx = d.dx;
      }
      // Interpolate the arcs in data space.
      function arcTween(d) {
        var interpolate = d3.interpolate({x: d._x, dx: d._dx}, d);
        return function(t) {
          var b = interpolate(t);
          d._x = b.x;
          d._dx = b.dx;
          return arc(b);
        };
      }
    }
  }
});
