import * as echarts from 'echarts';
import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { data } from '../exports/data-2026-01-18.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORTS_DIR = path.join(__dirname, '../exports');
const CHART_WIDTH = 1200;
const CHART_HEIGHT = 600;

// Helper function to convert wei to decimal
function weiToDecimal(wei: string, decimals: number = 18): number {
	return Number(wei) / Math.pow(10, decimals);
}

// Helper function to format yield (already in basis points)
function formatYield(yieldValue: string): number {
	return Number(yieldValue) / 10000; // Convert basis points to percentage
}

// Reverse data to get chronological order (oldest to newest)
const chronologicalData = [...data].reverse();

// Helper function to save chart
function saveChart(chart: echarts.ECharts, filename: string) {
	const buffer = (chart.getDom() as any).toBuffer('image/png');
	fs.writeFileSync(path.join(EXPORTS_DIR, filename), buffer);
	console.log(`✅ Generated: ${filename}`);
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

// Helper function to format large numbers
function formatLargeNumber(value: number): string {
	const absValue = Math.abs(value);
	if (absValue >= 1e6) {
		return `${(value / 1e6).toFixed(1)}M`;
	} else if (absValue >= 1e3) {
		return `${(value / 1e3).toFixed(1)}K`;
	}
	return value.toFixed(0);
}

// 1. svZCHF Price Over Time
function createPriceChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const prices = chronologicalData.map((d) => weiToDecimal(d.svZCHFPrice));
	const priceBounds = calculateAxisBounds(prices, 5);

	const option = {
		title: {
			text: 'svZCHF Price Over Time',
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
				return `${param.name}<br/>Price: ${param.value.toFixed(6)} CHF`;
			},
		},
		grid: {
			left: 80,
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
			name: 'Price (CHF)',
			scale: true,
			min: priceBounds.min,
			max: priceBounds.max,
			axisLabel: {
				formatter: (value: number) => value.toFixed(4),
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'svZCHF Price',
				type: 'line',
				data: prices,
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
	saveChart(chart, 'chart-1-price-over-time.png');
	chart.dispose();
}

// 2. Accumulative vs Native Yield
function createYieldChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const accumulativeYields = chronologicalData.map((d) =>
		formatYield(d.accumulativeYield),
	);
	const nativeYields = chronologicalData.map((d) =>
		formatYield(d.nativeYield),
	);
	const allYields = [...accumulativeYields, ...nativeYields];
	const yieldBounds = calculateAxisBounds(allYields, 15);

	const option = {
		title: {
			text: 'Accumulative vs Native Yield',
			left: 'center',
			textStyle: {
				fontSize: 24,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				let result = `${params[0].name}<br/>`;
				params.forEach((param: any) => {
					result += `${param.seriesName}: ${param.value.toFixed(2)}%<br/>`;
				});
				return result;
			},
		},
		legend: {
			data: ['Accumulative Yield', 'Native Yield'],
			top: 40,
		},
		grid: {
			left: 80,
			right: 80,
			top: 100,
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
			name: 'Yield (%)',
			scale: true,
			min: 0,
			max: yieldBounds.max,
			axisLabel: {
				formatter: (value: number) => `${value.toFixed(1)}%`,
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'Accumulative Yield',
				type: 'line',
				data: accumulativeYields,
				smooth: true,
				lineStyle: {
					width: 3,
					color: '#91cc75',
				},
			},
			{
				name: 'Native Yield',
				type: 'line',
				data: nativeYields,
				smooth: true,
				lineStyle: {
					width: 3,
					color: '#fac858',
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-2-yield-comparison.png');
	chart.dispose();
}

// 3. Daily Net Flow
function createNetFlowChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const netFlows = chronologicalData.map((d) => {
		const deposits = weiToDecimal(d.deposits);
		const withdrawals = weiToDecimal(d.withdrawals);
		return deposits - withdrawals;
	});
	const flowBounds = calculateAxisBounds(netFlows, 20);

	const option = {
		title: {
			text: 'Daily Net Flow (Deposits - Withdrawals)',
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
				const value = param.value;
				const sign = value >= 0 ? '+' : '';
				return `${param.name}<br/>Net Flow: ${sign}${formatLargeNumber(value)} CHF`;
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
			name: 'Net Flow (CHF)',
			scale: true,
			min: flowBounds.min,
			max: flowBounds.max,
			axisLabel: {
				formatter: formatLargeNumber,
			},
			splitNumber: 6,
		},
		series: [
			{
				name: 'Net Flow',
				type: 'bar',
				data: netFlows,
				itemStyle: {
					color: (params: any) => {
						return params.value >= 0 ? '#91cc75' : '#ee6666';
					},
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-3-daily-net-flow.png');
	chart.dispose();
}

// 4. Total Assets Growth
function createTotalAssetsChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const totalAssets = chronologicalData.map((d) =>
		weiToDecimal(d.totalAssets),
	);
	const assetBounds = calculateAxisBounds(totalAssets, 10);

	const option = {
		title: {
			text: 'Total Assets Growth',
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
				return `${param.name}<br/>Total Assets: ${formatLargeNumber(param.value)} CHF`;
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
			name: 'Total Assets (CHF)',
			scale: true,
			min: assetBounds.min,
			max: assetBounds.max,
			axisLabel: {
				formatter: formatLargeNumber,
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'Total Assets',
				type: 'line',
				data: totalAssets,
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
	saveChart(chart, 'chart-4-total-assets-growth.png');
	chart.dispose();
}

// 5. Transaction Volume Bar Chart
function createTransactionVolumeChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const deposits = chronologicalData.map((d) => weiToDecimal(d.deposits));
	const withdrawals = chronologicalData.map((d) =>
		weiToDecimal(d.withdrawals),
	);
	const allVolumes = [...deposits, ...withdrawals];
	const volumeBounds = calculateAxisBounds(allVolumes, 15);

	const option = {
		title: {
			text: 'Daily Transaction Volume',
			left: 'center',
			textStyle: {
				fontSize: 24,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				let result = `${params[0].name}<br/>`;
				params.forEach((param: any) => {
					result += `${param.seriesName}: ${formatLargeNumber(param.value)} CHF<br/>`;
				});
				return result;
			},
		},
		legend: {
			data: ['Deposits', 'Withdrawals'],
			top: 40,
		},
		grid: {
			left: 100,
			right: 80,
			top: 100,
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
			name: 'Volume (CHF)',
			scale: true,
			min: 0,
			max: volumeBounds.max,
			axisLabel: {
				formatter: formatLargeNumber,
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'Deposits',
				type: 'bar',
				stack: 'total',
				data: deposits,
				itemStyle: {
					color: '#91cc75',
				},
			},
			{
				name: 'Withdrawals',
				type: 'bar',
				stack: 'total',
				data: withdrawals,
				itemStyle: {
					color: '#ee6666',
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-5-transaction-volume.png');
	chart.dispose();
}

// 13. Activity Heatmap
function createActivityHeatmap() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	// Prepare heatmap data: [date, metric, value]
	const heatmapData = chronologicalData.map((d, index) => {
		const totalTxCount = Number(d.depositCount) + Number(d.withdrawCount);
		return [d.date, 'Transaction Count', totalTxCount];
	});

	const dates = chronologicalData.map((d) => d.date);

	const option = {
		title: {
			text: 'Daily Activity Heatmap',
			left: 'center',
			textStyle: {
				fontSize: 24,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			position: 'top',
			formatter: (params: any) => {
				return `${params.value[0]}<br/>Transactions: ${params.value[2]}`;
			},
		},
		grid: {
			left: 100,
			right: 80,
			top: 80,
			bottom: 120,
		},
		xAxis: {
			type: 'category',
			data: dates,
			splitArea: {
				show: true,
			},
			axisLabel: {
				rotate: 45,
				interval: Math.floor(dates.length / 10),
			},
		},
		yAxis: {
			type: 'category',
			data: ['Transaction Count'],
			splitArea: {
				show: true,
			},
		},
		visualMap: {
			min: 0,
			max: Math.max(...heatmapData.map((d) => d[2] as number)),
			calculable: true,
			orient: 'horizontal',
			left: 'center',
			bottom: 20,
			inRange: {
				color: ['#f0f9ff', '#0ea5e9', '#1e40af'],
			},
		},
		series: [
			{
				name: 'Activity',
				type: 'heatmap',
				data: heatmapData,
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowColor: 'rgba(0, 0, 0, 0.5)',
					},
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-13-activity-heatmap.png');
	chart.dispose();
}

// 6. Accumulated Volume Over Time
function createAccumulatedVolumeChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);

	// Calculate cumulative volumes
	let cumulativeDeposits = 0;
	let cumulativeWithdrawals = 0;

	const accumulatedDeposits = chronologicalData.map((d) => {
		cumulativeDeposits += weiToDecimal(d.deposits);
		return cumulativeDeposits;
	});

	const accumulatedWithdrawals = chronologicalData.map((d) => {
		cumulativeWithdrawals += weiToDecimal(d.withdrawals);
		return cumulativeWithdrawals;
	});

	const totalVolume = accumulatedDeposits.map(
		(d, i) => d + (accumulatedWithdrawals[i] ?? 0),
	);

	const allVolumes = [
		...accumulatedDeposits,
		...accumulatedWithdrawals,
		...totalVolume,
	];
	const volumeBounds = calculateAxisBounds(allVolumes, 10);

	const option = {
		title: {
			text: 'Accumulated Volume Over Time',
			left: 'center',
			textStyle: {
				fontSize: 24,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				let result = `${params[0].name}<br/>`;
				params.forEach((param: any) => {
					result += `${param.seriesName}: ${formatLargeNumber(param.value)} CHF<br/>`;
				});
				return result;
			},
		},
		legend: {
			data: [
				'Total Volume',
				'Accumulated Deposits',
				'Accumulated Withdrawals',
			],
			top: 40,
		},
		grid: {
			left: 100,
			right: 80,
			top: 100,
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
			name: 'Accumulated Volume (CHF)',
			scale: true,
			min: 0,
			max: volumeBounds.max,
			axisLabel: {
				formatter: formatLargeNumber,
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'Total Volume',
				type: 'line',
				data: totalVolume,
				smooth: true,
				lineStyle: {
					width: 4,
					color: '#5470c6',
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: 'rgba(84, 112, 198, 0.4)' },
						{ offset: 1, color: 'rgba(84, 112, 198, 0.05)' },
					]),
				},
			},
			{
				name: 'Accumulated Deposits',
				type: 'line',
				data: accumulatedDeposits,
				smooth: true,
				lineStyle: {
					width: 2,
					color: '#91cc75',
					type: 'dashed',
				},
			},
			{
				name: 'Accumulated Withdrawals',
				type: 'line',
				data: accumulatedWithdrawals,
				smooth: true,
				lineStyle: {
					width: 2,
					color: '#ee6666',
					type: 'dashed',
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-6-accumulated-volume.png');
	chart.dispose();
}

// 14. Cumulative Growth Dashboard (multi-panel)
function createDashboard() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT * 2);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const prices = chronologicalData.map((d) => weiToDecimal(d.svZCHFPrice));
	const totalAssets = chronologicalData.map((d) =>
		weiToDecimal(d.totalAssets),
	);
	const accumulativeYields = chronologicalData.map((d) =>
		formatYield(d.accumulativeYield),
	);
	const netFlows = chronologicalData.map((d) => {
		const deposits = weiToDecimal(d.deposits);
		const withdrawals = weiToDecimal(d.withdrawals);
		return deposits - withdrawals;
	});

	const priceBounds = calculateAxisBounds(prices, 5);
	const assetBounds = calculateAxisBounds(totalAssets, 10);
	const yieldBounds = calculateAxisBounds(accumulativeYields, 15);
	const flowBounds = calculateAxisBounds(netFlows, 20);

	const option = {
		title: [
			{
				text: 'Cumulative Growth Dashboard',
				left: 'center',
				top: 20,
				textStyle: {
					fontSize: 28,
					fontWeight: 'bold',
				},
			},
			{
				text: 'Price',
				left: '12%',
				top: '12%',
				textStyle: { fontSize: 16 },
			},
			{
				text: 'Total Assets',
				right: '12%',
				top: '12%',
				textStyle: { fontSize: 16 },
			},
			{
				text: 'Accumulative Yield',
				left: '12%',
				top: '54%',
				textStyle: { fontSize: 16 },
			},
			{
				text: 'Net Flow',
				right: '12%',
				top: '54%',
				textStyle: { fontSize: 16 },
			},
		],
		grid: [
			{
				left: '8%',
				right: '52%',
				top: '18%',
				bottom: '52%',
				containLabel: true,
			},
			{
				left: '52%',
				right: '8%',
				top: '18%',
				bottom: '52%',
				containLabel: true,
			},
			{
				left: '8%',
				right: '52%',
				top: '60%',
				bottom: '10%',
				containLabel: true,
			},
			{
				left: '52%',
				right: '8%',
				top: '60%',
				bottom: '10%',
				containLabel: true,
			},
		],
		xAxis: [
			{
				type: 'category',
				data: dates,
				gridIndex: 0,
				axisLabel: { show: false },
			},
			{
				type: 'category',
				data: dates,
				gridIndex: 1,
				axisLabel: { show: false },
			},
			{
				type: 'category',
				data: dates,
				gridIndex: 2,
				axisLabel: {
					rotate: 45,
					interval: Math.floor(dates.length / 5),
					fontSize: 10,
				},
			},
			{
				type: 'category',
				data: dates,
				gridIndex: 3,
				axisLabel: {
					rotate: 45,
					interval: Math.floor(dates.length / 5),
					fontSize: 10,
				},
			},
		],
		yAxis: [
			{
				type: 'value',
				gridIndex: 0,
				scale: true,
				min: priceBounds.min,
				max: priceBounds.max,
				axisLabel: {
					fontSize: 10,
					formatter: (v: number) => v.toFixed(4),
				},
				splitNumber: 4,
			},
			{
				type: 'value',
				gridIndex: 1,
				scale: true,
				min: assetBounds.min,
				max: assetBounds.max,
				axisLabel: { fontSize: 10, formatter: formatLargeNumber },
				splitNumber: 4,
			},
			{
				type: 'value',
				gridIndex: 2,
				scale: true,
				min: 0,
				max: yieldBounds.max,
				axisLabel: {
					fontSize: 10,
					formatter: (v: number) => `${v.toFixed(1)}%`,
				},
				splitNumber: 4,
			},
			{
				type: 'value',
				gridIndex: 3,
				scale: true,
				min: flowBounds.min,
				max: flowBounds.max,
				axisLabel: { fontSize: 10, formatter: formatLargeNumber },
				splitNumber: 4,
			},
		],
		series: [
			{
				name: 'Price',
				type: 'line',
				xAxisIndex: 0,
				yAxisIndex: 0,
				data: prices,
				smooth: true,
				lineStyle: { width: 2, color: '#5470c6' },
				showSymbol: false,
			},
			{
				name: 'Total Assets',
				type: 'line',
				xAxisIndex: 1,
				yAxisIndex: 1,
				data: totalAssets,
				smooth: true,
				lineStyle: { width: 2, color: '#91cc75' },
				areaStyle: { opacity: 0.3 },
				showSymbol: false,
			},
			{
				name: 'Accumulative Yield',
				type: 'line',
				xAxisIndex: 2,
				yAxisIndex: 2,
				data: accumulativeYields,
				smooth: true,
				lineStyle: { width: 2, color: '#fac858' },
				showSymbol: false,
			},
			{
				name: 'Net Flow',
				type: 'bar',
				xAxisIndex: 3,
				yAxisIndex: 3,
				data: netFlows,
				itemStyle: {
					color: (params: any) =>
						params.value >= 0 ? '#91cc75' : '#ee6666',
				},
			},
		],
	};

	chart.setOption(option);
	saveChart(chart, 'chart-14-cumulative-dashboard.png');
	chart.dispose();
}

// Main execution
async function generateAllCharts() {
	console.log('🎨 Generating charts with Apache ECharts...\n');

	try {
		createPriceChart();
		createYieldChart();
		createNetFlowChart();
		createTotalAssetsChart();
		createTransactionVolumeChart();
		createAccumulatedVolumeChart();
		createActivityHeatmap();
		createDashboard();

		console.log('\n✨ All charts generated successfully!');
		console.log(`📁 Charts saved to: ${EXPORTS_DIR}`);
	} catch (error) {
		console.error('❌ Error generating charts:', error);
		process.exit(1);
	}
}

generateAllCharts();
