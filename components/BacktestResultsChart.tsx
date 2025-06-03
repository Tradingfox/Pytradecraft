import React, { useEffect, useRef } from 'react';
import { BacktestResult, EquityDataPoint } from '../types';
import * as d3 from 'd3';

interface BacktestResultsChartProps {
  result: BacktestResult;
  height?: number;
  width?: string;
}

/**
 * Component for displaying backtest equity curve chart
 */
const BacktestResultsChart: React.FC<BacktestResultsChartProps> = ({ 
  result, 
  height = 300,
  width = '100%'
}) => {
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!chartRef.current || !result.equityCurve || result.equityCurve.length === 0) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();

    const data = result.equityCurve;

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const svgWidth = chartRef.current.clientWidth;
    const svgHeight = height;
    const width = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(chartRef.current)
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formattedData = data.map(d => ({
      date: parseDate(d.date) || new Date(), // Fallback to current date if parsing fails
      value: d.value
    }));

    // Set up scales
    const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([
        d3.min(formattedData, d => d.value) || 0,
        d3.max(formattedData, d => d.value) || 0
      ])
      .nice()
      .range([chartHeight, 0]);

    // Create line generator
    const line = d3.line<{ date: Date, value: number }>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .attr('color', '#9ca3af'); // Gray-400

    svg.append('g')
      .call(d3.axisLeft(y))
      .attr('color', '#9ca3af'); // Gray-400

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('stroke', '#4b5563') // Gray-600
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', '3,3')
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => '')
      );

    // Add the line path
    svg.append('path')
      .datum(formattedData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6') // Blue-500
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add area under the curve
    const area = d3.area<{ date: Date, value: number }>()
      .x(d => x(d.date))
      .y0(chartHeight)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(formattedData)
      .attr('fill', '#3b82f6') // Blue-500
      .attr('fill-opacity', 0.2)
      .attr('d', area);

    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', '#1f2937') // Gray-800
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    // Add hover effects
    const focus = svg.append('g')
      .attr('class', 'focus')
      .style('display', 'none');

    focus.append('circle')
      .attr('r', 5)
      .attr('fill', '#3b82f6') // Blue-500
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    const bisect = d3.bisector<{ date: Date, value: number }, Date>(d => d.date).left;

    svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', chartHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => {
        focus.style('display', null);
        tooltip.style('opacity', 1);
      })
      .on('mouseout', () => {
        focus.style('display', 'none');
        tooltip.style('opacity', 0);
      })
      .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const i = bisect(formattedData, x0, 1);
        const d0 = formattedData[i - 1];
        const d1 = formattedData[i];

        if (!d0 || !d1) return;

        const d = x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;

        focus.attr('transform', `translate(${x(d.date)},${y(d.value)})`);

        tooltip
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY - 28}px`)
          .html(`
            <div>
              <strong>Date:</strong> ${d.date.toLocaleDateString()}
            </div>
            <div>
              <strong>Equity:</strong> $${d.value.toLocaleString()}
            </div>
          `);
      });

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 0 - margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '14px')
      .text('Equity Curve');

    // Clean up on unmount
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [result, height]);

  return (
    <div className="backtest-results-chart" style={{ width, height }}>
      <svg ref={chartRef} width="100%" height={height} />
    </div>
  );
};

export default BacktestResultsChart;
