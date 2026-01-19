import * as echarts from 'echarts';
import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { data } from '../exports/data-2026-01-19.js';

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

// Calculate rolling 30-day annualized yield
function calculateRolling30DayYield(data: typeof chronologicalData) {
	const results = [];

	for (let i = 0; i < data.length; i++) {
		const currentEntry = data[i];
		const currentTimestamp = Number(currentEntry.timestamp);
		const currentPrice = weiToDecimal(currentEntry.svZCHFPrice);

		// Filter entries from last 30 days (using actual timestamps)
		const thirtyDaysAgo = currentTimestamp - 30 * 24 * 60 * 60 * 1000;
		const last30Days = data.slice(0, i + 1).filter((entry) => {
			const entryTimestamp = Number(entry.timestamp);
			return entryTimestamp >= thirtyDaysAgo;
		});

		// Need at least 2 data points to calculate yield
		if (last30Days.length < 2) {
			results.push({ date: currentEntry.date, rolling30DayYield: null });
			continue;
		}

		// Get the oldest entry in the 30-day window
		const oldestEntry = last30Days[0];
		const oldPrice = weiToDecimal(oldestEntry.svZCHFPrice);
		const oldTimestamp = Number(oldestEntry.timestamp);

		// Calculate actual time difference in seconds (timestamps already in correct scale)
		const timeDiffSeconds = currentTimestamp - oldTimestamp;

		// Avoid division by zero
		if (timeDiffSeconds === 0 || oldPrice === 0) {
			results.push({ date: currentEntry.date, rolling30DayYield: null });
			continue;
		}

		// Calculate yield and annualize
		const priceChange = (currentPrice - oldPrice) / oldPrice;
		const secondsInYear = 365.25 * 24 * 60 * 60;
		const annualizedYield =
			(priceChange * secondsInYear * 1000) / timeDiffSeconds * 100;

		results.push({
			date: currentEntry.date,
			rolling30DayYield: annualizedYield,
		});
	}

	return results;
}

// Create Rolling 30-Day Yield Chart
function createRollingYieldChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const rollingYieldData = calculateRolling30DayYield(chronologicalData);
	const rollingYields = rollingYieldData.map((d) => d.rolling30DayYield);
	const nativeYields = chronologicalData.map((d) =>
		formatYield(d.nativeYield),
	);

	// Filter out null values for bounds calculation
	const validRollingYields = rollingYields.filter(
		(y) => y !== null,
	) as number[];
	const allYields = [...validRollingYields, ...nativeYields];
	const yieldBounds = calculateAxisBounds(allYields, 15);

	const option = {
		title: {
			text: 'Rolling 30-Day vs Native Yield',
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
					if (param.value !== null) {
						result += `${param.seriesName}: ${param.value.toFixed(2)}%<br/>`;
					}
				});
				return result;
			},
		},
		legend: {
			data: ['Rolling 30-Day Yield', 'Native Yield'],
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
				name: 'Rolling 30-Day Yield',
				type: 'line',
				data: rollingYields,
				smooth: true,
				lineStyle: {
					width: 3,
					color: '#91cc75',
				},
				connectNulls: false,
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

	const buffer = (chart.getDom() as any).toBuffer('image/png');
	fs.writeFileSync(
		path.join(EXPORTS_DIR, 'chart-rolling-30day-yield.png'),
		buffer,
	);
	console.log('✅ Generated: chart-rolling-30day-yield.png');

	chart.dispose();
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

// Create Rolling 30-Day Yield with Net Volume Chart
function createRollingYieldWithVolumeChart() {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	const dates = chronologicalData.map((d) => d.date);
	const rollingYieldData = calculateRolling30DayYield(chronologicalData);
	const rollingYields = rollingYieldData.map((d) => d.rolling30DayYield);

	// Calculate net volume (deposits - withdrawals)
	const netVolumes = chronologicalData.map((d) => {
		const deposits = weiToDecimal(d.deposits);
		const withdrawals = weiToDecimal(d.withdrawals);
		return deposits - withdrawals;
	});

	// Filter out null values for bounds calculation
	const validRollingYields = rollingYields.filter(
		(y) => y !== null,
	) as number[];
	const yieldBounds = calculateAxisBounds(validRollingYields, 15);
	const volumeBounds = calculateAxisBounds(netVolumes, 20);

	const option = {
		title: {
			text: 'Rolling 30-Day Yield with Net Volume',
			left: 'center',
			textStyle: {
				fontSize: 24,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross',
				crossStyle: {
					color: '#999',
				},
			},
			formatter: (params: any) => {
				let result = `${params[0].name}<br/>`;
				params.forEach((param: any) => {
					if (param.seriesName === 'Rolling 30-Day Yield' && param.value !== null) {
						result += `${param.seriesName}: ${param.value.toFixed(2)}%<br/>`;
					} else if (param.seriesName === 'Net Volume') {
						const sign = param.value >= 0 ? '+' : '';
						result += `${param.seriesName}: ${sign}${formatLargeNumber(param.value)} CHF<br/>`;
					}
				});
				return result;
			},
		},
		legend: {
			data: ['Rolling 30-Day Yield', 'Net Volume'],
			top: 40,
		},
		grid: {
			left: 100,
			right: 100,
			top: 100,
			bottom: 80,
		},
		xAxis: {
			type: 'category',
			data: dates,
			axisPointer: {
				type: 'shadow',
			},
			axisLabel: {
				rotate: 45,
				interval: Math.floor(dates.length / 10),
			},
		},
		yAxis: [
			{
				type: 'value',
				name: 'Yield (%)',
				position: 'left',
				scale: true,
				min: 0,
				max: yieldBounds.max,
				axisLabel: {
					formatter: (value: number) => `${value.toFixed(1)}%`,
				},
				splitNumber: 5,
			},
			{
				type: 'value',
				name: 'Net Volume (CHF)',
				position: 'right',
				scale: true,
				min: volumeBounds.min,
				max: volumeBounds.max,
				axisLabel: {
					formatter: formatLargeNumber,
				},
				splitNumber: 6,
			},
		],
		series: [
			{
				name: 'Rolling 30-Day Yield',
				type: 'line',
				yAxisIndex: 0,
				data: rollingYields,
				smooth: true,
				lineStyle: {
					width: 3,
					color: '#91cc75',
				},
				connectNulls: false,
			},
			{
				name: 'Net Volume',
				type: 'bar',
				yAxisIndex: 1,
				data: netVolumes,
				itemStyle: {
					color: (params: any) => {
						return params.value >= 0 ? 'rgba(145, 204, 117, 0.6)' : 'rgba(238, 102, 102, 0.6)';
					},
				},
			},
		],
	};

	chart.setOption(option);

	const buffer = (chart.getDom() as any).toBuffer('image/png');
	fs.writeFileSync(
		path.join(EXPORTS_DIR, 'chart-rolling-yield-with-volume.png'),
		buffer,
	);
	console.log('✅ Generated: chart-rolling-yield-with-volume.png');

	chart.dispose();
}

// Main execution
async function generateChart() {
	console.log('🎨 Generating rolling 30-day yield charts...\n');

	try {
		createRollingYieldChart();
		createRollingYieldWithVolumeChart();
		console.log('\n✨ All charts generated successfully!');
		console.log(`📁 Charts saved to: ${EXPORTS_DIR}`);
	} catch (error) {
		console.error('❌ Error generating charts:', error);
		process.exit(1);
	}
}

generateChart();
