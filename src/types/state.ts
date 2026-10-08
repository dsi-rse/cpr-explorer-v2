export type OptionLabel = {
  value: string | number;
  label: string;
  filterKeys?: string[];
}

export type DynamicOptionSpec = OptionLabel & {
  endpoint: string;
}

export type OptionFilterSpec = {
  column: string;
  type: ">" | "<" | "=" | "in" | "not in";
  value: any;
};

export type FilterSpec = {
  queryParam: string | [string, string];
  label: string;
  subLabel?: string;
  subcolumn?: string;
  options: {
    type: 'static';
  } & {values: OptionLabel[] }| {
    type: 'dynamic';
  } & DynamicOptionSpec;
  component: 'radio' | 'autocomplete' | 'dropdown' | 'range' | 'date' | 'month-range' | 'autocomplete-no-list';
  alwaysInclude?: boolean;
  range?: number[];
  default?: string | string[] | number | number[];
  defaultLabel?: string | string[] | number | number[];
  format?: 'percent' | 'dollars',
  optionFilter?: Omit<OptionFilterSpec, 'value'> & {
    interface: 'slider' | 'select';
    range?: [number, number];
    title?: string;
  }
}

export type FilterState = Pick<FilterSpec, 'queryParam' | 'label'> & {
  value: string | string[] | number | number[] | null;
  valueLabels: string | string[] | number | number[] | null;
}
type LoadingStates = 'unloaded' | 'settings-changed' | 'loading' | 'loaded' | 'error' | 'no-data' | 'timeseries-none' | 'timeseries-too-many' | 'ag-on-not-counties'

export type State = {
  download: (foramt: string, indices?: number[], sortKeys?: string | string[]) => void;
  loadingState: LoadingStates;
  alwaysApplyFilters: boolean;
  toggleAlwaysApplyFilters: () => void;
  geography: string;
  mapLayer: string
  view: string;
  setView: (view: string) => void;
  setGeography: (geography: string) => void;
  setMapLayer: (mapLayer: string) => void;
  setLoadingState: (loadingState: LoadingStates) => void;

  timeseriesType?: string;
  setTimeseriesType: (type: string) => void;
  
  queriedFilters: FilterState[];
  uiFilters: FilterState[];
  filterKeys: string[];
  setFilterKeys: (keys: string[]) => void;
  setFilter: (filter: FilterState) => void;
  
  queryEndpoint: string;
  setQueryEndpoint: (endpoint: string) => void;
  executeQuery: () => void;
  timestamp: number;

  tooltip?: {
    x: number;
    y: number;
    flipX?: boolean;
    flipY?: boolean;
    data: Record<string, unknown>;
  },
  setTooltip: (tooltip: State['tooltip']) => void;
  saveQueries: (title: string, format: string) => void;
  loadQueries: (title: string, format: string, args: Partial<State>) => void;
  saveMessage?: string;
  setSaveMessage: (message: string) => void;
}

