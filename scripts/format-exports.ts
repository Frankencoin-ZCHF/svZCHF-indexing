import { formatUnits } from 'viem';
import { writeFileSync } from 'fs';
import { data } from '../exports/data-2026-01-04';

function formatToFloat(value: string, digits: number) {
	return parseFloat(formatUnits(BigInt(value), digits));
}

const formatted = [...data].reverse().map((i) => ({
	...i,

	depositCount: parseInt(i.depositCount),
	deposits: formatToFloat(i.deposits, 18),

	withdrawCount: parseInt(i.withdrawCount),
	withdrawals: formatToFloat(i.withdrawals, 18),

	svZCHFPrice: formatToFloat(i.svZCHFPrice, 18),

	impliedYield: formatToFloat(i.impliedYield, 4),
	nativeYield: formatToFloat(i.nativeYield, 4),

	totalAssets: formatToFloat(i.totalAssets, 18),
	totalShares: formatToFloat(i.totalShares, 18),
}));

// Convert to CSV
function arrayToCSV(data: any[]): string {
	if (data.length === 0) return '';

	const headers = Object.keys(data[0]);
	const csvContent = [
		headers.join(','),
		...data.map((row) =>
			headers
				.map((header) => {
					const value = row[header];
					// Escape values that contain commas, quotes, or newlines
					if (
						typeof value === 'string' &&
						(value.includes(',') ||
							value.includes('"') ||
							value.includes('\n'))
					) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value;
				})
				.join(',')
		),
	].join('\n');

	return csvContent;
}

// Export to CSV file
const csvData = arrayToCSV(formatted);
const filename = `exports/formatted-data-${
	new Date().toISOString().split('T')[0]
}.csv`;
writeFileSync(filename, csvData);

console.log(`CSV exported to: ${filename}`);
console.log(`Total records: ${formatted.length}`);
