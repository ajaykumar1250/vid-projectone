
d3.csv("national_health_data_2024.csv").then(function(data) {
    let attributes = ["poverty_perc", "median_household_income", "elderly_percentage", "percent_no_heath_insurance", "percent_stroke", "percent_coronary_heart_disease"];
    let currentHistogramAttribute = "poverty_perc"; // Default histogram attribute
    let attr1 = "poverty_perc"; // Scatterplot X-axis , changes dynamically with histogram and map
    let attr2 = "median_household_income"; // Scatterplot Y-axis
    let currentMapAttribute = "poverty_perc"; // Default choropleth map attribute
    // Ensure all attributes are converted to numbers
    let selectedCounties = new Set();
    data = data.map(d => {
        let formattedData = {
            cnty_fips: d.cnty_fips.padStart(5, "0"), // Ensure FIPS is 5 digits
            display_name: d.display_name || "Unknown"
        };
        attributes.forEach(attr => formattedData[attr] = +d[attr] || 0);
        return formattedData;
    });
    let width = 500, height = 350, margin = {top: 30, right: 30, bottom: 50, left: 70};
    // Label Mapping
    let attributeLabels = {
        "poverty_perc": "Poverty Percentage (%)",
        "median_household_income": "Median Household Income ($)",
        "elderly_percentage": "Elderly Population (%)",
        "percent_no_heath_insurance": "No Health Insurance (%)",
        "percent_stroke": "Stroke Percentage (%)",
        "percent_coronary_heart_disease": "Coronary Heart Disease (%)"
    };
    // Color Mapping for Histogram Attributes
    let histogramColors = {
        "poverty_perc": "#1f77b4", // Blue
        "median_household_income": "#5aae61", // light green
        "elderly_percentage": "#807dba", // light purple
        "percent_no_heath_insurance": "#9467bd", // other purple
        "percent_stroke": "rgb(231, 155, 132)", // light orange
        "percent_coronary_heart_disease": "#bf812d" // light Brown
    };
    
    // Tooltip for Histogram
    let histogramTooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "8px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "5px")
        .style("visibility", "hidden");

    function createHistogram() {
        d3.select("#histogram").select("svg").remove(); // Clear previous histogram
        let svg = d3.select("#histogram").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
            
        // **Filter the data to only selected counties (or show all if none selected)**
        let filteredData = data.filter(d => selectedCounties.size === 0 || selectedCounties.has(d.cnty_fips));
        let x = d3.scaleLinear().domain(d3.extent(data, d => d[currentHistogramAttribute])).range([0, width]);
        let histogram = d3.histogram().domain(x.domain()).thresholds(x.ticks(20)).value(d => d[currentHistogramAttribute]);
        let bins = histogram(filteredData);
        let y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([height, 0]);
        let barColor = histogramColors[currentHistogramAttribute] || "steelblue"; // Get color dynamically
         // Create tooltip
    let histogramTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "8px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("visibility", "hidden")
    .style("pointer-events", "none");
    let bars = svg.selectAll("rect")
    .data(bins);

    // **ENTER + UPDATE phase: Fade effect & tooltip**
    bars.enter()
    .append("rect")
    .merge(bars) // Merge with update selection
    .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#ff7f0e"); // Highlight on hover
        let percentage = ((d.length / data.length) * 100).toFixed(2);
        histogramTooltip.style("visibility", "visible")
            .html(`<strong>Range:</strong> ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}<br>
                   <strong>Count:</strong> ${d.length}<br>
                   <strong>Percentage:</strong> ${percentage}% of total`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", event => {
        histogramTooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
        d3.select(this).attr("fill", barColor); // Reset color
        histogramTooltip.style("visibility", "hidden");
    })
    .transition().duration(1500)
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.length))
    .attr("width", d => x(d.x1) - x(d.x0) - 1)
    .attr("height", d => height - y(d.length))
    .attr("fill", barColor);

    // **EXIT phase: Remove bars smoothly**
    bars.exit()
    .transition().duration(300)
    .style("opacity", 0)
    .remove();

    // Append X-axis
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

    // Append Y-axis
    svg.append("g")
    .call(d3.axisLeft(y));

    // Add X-axis label
    svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text(attributeLabels[currentHistogramAttribute]);

    // Add Y-axis label
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Frequency");


        d3.select("#histogram-brush").select("svg").remove();
         // ** Brushing for Histogram **
         let brush = d3.brushX()
         .extent([[0, 0], [width, 50]])
         .on("end", function(event) {
             if (!event.selection) return;
             let [x0, x1] = event.selection.map(x.invert);
             selectedCounties = new Set(data.filter(d => d[currentHistogramAttribute] >= x0 && d[currentHistogramAttribute] <= x1).map(d => d.cnty_fips));
             updateAllVisualizations();
         });

     d3.select("#histogram-brush").append("svg")
         .attr("width", width + margin.left + margin.right)
         .attr("height", 50)
         .append("g")
         .call(brush);
        // Add X-axis label
        svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text(attributeLabels[currentHistogramAttribute]); // Dynamic label
         // Add Y-axis label
       svg.append("text")
       .attr("transform", "rotate(-90)")
       .attr("x", -height / 2)
       .attr("y", -50)
       .attr("text-anchor", "middle")
       .text("Frequency");
    }
    function createScatterplot() {
        d3.select("#scatterplot").select("svg").remove(); // Clear previous scatterplot
        let svg = d3.select("#scatterplot").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
            let scatterData = data.filter(d => 
                (selectedCounties.size === 0 || selectedCounties.has(d.cnty_fips)) &&
                d[attr1] !== -1 && d[attr2] !== -1 // Exclude -1 values
            );        let xScale = d3.scaleLinear().domain(d3.extent(data, d => d[attr1])).range([0, width]);
        let yScale = d3.scaleLinear().domain(d3.extent(data, d => d[attr2])).range([height, 0]);
        let scatterColor = histogramColors[currentHistogramAttribute] || "steelblue"; // Use dynamic color
        // Tooltip for scatter plot
        let scatterTooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "8px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "5px")
            .style("visibility", "hidden");

        let circles = svg.selectAll("circle")
        .data(scatterData);

    // **ENTER + UPDATE phase: Smooth transition for points**
    circles.enter()
        .append("circle")
        .merge(circles) // Merge enter and update selections
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("fill", "#ff7f0e")
                .attr("r", 6); // Highlight color and increase size

            scatterTooltip.style("visibility", "visible")
                .html(`<strong>${d.display_name}</strong><br>
                       <strong>${attributeLabels[attr1]}:</strong> ${d[attr1]}<br>
                       <strong>${attributeLabels[attr2]}:</strong> ${d[attr2]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", event => {
            scatterTooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("fill", scatterColor)
                .attr("r", 4); // Reset color and size on mouseout
            scatterTooltip.style("visibility", "hidden");
        })
        .transition().duration(1500) // Smooth transition effect
        .attr("cx", d => xScale(d[attr1]))
        .attr("cy", d => yScale(d[attr2]))
        .attr("r", 4)
        .attr("fill", scatterColor);

    // **EXIT phase: Remove points smoothly**
    circles.exit()
        .transition().duration(500)
        .attr("r", 0)
        .style("opacity", 0)
        .remove();

    // Append X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    // Append Y-axis
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Add X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text(attributeLabels[attr1]);

    // Add Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("id", "scatterplot-y-label") // Add ID to update it later
        .text(attributeLabels[attr2]);
}
    function updateAllVisualizations() {
        createHistogram();
        createScatterplot();
        updateCMap();
    }
    function updateCMap() {
    d3.json("counties-10m.json").then(us => {
        const mapSvg = d3.select("#choropleth-map").attr("width", 700).attr("height", 450).append("g");
        const projection = d3.geoAlbersUsa().translate([350, 225]).scale(800);
        const path = d3.geoPath().projection(projection);
        
        let mapColor = histogramColors[currentHistogramAttribute] || "steelblue"; // Use same color as histogram    
        // Tooltip for Choropleth Map
        let mapTooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "8px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "5px")
            .style("visibility", "hidden");
        d3.select("#choropleth-map").select("text").remove(); // Remove previous title
        // **Append Title Inside SVG**
        mapSvg.append("text")
            .attr("x", 350)  // Centered
            .attr("y", 20)   // Top padding
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(attributeLabels[currentMapAttribute]);
        // **Apply filtering - Only show selected counties if any are selected**
        let filteredData = data.filter(d => selectedCounties.size === 0 || selectedCounties.has(d.cnty_fips));
        // **Fix: Ensure `colorScale` is properly defined BEFORE using it**
        const colorScale = d3.scaleSequential()
            .domain(d3.extent(data, d => d[currentMapAttribute])) 
            .interpolator(d3.interpolateRgb("#ffffff", mapColor)); // Fix gradient scaling
        function updateMap() {
            const colorScale = d3.scaleSequential().domain(d3.extent(data, d => d[currentMapAttribute])).interpolator(d3.interpolateRgb("#ffffff", mapColor));
            mapSvg.selectAll("path")
                .data(topojson.feature(us, us.objects.counties).features)
                .join("path")
                .attr("d", path)
                .attr("fill", d => {
                    const county = filteredData.find(c => c.cnty_fips === d.id);
                    return county ? colorScale(county[currentMapAttribute]) : "#ddd";
                })
                .attr("stroke", "#fff").attr("stroke-width", 0.5)
                .on("mouseover", function(event, d) {
                    let county = filteredData.find(c => c.cnty_fips === d.id);
                    if (county) {
                        d3.select(this)
                        .attr("fill", "#ff7f0e")  // Highlight color
                        .attr("stroke-width", 2); // Make border bold
                        mapTooltip.style("visibility", "visible")
                            .html(`<strong>${county.display_name}</strong><br>${currentMapAttribute.replace('_', ' ')}: ${county[currentMapAttribute]?.toFixed(1)}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mousemove", event => mapTooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 10) + "px"))
                .on("mouseout", function(event, d) {
                let county = filteredData.find(c => c.cnty_fips === d.id);
                if (county) {
                d3.select(this)
                .attr("fill", colorScale(county[currentMapAttribute])) // Reset to original color
                .attr("stroke-width", 0.5); // Reset border width
                 mapTooltip.style("visibility", "hidden");
                 }
            });
        }
        updateMap();
        // d3.select("#map-selector").on("change", function() {
        //     currentMapAttribute = currentHistogramAttribute;//this.value;
        //     updateMap();
        // });
        updateLegend(colorScale, d3.extent(data, d => d[currentMapAttribute]));
    });
}

    d3.select("#histogram-selector").on("change", function() {
        currentHistogramAttribute = this.value;
        currentMapAttribute = this.value;
        attr1 = this.value;
        attr1 = this.value;  // Update scatterplot X-axis
        createHistogram(); // **Fix: Ensure histogram updates correctly**
        createScatterplot();
        updateCMap();
        updateAllVisualizations();
    });
    d3.select("#scatterplot-y-selector").on("change", function() {
        attr2 = this.value;
        createScatterplot();
    });

    // Reset button: Refresh the page to reset all visualizations
d3.select("#reset-button").on("click", function() {
    location.reload(); // Refresh the page
});

function updateLegend(colorScale, domain) {
    d3.select("#map-legend").selectAll("*").remove(); // Clear previous legend

    console.log("Updating legend with domain:", domain);
    console.log("Color at min:", colorScale(domain[0]));
    console.log("Color at max:", colorScale(domain[1]));

    // Ensure valid domain values before proceeding
    if (!domain || domain[0] === undefined || domain[1] === undefined) {
        console.error("Invalid domain for legend:", domain);
        return;
    }

    const legendWidth = 300, legendHeight = 20;
    
 // Create or update the SVG inside the centered legend container
 let legendSvg = d3.select("#map-legend")
 .selectAll("svg")
 .data([null])
 .join("svg")
 .attr("width", legendWidth)
 .attr("height", 100)
 .append("g")
 .attr("transform", "translate(10,30)");

// **Create Gradient for Legend**
const defs = legendSvg.append("defs");
const linearGradient = defs.append("linearGradient")
 .attr("id", "legend-gradient");

linearGradient.selectAll("stop").remove(); // Clear old stops

linearGradient.selectAll("stop")
 .data([
     { offset: "0%", color: colorScale(domain[0]) || "#ffffff" },
     { offset: "100%", color: colorScale(domain[1]) || "#000000" }
 ])
 .enter().append("stop")
 .attr("offset", d => d.offset)
 .attr("stop-color", d => d.color);

// **Append the legend rectangle**
legendSvg.append("rect")
 .attr("width", legendWidth)
 .attr("height", legendHeight)
 .style("fill", "url(#legend-gradient)")
 .attr("stroke", "#ccc")
 .attr("stroke-width", 1);

// **Append min and max values**
legendSvg.append("text")
 .attr("x", 0)
 .attr("y", 35)
 .attr("font-size", "12px")
 .text(domain[0].toFixed(1));

legendSvg.append("text")
 .attr("x", legendWidth)
 .attr("y", 35)
 .attr("text-anchor", "end")
 .attr("font-size", "12px")
 .text(domain[1].toFixed(1));

// **Legend Title**
legendSvg.append("text")
 .attr("x", legendWidth / 2)
 .attr("y", -5)
 .attr("text-anchor", "middle")
 .attr("font-size", "14px")
 .attr("font-weight", "bold")
 .text("Color Legend");
}


    updateAllVisualizations();
}).catch(error => console.error("Error loading data:", error));
