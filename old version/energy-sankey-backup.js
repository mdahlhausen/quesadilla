var margin = {top: 40, right: 10, bottom: 50, left: 10},
	width = screen.width * .7 - margin.left - margin.right,
	height = screen.height * .7 - margin.top - margin.bottom, 
	slideValue =70,
    isSliding = false;
	
var formatNumber = d3.format(",.0f"),
	format = function (d) {	return formatNumber(d) + " Trillion Btu"; },
	color = d3.scale.category20();

var year = "2002";

d3.select('#slider').call(d3.slider()
	.axis(true)
	.min(1949)
	.max(2040)
	.containerWidth(screen.width * .8)
	.step(1)
	.value(2002)
	.on("slide", function (evt, value) {
		d3.select('#year').text(value);
		year = value.toString();
		removeSankey();
		drawSankey();
	})
);

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Set the sankey diagram properties
var sankey = d3.sankey()
	.nodeWidth(15)
	.nodePadding(10)
	.size([width, height]);

var path = sankey.link();

drawSankey();

function removeSankey() {
	svg.selectAll(".link").remove()
	svg.selectAll(".node").remove()
}

function searchStringInArray (str, strArray) {
	for (var j=0; j<strArray.length; j++) {
		if (strArray[j].match(str)) return 1;
	}	
	return 0;
}

// load data for sankey
function drawSankey() {
	d3.json("USenergy.json", function (energy) {

		// for each link, set the value equal to the year
		// we may want another solution for this, as this may impede transition dynamics? 
		var k = 0;
		var sources = [];
		var targets = [];
		while (k < energy.links.length) {
			energy.links[k].value = energy.links[k][year];
			if (energy.links[k].value != null) {
				sources.push(energy.links[k].source);
				targets.push(energy.links[k].target);
			}					
			// filter out nodes below a certain size
			if (energy.links[k].value < 10) {
				energy.links.splice(k, 1);
			} else {
				k = k + 1;
			}
		}
		
		// remove nodes that are not a source or target
		var k = 0;
		while (k < energy.nodes.length) {
			var inSources = searchStringInArray(energy.nodes[k].name, sources);
			var inTargets = searchStringInArray(energy.nodes[k].name, targets);
			if ((inSources == 0) & (inTargets == 0)) {
				energy.nodes.splice(k, 1);						
			} else {
				k = k + 1;
			}
		}
		
		sankey
			.nodes(energy.nodes)
			.links(energy.links)
			.layout(32);
		
		//add the links
		var link = svg.append("g").selectAll(".link")
			.data(energy.links)
			.enter().append("path")
				.attr("class", "link")
				.attr("d", path)
				.attr("id", function (d, i) { d.id = i;	return "link-" + i; })
				.style("stroke", function (d) {	return d.target.color = color(d.target.name.replace(/ .*/, "")); })
				.style("stroke-width", function (d) { return Math.max(1, d.dy);	})
				.sort(function (a, b) {	return b.dy - a.dy;	});

		link.append("title")
			.text(function (d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value);	});
			
		// add the nodes
		var node = svg.append("g").selectAll(".node")
			.data(energy.nodes)
			.enter().append("g")
				.attr("class", "node")
				.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
				.on("click", highlight_node_links)
				.call(d3.behavior.drag()
					.origin(function (d) { return d; })
					.on("dragstart", function () { this.parentNode.appendChild(this); })
					.on("drag", dragmove));

		node.append("rect")
			.attr("height", function (d) { return d.dy; })
			.attr("width", sankey.nodeWidth())
			.style("fill", function (d) { return d.color = color(d.name.replace(/ .*/, "")); })
			.style("stroke", function (d) {	return d3.rgb(d.color).darker(2); })
			.append("title")
			.text(function (d) { return d.name + "\n" + format(d.value); });

		node.append("text")
			.attr("x", -6)
			.attr("y", function (d) { return d.dy / 2; })
			.attr("dy", ".35em")
			.attr("text-anchor", "end")
			.attr("transform", null)
			.text(function (d) { return d.name;	})
			.filter(function (d) { return d.x < width / 2; })
			.attr("x", 6 + sankey.nodeWidth())
			.attr("text-anchor", "start");

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

		function highlight_node_links(node, i) {
			var remainingNodes = [],
				nextNodes = [], 
				stroke_opacity = 0;

			if (d3.select(this).attr("data-clicked") == "1") {
				d3.select(this).attr("data-clicked", "0");
				stroke_opacity = 0.2;
			} else {
				d3.select(this).attr("data-clicked", "1");
				stroke_opacity = 0.7;
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

		function highlight_link(id, opacity) {
			d3.select("#link-" + id).style("stroke-opacity", opacity).style('stroke', function (d) {
				return d.target.color = color(d.target.name.replace(/ .*/, ""));
			});
		}

	});
}