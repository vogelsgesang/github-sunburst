"use strict";
angular.module("d3charts.sunburst", [])
.directive("sunburst", function($parse) {
  return {
    restrict: "E",
    scope: {
      hierarchy: "=",
      valueFunction: "="
    },
    link: function(scope, element, attrs) {
      if(attrs.hasOwnProperty("hoveredElement")) {
        var hoveredElementGet = $parse(attrs.hoveredElement);
        var hoveredElementSet = hoveredElementGet.assign;
        hoveredElementSet(scope.$parent, {b: 2});
      }
      //watch the variables and adjust chart if necessary
      scope.$watch("hierarchy", function(newHierarchy) {
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
        .size([2*Math.PI, 1])
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
      var mainGroup = svg.append("g")
          .on("mouseleave", mouseleave);
      
      //redraws the chart
      function redraw() {
        //adjust the basic layout
        if(scope.hierarchy) {
          var segmentsData = partition.nodes(scope.hierarchy);
          var segments = mainGroup.datum(scope.hierarchy).selectAll("path")
              .data(_.filter(segmentsData, function(d) {return !!d.parent;}));
          //ENTER
          segments.enter().append("path")
            .attr("d", arc)
            .on("mouseenter", mouseenter)
          //UPDATE + ENTER
          segments
            .style("fill", function(d) {return colorScale(d.path);})
            .style("display", function(d) {return d.parent ? "block":"none";})
            .attr("title", _.property("path"))
            .transition()
              .duration(1000)
              .attrTween("d", arcTween);
          //EXIT
          segments.exit().remove();
        } else {
          mainGroup.selectAll("path").remove();
        }
      }
      //Interpolate the arcs in data space.
      function arcTween(d) {
        if(d._x === undefined || d._dx === undefined) {
          d._x = d.x;
          d._dx = 0;
        }
        var interpolate = d3.interpolate({x: d._x, dx: d._dx}, d);
        return function(t) {
          var b = interpolate(t);
          d._x = b.x;
          d._dx = b.dx;
          return arc(b);
        };
      }
      //for tracking the currently hovered element
      function mouseenter(d) {
        hoveredElementSet(scope.$parent, d);
        scope.$parent.$digest();
      }
      function mouseleave() {
        hoveredElementSet(scope.$parent, undefined);
        scope.$parent.$digest();
      }
    }
  }
});
