import { create } from "zustand";
import { FilterState, State } from "../types/state";
import {
  allFilterSections,
  timeseriesFiltersNotDateRange,
  timeseriesViews,
} from "../config/filters";
import { getMapConfig } from "../config/map";
import { unpack } from "msgpackr/unpack";
import { exportData } from "../utils/packageAndZipData";
import { infillTimeseries } from "../utils/timeseries";
import { wrapper } from "../utils/stateUtils";
import { findExistingFilter } from "../utils/findExistingFilter";
import { constructQuery } from "../utils/constructQuery";
import { deepCloneRecords } from "../utils/deepCloneRecords";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export let staticData: any = [];
// ACS columns joined onto every geography: Median HH Income, Pop *, Pct *
const isDemographicColumn = (key: string) =>
  key === "Median HH Income" || /^(Pop|Pct) /.test(key);
const timeoutDuration = 500;
let timeoutFn: any = null;

const defaultMapConfig = getMapConfig("map");

const defaultViewConfig = {
  view: "map",
  config: {
    endpoint: defaultMapConfig[0].endpoint,
    filterKeys: defaultMapConfig[0].filterKeys
  } as any
};

export const useStore = create<State>(
  wrapper((set, get) => ({
    download: (format, indices, sortKeys) => {
      const view = get().view;

      const info: any = {
        map: {
          Geography: get().geography,
        },
        timeseries: {
          "Time Series Grouping": get().timeseriesType,
        },
      };
      const filterKeys = get().filterKeys;
      const filters = get().queriedFilters.filter((f) =>
        filterKeys.includes(f.label)
      );
      const availableFiltersNotUsed = filterKeys
        .filter((f) => !filters.find((u) => u.label === f))
        .map((f) => ({
          label: f,
          value: "Not Used",
        }));

      const allFilters = [...filters, ...availableFiltersNotUsed];

      let outputData = indices
        ? indices.map((i) => staticData[i])
        : staticData;

      if (view === "map" || view === "mapDualView") {
        // drop areas with no pesticide use for the current filters
        outputData = outputData.filter(
          (row: Record<string, unknown>) => row.lbs_chm_used != null
        );
      }
      if (view === "map") {
        // demographic columns only ship with the demographic view
        outputData = outputData.map((row: Record<string, unknown>) =>
          Object.fromEntries(
            Object.entries(row).filter(([key]) => !isDemographicColumn(key))
          )
        );
      }

      const sortFn = !sortKeys
        ? null
        : Array.isArray(sortKeys)
        ? (a: any, b: any) => {
            const aKey = sortKeys.map((key) => a[key]).join("");
            const bKey = sortKeys.map((key) => b[key]).join("");
            return aKey.localeCompare(bKey);
          }
        : (a: any, b: any) => a[sortKeys].localeCompare(b[sortKeys]);

      const sortedOutputData = sortFn ? outputData.sort(sortFn) : outputData;

      exportData(
        format,
        get().view,
        allFilters,
        sortedOutputData,
        view in info ? info[view] : undefined
      );
    },
    timestamp: 0,
    alwaysApplyFilters: localStorage.getItem("alwaysApplyFilters") === "true",
    toggleAlwaysApplyFilters: () => {
      set((state) => {
        const newValue = !state.alwaysApplyFilters;
        localStorage.setItem("alwaysApplyFilters", newValue.toString());
        return { alwaysApplyFilters: newValue };
      });
    },
    loadingState: "unloaded" as State["loadingState"],
    geography: defaultMapConfig[0].layer!,
    queryEndpoint: defaultViewConfig.config.endpoint,
    mapLayer: "pesticide-use",
    view: defaultViewConfig.view,
    setView: (view: string) => {
      let loadingState: any = 'settings-changed'
      let timeseriesConfig: any = {}

      let uiFilters = get().uiFilters;

      const geography = get().geography;
      const mapViewConfig =
        view === "map" || view === "mapDualView"
          ? getMapConfig(view)?.find((f) => f.layer == geography) ||
            defaultMapConfig[0]
          : ({} as any);

      let filterKeys = timeseriesConfig?.filterKeys || [];
      if (view === "timeseries") {
        const existingFilter = uiFilters.find(
          (f) =>
            timeseriesFiltersNotDateRange.includes(f.label) &&
            (((Array.isArray(f.value || f.valueLabels) ||
              typeof (f.value || f.valueLabels) === "string") &&
              ((f.value as any[])?.length ||
                (f.valueLabels as any[])?.length)) ||
              typeof f.value === "number")
        );
        const existingLabel = existingFilter?.label as string;

        if (existingLabel) {
          timeseriesConfig = timeseriesViews.find((view) =>
            view.filterKeys.includes(existingLabel as any)
          );
          filterKeys = timeseriesConfig.filterKeys || [];
        } else {
          // const newFilters: FilterState[] =
          //   timeseriesConfig?.defaultFilterOptions || [];
          // uiFilters = uiFilters.filter((f) =>
          //   newFilters.every((nf) => nf.queryParam !== f.queryParam)
          // );

          // uiFilters = [...uiFilters, ...newFilters];
          loadingState = 'timeseries-none'
        }
      } else if (view.toLowerCase().includes("map")) {
        filterKeys = mapViewConfig.filterKeys || [];
      }

      const timeseriesType = timeseriesConfig?.label || get()?.timeseriesType;
      const queryEndpoint =
        timeseriesConfig.endpoint ||
        mapViewConfig.endpoint ||
        get().queryEndpoint;

      set({
        view,
        loadingState,
        queryEndpoint,
        geography,
        uiFilters,
        // @ts-ignore
        filterKeys,
        timeseriesType,
      });

      get().executeQuery();
    },
    timeseriesType: undefined,//timeseriesViews[0].label,
    setTimeseriesType: (type: string) => {
      const timeseriesConfig = timeseriesViews.find(
        (view) => view.label === type
      );
      if (timeseriesConfig) {
        const filterKeys = (timeseriesConfig.filterKeys ||
          []) as unknown as string[];
        const previousFilters = get().uiFilters.filter((f) =>
          filterKeys.includes(f.label)
        );
        // const defaultFilter =
        //   timeseriesConfig?.defaultFilterOptions &&
        //   !previousFilters.find(
        //     (f) => f.label === timeseriesConfig?.defaultFilterOptions?.[0].label
        //   )
        //     ? (timeseriesConfig?.defaultFilterOptions as unknown as FilterState[])
        //     : ([] as FilterState[]);
        set({
          timeseriesType: type,
          filterKeys,
          queryEndpoint: timeseriesConfig?.endpoint || "",
          uiFilters: [
            ...previousFilters,
            //  ...defaultFilter
          ],
          loadingState: "timeseries-none",
        });
      }
    },
    queriedFilters: [],
    uiFilters: allFilterSections.flatMap((section) =>
      section.filters
        .filter((f) => f.alwaysInclude)
        .map((filter) => ({
          queryParam: filter.queryParam,
          value: filter.default || null,
          label: filter.label,
          valueLabels: filter.defaultLabel || filter.default || null,
        }))
    ),
    filterKeys: defaultViewConfig.config.filterKeys || [],
    setFilterKeys: (keys) => set({ filterKeys: keys }),
    tooltip: undefined,
    setTooltip: (tooltip) => set({ tooltip }),
    setFilter: (filter: FilterState & { index?: number }) =>
      set((state) => {
        const filterKey = filter.queryParam;
        const existingFilterByKey = findExistingFilter(
          state.uiFilters,
          filterKey
        );
        if (existingFilterByKey) {
          return {
            loadingState: "settings-changed",
            uiFilters: state.uiFilters.map((f) =>
              JSON.stringify(f.queryParam) === JSON.stringify(filterKey)
                ? filter
                : f
            ),
          };
        } else {
          return {
            loadingState: "settings-changed",
            uiFilters: [...state.uiFilters, filter],
          };
        }
      }),
    setQueryEndpoint: (endpoint) => set({ queryEndpoint: endpoint }),
    setLoadingState: (loadingState) => set({ loadingState }),
    executeQuery: async () => {
      set({ loadingState: "loading" });
      const queryEndpoint = get().queryEndpoint;
      const { uiFilters, filterKeys, timeseriesType, view } = get();
      // if is timeseries and filters that are not date ragen is empty or greater than 10
      // error
      if (view === "timeseries") {
        const timeseriesConfig = timeseriesViews.find(
          (view) => view.label === timeseriesType
        );
        if (!timeseriesConfig) return;
        const filterState = uiFilters.find(
          (filter) => filter.label === timeseriesConfig.mainFilterKey
        );
        const filterExists = Array.isArray(filterState?.value)
          ? filterState?.value.length > 0
          : filterState?.value !== null;

        if (!filterExists || !filterState) {
          set({
            loadingState: "timeseries-none",
          });
          return;
        }
        const filterGoodLength = Array.isArray(filterState?.value)
          ? filterState?.value.length <= 10
          : true;
        if (!filterGoodLength) {
          set({
            loadingState: "timeseries-too-many",
          });
          return;
        }
      }
      const url = constructQuery(
        `${import.meta.env.VITE_DATA_ENDPOINT}${queryEndpoint}`,
        uiFilters,
        filterKeys
      );

      const timestamp = performance.now();
      const agFilter =
        uiFilters.find((f) => f.queryParam === "usetype")?.value !== "AG";

      if (
        get().view.toLowerCase().includes("map") &&
        get().geography !== "Counties" &&
        agFilter
      ) {
        set({
          loadingState: "ag-on-not-counties",
          queriedFilters: deepCloneRecords(uiFilters),
          timestamp,
        });
        return;
      }

      const response = await fetch(url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        staticData = unpack(buffer as Buffer);
        if (get().view === "timeseries") {
          if (!staticData.length){
            const retryResponse = await fetch(url.replace("format=msgpack", "format=json"));
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              staticData = retryData;
            }
          }
          const config = timeseriesViews.find(
            (view) => view.label === get().timeseriesType
          );
          const filters = get().uiFilters;
          const dateRange = filters.find(
            (filter) => filter.label === "Date Range"
          );
          staticData = infillTimeseries(
            staticData,
            config,
            dateRange?.value as string[],
            filters
          );
        }
        // @ts-ignore
        window.staticData = staticData;
        if (staticData.length === 0) {
          set({
            loadingState: "no-data",
            queriedFilters: deepCloneRecords(uiFilters),
            timestamp,
          });
        } else {
          set({
            loadingState: "loaded",
            queriedFilters: deepCloneRecords(uiFilters),
            timestamp,
          });
        }
      } else {
        set({ loadingState: "error", timestamp });
      }
    },
    setGeography: (geography) => {
      const view = get().view;
      const geoData = getMapConfig(view).find(
        (config) => config.layer === geography
      );
      if (geoData) {
        set({
          geography,
          queryEndpoint: geoData.endpoint,
          loadingState: "settings-changed",
          filterKeys: geoData.filterKeys || [],
        });
      }
    },
    setMapLayer: (mapLayer) => set({ mapLayer }),
    setSaveMessage: (message) => set({ saveMessage: message }),
    saveMessage: undefined,
    saveQueries: (title, format) => {
      const output = {
        uiFilters: get().uiFilters,
        view: get().view,
        geography: get().geography,
        timeseriesType: get().timeseriesType,
        mapLayer: get().mapLayer,
      };

      const date = new Date().toISOString();
      const cleanTitle = title?.length
        ? title
        : `Pesticide Explorer Query ${date}`;
      const compressed = compressToEncodedURIComponent(JSON.stringify(output));
      switch (format) {
        case "download":
          const blob = new Blob([JSON.stringify(output)], {
            type: "application/json",
          });
          const saveUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = saveUrl;
          a.download = `${cleanTitle}.json`;
          a.click();
          set({ saveMessage: "Query JSON downloaded" });
          break;
        case "url":
          const url = new URL(window.location.href);
          url.searchParams.set("query", compressed);
          window.history.pushState({}, "", url.toString());
          // copy to clipboard
          navigator.clipboard.writeText(url.toString());
          set({
            saveMessage: `Use this URL to share your data filter selections with others:\n\n ${url}\n\n(The URL has been copied to your clipboard)`,
          });
          break;
        case "localStorage":
          let prev = JSON.parse(localStorage.getItem("saved-queries") || "[]");
          const titleInUse = prev?.find((f: any) => f.title === cleanTitle);
          if (titleInUse) {
            prev = prev.filter((f: any) => f.title !== cleanTitle);
          }
          prev = [
            ...prev,
            {
              title,
              date: new Date().toISOString(),
              data: compressed,
            },
          ];
          localStorage.setItem("saved-queries", JSON.stringify(prev));
          set({ saveMessage: "Queried saved to your browser" });
          break;
      }
    },
    loadQueries: (title, format, _args) => {
      let args = {
        ...(_args || {}),
      };
      switch (format) {
        case "url":
          const url = new URL(window.location.href);
          const urlQuery = url.searchParams.get("query");
          if (urlQuery) {
            args = JSON.parse(decompressFromEncodedURIComponent(urlQuery));
          }
          break;
        case "download":
          break;
        case "localStorage":
          const prev = JSON.parse(
            localStorage.getItem("saved-queries") || "[]"
          );
          const localStorageQuery = prev.find((f: any) => f.title === title);
          if (localStorageQuery) {
            args = JSON.parse(
              decompressFromEncodedURIComponent(localStorageQuery.data)
            );
          }
          break;
      }
      switch (args.view) {
        case "timeseries":
          const timeseriesType = timeseriesViews.find(
            (view) => view.label === args.timeseriesType
          );
          if (timeseriesType) {
            args = {
              ...args,
              // @ts-ignore
              filterKeys: timeseriesType.filterKeys || [],
              queryEndpoint: timeseriesType.endpoint,
            };
          }
          break;
        case "mapDualView":
        case "map":
          const view = args.view || "map";
          const geoData = getMapConfig(view).find(
            (config) => config.layer === args.geography
          );
          if (geoData) {
            args = {
              ...args,
              queryEndpoint: geoData.endpoint,
              filterKeys: geoData.filterKeys || [],
            };
            break;
          }
      }
      set({
        ...args,
        loadingState: "settings-changed",
      });
    },
  }))
);

useStore.subscribe((state, prev) => {
  const somethingChanged =
    state.uiFilters !== prev.uiFilters ||
    state.alwaysApplyFilters !== prev.alwaysApplyFilters ||
    state.geography !== prev.geography ||
    state.view !== prev.view;
  if (state.alwaysApplyFilters && somethingChanged) {
    if (timeoutFn) {
      clearTimeout(timeoutFn);
    }
    timeoutFn = setTimeout(() => {
      state.executeQuery();
    }, timeoutDuration);
  }
});
