var slideValue = 60,
    isSliding = false,
    countryGreyBlue = "#b6c5d0",
    currentWidth = $(".sankey-container").width();

if (currentWidth < 550) {
    currentWidth = 550
};
if (currentWidth > 978) {
    currentWidth = 978
};

var currentHeight = window.innerHeight * .8;

var margin = {
		top: 5,
        right: 5,
        bottom: 5,
        left: 5
    },
    width = currentWidth - margin.left - margin.right,
    height = currentHeight - margin.top - margin.bottom;

var formatNumber = d3.format(",.2f%"), // two decimal places
    format = function (d) {
        return formatNumber(d) + " " + units;
    },
    color = d3.scale.category20c();

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Set the sankey diagram properties
var sankey = d3.sankey()
    .nodeWidth(25)
    .nodePadding(8)
    .size([width, height]);

var path = sankey.link();

var startingYear = 2010,
    indexYear = 1949;
var graph, data, link, node, sliderEvent;
var energyValues = [];
var sliderDragVisible = true;

// load the data with d3.csv
d3.csv("energy-sankey-data.csv", function (data) {
    graph = {
        "nodes": [],
        "links": []
    };

    data.forEach(function (d, i) {
        var item = {
            source: d.source,
            target: d.target,
            values: []
        };
        for (var j = 1949; j <= 2040; j++) {
            item.values.push(d[j.toString()]);
        }
        energyValues.push(item);
        graph.nodes.push({
            "name": d.source
        });
        graph.nodes.push({
            "name": d.target
        });
        graph.links.push({
            source: energyValues[i].source,
            target: energyValues[i].target,
            value: energyValues[i].values[startingYear - indexYear]
        });
    });

    // this function returns unique nodes
    graph.nodes = d3.keys(d3.nest()
        .key(function (d) { return d.name; })
        .map(graph.nodes));

    //it appears d3 with force layout wants a numeric source and target
    //so loop through each link replacing the text with its index from node
    graph.links.forEach(function (d, i) {
        graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
        graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
        energyValues[i].source = graph.links[i].source;
        energyValues[i].target = graph.links[i].target;
    });

    //now loop through each nodes to make nodes an array of objects rather than an array of strings
    graph.nodes.forEach(function (d, i) {
        graph.nodes[i] = { "name": d };
	});

    // construct sankey
    sankey
        .nodes(graph.nodes)
        .links(graph.links)
        .layout();

    // add in the links
    link = svg.append("g").selectAll(".link")
        .data(graph.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("id",
            function (d, i) {
                d.id = i;
                return "link-" + i;
            })
        .attr("d", path)
        .style("stroke", function (d) { return d.target.color = color(d.target.name.replace(/ .*/, "")); })
        .style("stroke-width", function (d) { return Math.max(1, d.dy); })
        .sort(function (a, b) { return b.dy - a.dy; })
        .style("visibility",
            function () {
                if (this.__data__.value == 0) {
                    return "hidden";
                } else {
                    return "visible";
                }
            });

    // add in the nodes
    node = svg.append("g").selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
        .style("visibility",
            function () {
                if (this.__data__.value == 0) {
                    return "hidden";
                } else {
                    return "visible";
                }
            })
        .on("click", highlight_node_links)
		.call(d3.behavior.drag()
				.origin(function (d) { return d; })
				.on("dragstart", function () { this.parentNode.appendChild(this); })
				.on("drag", dragmove));

    // add the rectangles for the nodes
    node.append("rect")
        .attr("height", function (d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
		.attr("class", function (d) { return d.name;	})
		.attr("class", function (d) { return d.name; })
		.style("fill", function (d) { return d.color = color(d.name.replace(/ .*/, "")); })
        .style("stroke", function (d) { return d3.rgb(d.color).darker(2); })
		.style("stroke-width", "0px");

    // add in the title for the nodes
    node.append("text")
        .attr("x", -2)
        .attr("y", function (d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .text( function (d) { return d.name; })
        .style("font-size", function () {
                var textSize = 0.01 * this.__data__.value;
                if (textSize > 13) {
                    return "13px";
                } else if (textSize < 10) {
					return "10px";
				} else {
                    return textSize.toString() + "px";
                }
            })
        .filter(function (d) { return d.x < width / 2; })
        .attr("x", 2 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    function getValue(passedObj) {
        return passedObj.__data__.value;
    }

    // update function
    function updateData(index) {
		
        currentWidth = $(".sankey-container").width();
        if (currentWidth < 550) { currentWidth = 550 };
        if (currentWidth > 978) { currentWidth = 978 };
        width = currentWidth;
        $("svg").width(currentWidth);

        var newLinks = [];

        energyValues.forEach(function (p, i) {
            newLinks.push({
                source: p.source,
                target: p.target,
                value: p.values[index]
            });
        });

        graph.links = newLinks;

        sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .size([width, height])
            .layout();

        d3.selectAll("rect").style("stroke-width", "20px");

        d3.selectAll(".link")
            .data(graph.links)
            .attr("d", path)
            .attr("id", function (d, i) {
                d.id = i;
                return "link-" + i;
            })
			.style("stroke", function (d) {
                return d.target.color = color(d.target.name.replace(/ .*/, ""));
            })
            .style("stroke-width", function (d) {
                return Math.max(1, d.dy);
            })
            .sort(function (a, b) {
                return b.dy - a.dy;
            });

        d3.selectAll(".node").attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

        d3.selectAll("rect")
            .attr("height", function (d) {
                return d.dy;
            }).style("stroke-width", "0px");


        d3.selectAll("text")
            .attr("y", function (d) {
                return d.dy / 2;
            })
			.style("font-size", function () {
                var textSize = 0.01 * this.__data__.value;
                if (textSize > 13) {
                    return "13px";
                } else if (textSize < 10) {
					return "10px";
				} else {
                    return textSize.toString() + "px";
                }
            });

        d3.selectAll("g.node")
            .style("visibility", function () {
                if (this.__data__.value < 0.0009) {
                    return "hidden";
                } else {
                    return "visible";
                }
            });

        d3.selectAll("path.link")
            .style("visibility", function () {
                if (this.__data__.value < 0.0009) {
                    return "hidden";
                } else {
                    return "visible";
                }
            });
    }
	
    $(document).mouseleave(
        function (event) {
            $(".sankey-container").trigger("mouseup");
            isSliding = false;
        }
    );

	// link slider to update function 
    $(".sankey-slider").bind("slider:changed", function (event, data) {
        if (!isSliding) {
            $(".sankey-container").one("mouseup", function () {
                isSliding = false;
            });
            isSliding = true;
        }
        slideValue = data.value;
        d3.select("#year").text(slideValue);
        updateData(parseInt(slideValue - indexYear));
    });

	// show tooltip when a node is clicked	
    function highlight_node_links(node, i) {

        var remainingNodes = [],
            nextNodes = [];

        var stroke_opacity = 0;
        if (d3.select(this).attr("data-clicked") == "1") {
            d3.select(this).attr("data-clicked", "0");
            stroke_opacity = 0.2;
        } else {
            d3.select(this).attr("data-clicked", "1");
            stroke_opacity = 0.65;
        }

        var traverse = [{
            linkType: "sourceLinks",
            nodeType: "target"
                    }, {
            linkType: "targetLinks",
            nodeType: "source"
                    }];

        traverse.forEach(function (step) {
            node[step.linkType].forEach(function (link) {
                remainingNodes.push(link[step.nodeType]);
                highlight_link(link.id, stroke_opacity);
            });

            while (remainingNodes.length) {
                nextNodes = [];
                remainingNodes.forEach(function (node) {
                    node[step.linkType].forEach(function (link) {
                        nextNodes.push(link[step.nodeType]);
                        highlight_link(link.id, stroke_opacity);
                    });
                });
                remainingNodes = nextNodes;
            }
        });
    }

	// show a tooltip when a link is clicked		
    function highlight_link(id, opacity) {
        d3.select("#link-" + id).style("stroke-opacity", opacity);
    }
     function dragmove(d) {
                    d3.select(this).attr("transform",
                        "translate(" + (
                            d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
                        ) + "," + (
                            d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                        ) + ")");
                    sankey.relayout();
                    link.attr("d", path);
                }

});
