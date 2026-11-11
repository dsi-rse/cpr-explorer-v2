import { useEffect } from "react";
import { staticData, useStore } from "../state/store";
import { WidgetContainer } from "./WidgetContainer";
import { FilterControls } from "./FilterControls";
import { timeseriesViews } from "../config/filters";
import { useParentSize } from "@visx/responsive";
import TimeseriesChart from "./TimeseriesChart";
import { LoadingStateShade } from "./LoadingShade";
import { FilterListBox } from "./FilterListBox";
import { isDisplay } from "../utils/queryParams";
import { END_YEAR } from "../manifest";

export const TimeseriesWidget = () => {
  // const executeQuery = useStore((state) => state.executeQuery);
  // const filterKeys = useStore((state) => state.filterKeys);
  // const shouldQuery = useRef(false);
  // const setTimeseriesType = useStore((state) => state.setTimeseriesType);
  const { width, height, parentRef } = useParentSize();
  const uiFilters = useStore((state) => state.uiFilters);
  const dateFilter = uiFilters.find((f) => f.label === "Date Range");
  const setLoadingState = useStore((state) => state.setLoadingState);
  const timeseriesType = useStore((state) => state.timeseriesType);
  const currentConfig = timeseriesViews.find(
    (view) => view.label === timeseriesType
  );
  const loadingState = useStore((state) => state.loadingState);

  useEffect(() => {
    if (loadingState === "loaded" && staticData.length > 0) {
      const dateInData = staticData[0].hasOwnProperty(currentConfig?.dateCol);
      const dataInData = currentConfig?.dataCol.every(dataCol => staticData[0].hasOwnProperty(dataCol))
      if (!dateInData || !dataInData) {
        setLoadingState("error");
      }
    }
  }, [loadingState])
  return (
    <WidgetContainer>
      <FilterControls />
      <div
        style={{
          position: "relative",
          padding: "1rem",
          height: isDisplay ? "100vh" : "75vh",
          flex: 1,
        }}
        ref={parentRef}
      >
        <LoadingStateShade loadingState={loadingState} />
        <TimeseriesChart
          data={staticData}
          width={width}
          height={height}
          // @ts-ignore
          minDate={dateFilter?.value[0] || `${END_YEAR}-01`}
          // @ts-ignore
          maxDate={dateFilter?.value[1] || `${END_YEAR}-12`}
          keyCol={currentConfig?.keyCol || "ai_class"}
          dateCol={currentConfig?.dateCol || "monthyear"}
          // @ts-ignore
          dataCol={currentConfig?.dataCol || ["lbs_chm_used"]}
          loadingState={loadingState}
        />
        <FilterListBox />
      </div>
    </WidgetContainer>
  );
};
