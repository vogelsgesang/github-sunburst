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
      //we need to keep a copy of the tree since d3.layout.partion modifies the
      //the tree (adds some properties) and I do not want to expose these
      //changes to the user of this directive.
      var hierarchyCopy = _.cloneDeep(scope.hierarchy);
      //watch the variables and adjust chart if necessary
      scope.$watch("hierarchy", function(newHierarchy) {
        hierarchyCopy = _.cloneDeep(scope.hierarchy);
        redraw();
      });
      scope.$watch("valueFunction", function(newValueFunction) {
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
          .attr("viewBox", "-1, -1, 2, 2")
          .attr("preserveAspectRatio", "xMinYMin meet")
      var mainGroup = svg.append("g");
      
      //redraws the chart
      function redraw() {
        //adjust the basic layout
        partition.size([2*Math.PI, 1]);;
        if(hierarchyCopy) {
          var segmentsData = partition.nodes(hierarchyCopy);
          var segments = mainGroup.datum(hierarchyCopy).selectAll("path")
              .data(_.filter(segmentsData, function(d) {return !!d.parent;}));
          //UPDATE
          segments.transition()
            .duration(1000)
            .attrTween("d", arcTween);
          //ENTER
          segments.enter().append("path")
            .each(storeForTransition);
          //UPDATE + ENTER
          segments.attr("d", arc)
              .attr("d", arc)
              .style("fill", function(d) {return colorScale(d.path);})
              .style("display", function(d) {return d.parent ? "block":"none";})
              .attr("title", _.property("path"));
          //EXIT
          segments.exit().remove();
        } else {
          mainGroup.selectAll("path").remove();
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
