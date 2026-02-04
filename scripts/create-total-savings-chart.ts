import * as echarts from 'echarts';
import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORTS_DIR = path.join(__dirname, '../exports');
const CHART_WIDTH = 1200;
const CHART_HEIGHT = 600;

// Load transaction data
const txDataPath = path.join(EXPORTS_DIR, 'tx-data-2026-02-04.json');
const txData = JSON.parse(fs.readFileSync(txDataPath, 'utf-8'));

interface TxLogEntry {
	timestamp: string;
	totalSavings: string;
	kind: string;
}

// Helper function to convert wei to decimal (18 decimals)
function weiToDecimal(wei: string, decimals: number = 18): number {
	return Number(BigInt(wei)) / Math.pow(10, decimals);
}

// Helper function to format Unix timestamp to date string
function formatTimestamp(timestamp: string): string {
	const date = new Date(Number(timestamp) * 1000);
	return date.toISOString().split('T')[0];
}

// Helper function to format large numbers
function formatLargeNumber(value: number): string {
	const absValue = Math.abs(value);
	if (absValue >= 1e6) {
		return `${(value / 1e6).toFixed(2)}M`;
	} else if (absValue >= 1e3) {
		return `${(value / 1e3).toFixed(1)}K`;
	}
	return value.toFixed(0);
}

// Helper function to calculate nice y-axis bounds with padding
function calculateAxisBounds(data: number[], paddingPercent: number = 10) {
	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min;
	const padding = range * (paddingPercent / 100);

	return {
		min: Math.floor((min - padding) * 100) / 100,
		max: Math.ceil((max + padding) * 100) / 100,
	};
}

// Helper function to save chart
function saveChart(chart: echarts.ECharts, filename: string) {
	const buffer = (chart.getDom() as any).toBuffer('image/png');
	fs.writeFileSync(path.join(EXPORTS_DIR, filename), buffer);
	console.log(`✅ Generated: ${filename}`);
}

// Reverse data to get chronological order (oldest to newest)
const chronologicalData = [...txData].reverse() as TxLogEntry[];

// Extract unique data points (deduplicate by timestamp to reduce noise)
const dataByTimestamp = new Map<string, number>();
for (const entry of chronologicalData) {
	const timestamp = entry.timestamp;
	const totalSavings = weiToDecimal(entry.totalSavings);
	// Keep the latest value for each timestamp
	dataByTimestamp.set(timestamp, totalSavings);
}

// Convert to arrays for charting
const timestamps = Array.from(dataByTimestamp.keys());
const dates = timestamps.map(formatTimestamp);
const savings = timestamps.map((ts) => dataByTimestamp.get(ts)!);

// Total Savings Over Time Chart
function createTotalSavingsChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const savingsBounds = calculateAxisBounds(savings, 5);

	const option = {
		title: {
			text: 'Total Savings Over Time',
			left: 'center',
			textStyle: {
				fontSize: 24,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const param = params[0];
				return `${param.name}<br/>Total Savings: ${formatLargeNumber(param.value)} ZCHF`;
			},
		},
		grid: {
			left: 100,
			right: 80,
			top: 80,
			bottom: 80,
		},
		xAxis: {
			type: 'category',
			data: dates,
			axisLabel: {
				rotate: 45,
				interval: Math.floor(dates.length / 10),
			},
		},
		yAxis: {
			type: 'value',
			name: 'Total Savings (ZCHF)',
			scale: true,
			min: savingsBounds.min,
			max: savingsBounds.max,
			axisLabel: {
				formatter: formatLargeNumber,
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'Total Savings',
				type: 'line',
				data: savings,
				smooth: true,
				lineStyle: {
					width: 3,
					color: '#5470c6',
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: 'rgba(84, 112, 198, 0.5)' },
						{ offset: 1, color: 'rgba(84, 112, 198, 0.05)' },
					]),
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-total-savings-over-time.png');
	chart.dispose();
}

// Main execution
async function generateChart() {
	console.log('🎨 Generating Total Savings chart...\n');
	console.log(`📊 Data points: ${savings.length}`);
	console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
	console.log(
		`💰 Savings range: ${formatLargeNumber(Math.min(...savings))} - ${formatLargeNumber(Math.max(...savings))} ZCHF\n`,
	);

	try {
		createTotalSavingsChart();
		console.log('\n✨ Chart generated successfully!');
		console.log(`📁 Chart saved to: ${EXPORTS_DIR}`);
	} catch (error) {
		console.error('❌ Error generating chart:', error);
		process.exit(1);
	}
}

generateChart();
