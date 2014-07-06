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
      //handle the hoverElement attribute
      if(attrs.hasOwnProperty("hoveredElement")) {
        var hoveredElementGet = $parse(attrs.hoveredElement);
        var hoveredElementSet = hoveredElementGet.assign;
        if(!hoveredElementSet) {
          throw new Error("hoveredElement is un-assignable");
        }
      }
      //watch the variables and adjust chart if necessary
      var hierarchyCopy;
      scope.$watch("hierarchy", function(newHierarchy) {
        hierarchyCopy = _.cloneDeep(newHierarchy);
        redraw();
      }, true);
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
        .size([2*Math.PI, 100*100])
        .value(function(d) { return 1; });
      var arc = d3.svg.arc()
        .startAngle(function(d) { return d.x; })
        .endAngle(function(d) { return d.x + d.dx; })
        .innerRadius(function(d) { return Math.sqrt(d.y); })
        .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });
      //create the SVG skeleton
      var svg = d3.select(element[0])
        .append("svg")
          .attr("viewBox", "-100, -100, 200, 200")
          .attr("preserveAspectRatio", "xMinYMin meet")
      var mainGroup = svg.append("g")
      mainGroup.append("circle")
        .attr("r", 100)
        .classed("backgroundCircle", true);
      //attach a mouseleave listener if hoveredElement is used
      if(hoveredElementSet) {
        mainGroup.on("mouseleave", mouseleave);
        //we must attach to the svg as well, since we could leave the mainGroup
        //over one of the edges of the svg and in this case mousleave would not fire
        //on the mainGroup
        svg.on("mouseleave", mouseleave);
      }
      
      //redraws the chart
      function redraw() {
        //adjust the basic layout
        if(hierarchyCopy) {
          var segmentsData = partition.nodes(hierarchyCopy);
          var segments = mainGroup.datum(hierarchyCopy).selectAll("path")
              .data(_.filter(segmentsData, function(d) {return !!d.parent;}));
          //ENTER
          var entered = segments.enter().append("path")
          if(hoveredElementSet) {
            entered.on("mouseenter", mouseenter);
          }
          //UPDATE + ENTER
          segments
            .style("fill", function(d) {return colorScale(d.path);})
            .style("display", function(d) {return d.parent ? "block":"none";})
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
        //the previous animation state is stored on the DOM element (this)
        var domElement = this;
        if(domElement._x === undefined || domElement._dx === undefined) {
          domElement._x = d.x;
          domElement._dx = 0;
        }
        var interpolate = d3.interpolate({x: domElement._x, dx: domElement._dx}, d);
        return function(t) {
          var b = interpolate(t);
          domElement._x = b.x;
          domElement._dx = b.dx;
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
