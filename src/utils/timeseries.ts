import { FilterState } from "../types/state";

export const getDateRangeStrings = (dateRange: string[]) => {
  // YYYY-MM
  const [start, end] = dateRange;
  let current = start;
  const dates = [];
  const maxIters = 1000;
  let i = 0;

  while (current <= end) {
    i++;

    if (i > maxIters) {
      break;
    }
    dates.push(current);
    const [year, month] = current.split("-").map((v) => parseInt(v));
    const nextMonth = (month % 12) + 1;
    const nextMonthString = nextMonth.toString().padStart(2, "0");
    let yearString = year.toString();
    if (nextMonth === 1) {
      yearString = (year + 1).toString();
    }
    current = `${yearString}-${nextMonthString}`;
  }
  return dates;
};

// const findValueLabel = (value: string, filter: FilterState) => {
//   if (typeof filter.value === "string" && filter.value === value) {
//     return filter.valueLabels || filter.value;
//   }
//   if (Array.isArray(filter.value) && Array.isArray(filter.valueLabels)) {
//     const strValues = filter.value.map((v) => v.toString());
//     // @ts-ignore
//     const index = strValues.indexOf(value);
//     if (index !== -1) {
//       return filter.valueLabels[index];
//     }
//   }
//   return value;
// };

export const infillTimeseries = (
  data: Record<string, any>[],
  config: any,
  dateRange: string[],
  filters: FilterState[]
) => {
  const { keyCol, dataCol, dateCol, labelMapping, isMultipleCategory } = config;

  let labelList = labelMapping
    ? filters.find((f) => f.label === labelMapping)
    : null;

  const labelDict = {};

  if (
    labelList?.value &&
    labelList?.valueLabels &&
    Array.isArray(labelList.value) &&
    Array.isArray(labelList.valueLabels)
  ) {
    labelList?.value?.forEach((value: any, index: number) => {
      // @ts-ignore
      labelDict[isNaN(+value) ? value : +value] = labelList.valueLabels[index];
    });
    if (isMultipleCategory) {
      const n = labelList.value.length;
      for (let r = 2; r <= n; r++) {
        for (let indices of combinations(n, r)) {
          // order by id to match the relevantKeys.sort() keys in cleanMultiCategoryData
          // @ts-ignore
          indices.sort((a, b) => (String(labelList.value[a]) < String(labelList.value[b]) ? -1 : 1));
          // @ts-ignore 9/27 no time available for correct typing
          const keys = indices.map((i) =>
            // @ts-ignore
          isNaN(+labelList.value[i])
          // @ts-ignore
          ? labelList.value[i]
          // @ts-ignore
              : +labelList.value[i]
          );
          // @ts-ignore 9/27 no time available for correct typing
          const labels = indices.map((i) => labelList.valueLabels[i]);
          // @ts-ignore 9/27 no time available for correct typing
          labelDict[keys.join("|")] = labels.join(", ");
        }
      }
    }
  }

  const dates = getDateRangeStrings(dateRange);

  const columns = data?.length
    ? Object.keys(data[0])
    : [keyCol, dataCol[0], dateCol];
  const cleanedData = isMultipleCategory
    ? cleanMultiCategoryData(
        data,
        dates,
        dataCol,
        keyCol,
        dateCol,
        columns,
        labelDict
      )
    : cleanSingleCategoryData(
        data,
        dates,
        dataCol,
        keyCol,
        dateCol,
        columns,
        labelDict
      );

  return cleanedData;
};

function combinations(n: number, r: number): number[][] {
  const result: number[][] = [];

  function backtrack(start: number, current: number[]) {
    if (current.length === r) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < n; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

const cleanSingleCategoryData = (
  data: Record<string, any>[],
  dates: string[],
  dataCol: string,
  keyCol: string,
  dateCol: string,
  columns: string[],
  labelDict: Record<string, any>
) => {
  const labelDictKeys = Object.keys(labelDict).map((key) =>
    isNaN(+key) ? key : +key
  );

  let dateIndex = 0;
  let entriesInYear: string[] = [];
  const cleanedData = [];
  for (let i = 0; i < data.length; i++) {
    let record = data[i];
    const key = isNaN(+record[keyCol]) ? record[keyCol] : +record[keyCol];
    record[keyCol] = labelDict[key as keyof typeof labelDict] || key;
    const date = record[dateCol];
    const rowDateIndex = dates.indexOf(date);

    if (rowDateIndex !== dateIndex) {
      const missingDates = dates.slice(dateIndex, rowDateIndex);
      for (const missingDate of missingDates) {
        const missingEntries = labelDictKeys.filter(
          // @ts-ignore
          (key) => !entriesInYear.includes(key)
        );
        entriesInYear = [];
        for (const missingEntry of missingEntries) {
          const newRecord: any = {};
          columns.forEach((col) => {
            if (col === keyCol) {
              // @ts-ignore
              newRecord[col] = labelDict[missingEntry] || missingEntry;
            } else if (col === dataCol) {
              newRecord[col] = 0;
            } else if (col === dateCol) {
              newRecord[col] = missingDate;
            } else {
              newRecord[col] = 0;
            }
          });
          cleanedData.push(newRecord);
        }
      }
    }

    dateIndex = rowDateIndex;
    entriesInYear.push(key);
    cleanedData.push(record);
  }
  return cleanedData;
};

const cleanMultiCategoryData = (
  _data: Record<string, any>[],
  dates: string[],
  dataCols: string[],
  keyCol: string,
  dateCol: string,
  _columns: string[],
  labelDict: Record<string, any>
) => {
  const data = _data.filter((f) => f[keyCol]?.length);
  const labelKeys = Object.keys(labelDict);
  const singleCategory = labelKeys.length === 1;
  const cleanedData: Record<string, any>[] = [];
  const categoryTotals: Record<string, number> = {};
  // Initialize category totals
  Object.keys(labelDict).forEach((key) => {
    categoryTotals[key] = 0;
  });

  // Process existing data
  const dataByDate: Record<string, Record<string, Record<string, number>>> = {};
  data.forEach((record) => {
    const date = record[dateCol];
    if (!dataByDate[date]) {
      dataByDate[date] = {};
    }

    if (singleCategory) {
      if (!dataByDate[date][labelKeys[0]]) {
        dataByDate[date][labelKeys[0]] = {}
      }
      
      dataCols.forEach((dataCol) => {
        const value = Number(record[dataCol]);
        const prevValue = (dataByDate[date][labelKeys[0]][dataCol] || 0)
        dataByDate[date][labelKeys[0]][dataCol] = prevValue + value;
      });
    } else {
      const recordKeys = record[keyCol].split("|");
      const relevantKeys = recordKeys.filter((key: string) => labelKeys.includes(key));
      if (relevantKeys.length > 0) {
        const categoryKey = relevantKeys.sort().join("|");

        if (!dataByDate[date][categoryKey]) {
          dataByDate[date][categoryKey] = {}
        }
        dataCols.forEach((dataCol) => {
          const value = Number(record[dataCol]);
          const prevValue =  dataByDate[date][categoryKey][dataCol] || 0
          dataByDate[date][categoryKey][dataCol] = prevValue + value;
        });
      }
    }
  });
  // Infill missing dates and categories
  dates.forEach((date) => {
    const dateData = dataByDate[date] || {};
    Object.keys(labelDict).forEach((category) => {
      const entry = dateData[category] || {};
      categoryTotals[category] += entry[dataCols[0]];
      const newRecord: Record<string, any> = {
        [dateCol]: date,
        [keyCol]: labelDict[category],
      };
      dataCols.forEach(dataCol => {
        const value = entry[dataCol]
        newRecord[dataCol] = value;
      })

      cleanedData.push(newRecord);
    });
  });

  // Filter out categories with zero total
  const activeCategories = Object.keys(categoryTotals).filter(
    (category) => categoryTotals[category] > 0
  );
  const filteredData = cleanedData.filter((record) =>
    activeCategories.includes(
      Object.keys(labelDict).find((key) => labelDict[key] === record[keyCol]) ||
        ""
    )
  );

  return filteredData;
};
