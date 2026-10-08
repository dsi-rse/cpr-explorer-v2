const percentFormmater = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0
})

const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export const cleanLabel = (value: any, label?:string): string => {

  if (label?.toLocaleLowerCase()?.includes("percent") && typeof value === 'number') {
    // percent filters are stored 0-100
    return `${percentFormmater.format(value / 100)}`;
  }
  if (label?.toLocaleLowerCase()?.includes("Income") && typeof value === 'number') {
    return `${dollarFormatter.format(value)}`;
  }
  // replace _ with space
  // add space around /
  // remove -
  return `${value}`.replace(/_/g, ' ').replace(/\//g, ' / ').replace(/-/g, '');
}