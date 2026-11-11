import React, { useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Modal,
  Typography,
} from "@mui/material";
import { theme } from "../main";
import { Checkbox } from "@mui/material";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { FilterState, State } from "../types/state";
import { useStore } from "../state/store";
import { styled, useMediaQuery } from "@mui/system";
import { useMobileFiltersState } from "./FilterControls";
import { TabButton } from "./TabButton";
import { END_YEAR, START_YEAR } from "../manifest";

interface JoyrideState {
  run: boolean;
  steps: Step[];
}
let sub: () => void = () => {};

const QuickstartHeaderRow = styled(Box)`
  display: flex;
  flex-direction: row;
  flex: 0;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 600px) {
    flex-direction: column;
    position: relative;
  }
`;

const QuickstartContainer = styled(Box)`
  height: 50vh;
  background-color: white;
  width: 75vw;
  left: 12.5vw;
  top: 25vh;
  position: absolute;
  border-radius: 0.25rem;
  background: white;
  border: 2px solid ${(theme) => (theme as any)?.palette?.secondary?.main};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  @media (max-width: 600px) {
    width: 95vw;
    left: 2.5vw;
    height: 95vh;
    top: 2.5vh;
  }
`;

const QuickstartCloseButton = styled(Button)`
  flex: 0;
  height: 2rem;
  width: 1rem;
  margin: 0 1rem;
  @media (max-width: 600px) {
    position: absolute;
    top: 1rem;
    right: 0;
  }
`;

const filtersState = (open: boolean = true) =>
  useMobileFiltersState.setState({ open });
const getStepLogic: (
  state: State,
  setStepIndex: React.Dispatch<React.SetStateAction<number>>
) => Record<number, () => void> = (state, setStepIndex) => {
  return {
    0: () => {
      if (state.view !== "map") {
        state.setView("map");
      }
      filtersState();
    },
    1: () => {
      filtersState();
    },
    2: () => {
      filtersState();
      sub = useStore.subscribe((state) => {
        const geographyChanged = state.geography === "Counties";
        if (geographyChanged) {
          sub();
          setStepIndex((p) => p + 1);
        }
      });
    },
    3: () => {
      filtersState();
      if (state.geography !== "Counties") {
        sub();
        state.setGeography("Counties");
      }
      sub = useStore.subscribe((state) => {
        const dateRange = state.uiFilters.find((f) => f.label === "Date Range");
        // @ts-ignore
        const yearIs2021 = dateRange?.value?.[0]?.slice(0, 4) === `${END_YEAR-1}`;
        if (yearIs2021) {
          sub();
          setStepIndex((p) => p + 1);
        }
      });
    },
    4: () => {
      filtersState();
      const dateRange = state.uiFilters.find((f) => f.label === "Date Range");
      // @ts-ignore
      const yearIs2021 = dateRange?.value?.[0]?.slice(0, 4) === `${END_YEAR-1}`;
      if (!yearIs2021) {
        const newFilter = {
          ...(dateRange as FilterState),
          value: [`${END_YEAR-1}-01`, `${END_YEAR}-12`],
          valueLabels: [`${END_YEAR-1}-01`, `${END_YEAR}-02`],
        };
        sub();
        state.setFilter(newFilter);
      }

      sub = useStore.subscribe((state, prev) => {
        const loadingStateChanged = state.loadingState !== prev.loadingState;
        if (loadingStateChanged) {
          sub();
          setStepIndex((p) => p + 1);
        }
      });
    },
    5: () => {
      filtersState(false);
      if (state.loadingState === "settings-changed") {
        sub();
        state.executeQuery();
      }
    },
    6: () => {
      filtersState(false);
      sub = useStore.subscribe((state) => {
        const viewIsTimeseries = state.view === "timeseries";
        if (viewIsTimeseries) {
          sub();
          setStepIndex((p) => p + 1);
        }
      });
    },
    7: () => {
      if (state.view !== "timeseries") {
        sub();
        state.setView("timeseries");
      }
    },
    8: () => {
      if (state.view === "timeseries") {
        state.setView("timeseries");
      }
    },
    9: () => {
      state.setView("mapDualView");
    },
    10: () => {
      state.setView("map");
    },
  };
};

const defaultStepProps = {
  // styles: {
  //   buttonNext: {
  //     display: "none",
  //   },
  // },
  disableCloseOnEsc: true,
  disableOverlayClose: true,
  hideFooter: true,
};

const getSteps: (StepButtons: React.FC, isDesktop: boolean) => Step[] = (
  StepButtons,
  isDesktop
) => {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  // if is safari, add css to the page
  if (isSafari) {
    const style = document.createElement("style");
    style.innerHTML = `
      .__floater__open {
        transition: transform 0s !important;
      }
      .__floater__open[x-placement="bottom-start"] {
        transform: translateX(-50%) !important;
        left: 50vw !important;
        top: 50vh !important;
      }
      .__floater__open[x-placement="top"] {
        transform: translateX(-50%) !important;
        left: 50vw !important;
        top: 10vh !important;
      }
    `;
    document.head.appendChild(style);
  }

  return [
    {
      // 0
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Let's begin our tour
          </Typography>
          <Typography variant="body1">
            Click "Next" to proceed to the next step, and click "Back" to return
            to the previous step. At any time, cick on the background or the "x"
            in the top right to exit the tour.
            <br />
            <br />
            You can restart the tour at any time by clicking the "Quickstart"
            button on the top of the application.
          </Typography>
          <StepButtons />
        </Box>
      ),
      placement: "center",
      target: "body",
      ...defaultStepProps,
    },
    {
      // 1
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Selecting Data Filters
          </Typography>
          <Typography variant="body1">
            This tool allows you to filter data by a variety of characteristics,
            like geography, data, and pesticide active ingredients.
          </Typography>
          <StepButtons />
        </Box>
      ),
      placement: isDesktop ? "right" : "center",
      target: "#filter-controls",
      ...defaultStepProps,
    },
    {
      // 2
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Selecting Data Filters
          </Typography>
          <Typography variant="body1">
            {isDesktop
              ? `To start, change the geography to "Counties"`
              : `Click next to change the geography to "Counties"`}
          </Typography>
          <StepButtons />
        </Box>
      ),
      spotlightClicks: true,
      placement: isDesktop ? "right" : "center",
      spotlightPadding: 40,
      target: "#filter-controls",
      ...defaultStepProps,
    },
    {
      // 3
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Selecting Data Filters
          </Typography>
          <Typography variant="body1">
            Next change the date range.{" "}
            {isDesktop
              ? `Try changing the year to start in 2021.`
              : `Click next to change the year to start in 2021.`}
          </Typography>
          <StepButtons />
        </Box>
      ),
      spotlightClicks: true,
      placement: isDesktop ? "right" : "auto",
      spotlightPadding: 40,
      target: "#filter-controls",
      ...defaultStepProps,
    },
    {
      // 4
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Selecting Data Filters
          </Typography>
          <Typography variant="body1">
            {isDesktop ? (
              <>
                To apply your selections, click "Apply Changes" at the top of
                the box, or on the map/chart when you use the application later.
                <br />
                <br />
                You can automatically apply changes in your selections by
                clicking the checkbox labeled "automatically Apply Changes"
              </>
            ) : (
              <>
                To apply your selections, you can select "Apply Changes" at the
                top of the box, or on the map/chart when you use the application
                later. Select next to continue.
                <br />
                <br />
                You can automatically apply changes in your selections by
                clicking the checkbox labeled "automatically Apply Changes"
              </>
            )}
          </Typography>
          <StepButtons />
        </Box>
      ),
      spotlightClicks: true,
      placement: isDesktop ? "right" : "auto",
      target: "#filter-controls",
      ...defaultStepProps,
    },
    {
      // 5
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Updating your data view
          </Typography>
          <Typography variant="body1">
            After loading, you should see the map update to show pesticide use
            based on your selections.
          </Typography>
          <StepButtons />
        </Box>
      ),
      target: "#data-view",
      ...defaultStepProps,

      placement: isDesktop ? "right" : "auto",
    },
    {
      // 6
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Changing the data view
          </Typography>
          <Typography variant="body1">
            Next, let's look at a different data view.{" "}
            {isDesktop
              ? `Click on "Use Over Time" on
          the navigation bar above.`
              : `Click next to change the view to "Use Over Time"`}
          </Typography>
          <StepButtons />
        </Box>
      ),
      spotlightClicks: true,
      target: "#nav-container",
      placement: "bottom",
      ...defaultStepProps,
    },
    {
      // 7
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Changing the data view
          </Typography>
          <Typography variant="body1">
            Whenever possible, the settings from one data view will carry over
            to another. In this case, our date range ({END_YEAR-1}-01 to {END_YEAR}-12)
            carried over from the map view.
          </Typography>
          <StepButtons />
        </Box>
      ),
      spotlightClicks: true,
      target: "#data-view",
      placement: isDesktop ? "bottom" : "center",
      ...defaultStepProps,
    },
    {
      // 8
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Timeseries data view
          </Typography>
          <Typography variant="body1">
            This view enables you to see pesticide use over time. You can see
            usage over time for different categories, like active ingredient,
            pesticide class, or pesticide type.
            <br />
            <br />
            You must select at least one option in your selected category to see
            data. You can choose up to 10 options to compare.
          </Typography>
          <StepButtons />
        </Box>
      ),
      target: "#data-view",
      placement: isDesktop ? "bottom" : "center",
      ...defaultStepProps,
    },
    {
      // 8
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Demographic Comparison View
          </Typography>
          <Typography variant="body1">
            The final view allows you to see pesticide use side-by-side with
            demographic data from the US Census American Community Survey.
            <br />
            <br />
            Since we last looked at Microbial and Organic pesticide use on the
            timeseries view and Counties on the map view, this data
            visualization automatically filters to those selections.
          </Typography>
          <StepButtons />
        </Box>
      ),
      placement: isDesktop ? "bottom" : "center",
      target: "#data-view",
      ...defaultStepProps,
    },
    {
      // 9
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Download Data, Table View, and Sharing Data
          </Typography>
          <Typography variant="body1">
            Last, you can download data, view data in a table, save your
            selections to return later, and share your selections with others.
            <br />
            <br />
            Data can be download as an Excel file or CSV, and includes your
            selected filters, data dictionary, and data license.
          </Typography>
          <StepButtons />
        </Box>
      ),
      placement: "top",
      target: "#meta-data-stuff",
      ...defaultStepProps,
    },
    {
      // 10
      content: (
        <Box>
          <Typography component="h3" mb={2} fontWeight={"bold"}>
            Thank you!
          </Typography>
          <Typography variant="body1">
            Thank you for exploring this tool! To learn more about the data and
            methodology, see the "About" section in the top right of the
            application.
          </Typography>
          <StepButtons />
        </Box>
      ),
      placement: "center",
      target: "body",
      ...defaultStepProps,
    },
  ];
};

const stepLength = 11;

export const Quickstart: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const isDesktop = useMediaQuery("(min-width:1024px)");

  const StepButtons = () => (
    <Box
      width="100%"
      justifyContent="space-between"
      flexDirection={"row"}
      display="flex"
      mt={2}
    >
      <Button onClick={() => setStepIndex((p) => p - 1)} variant="outlined">
        Back
      </Button>
      <Button
        onClick={() => {
          setStepIndex((p) => p + 1);
          if (stepIndex === stepLength - 1) {
            onClose();
          }
        }}
        variant="contained"
      >
        {stepIndex < stepLength - 2 ? "Next" : "Finish"}
      </Button>
    </Box>
  );

  const openOnLoadPreference = localStorage.getItem("showQuickStart");
  const [joyrideState, setJoyrideState] = useState<JoyrideState>({
    run: false,
    steps: getSteps(() => <StepButtons />, isDesktop),
  });
  const { run, steps } = joyrideState;

  const handleClickStart = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setIsOpen(false);
    setStepIndex(0);
    setJoyrideState((p) => ({
      ...p,
      run: true,
    }));
  };

  const state = useStore();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;
    if (action === "close") {
      onClose();
      return;
    }

    if (type === "step:before") {
      const logic = getStepLogic(state, setStepIndex);
      logic.hasOwnProperty(index) && logic[index]();
    }
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setJoyrideState((p) => ({ ...p, run: false }));
      onClose();
    }
  };

  const handleToggleClosePreference = () => {
    if (openOnLoadPreference === null) {
      localStorage.setItem("showQuickStart", "0");
    } else {
      localStorage.removeItem("showQuickStart");
    }
  };

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        run={run}
        scrollToFirstStep
        stepIndex={stepIndex}
        showProgress
        steps={steps}
        styles={{
          options: {
            zIndex: 1299,
          },
        }}
      />
      <Modal
        open={isOpen}
        onClose={joyrideState.run ? () => {} : onClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <QuickstartContainer>
          <Box
            sx={{
              position: "relative",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            {/* close button */}
            <QuickstartHeaderRow>
              <Typography component="h2" variant="h5" padding="1rem">
                Quickstart: Pesticide Explorer
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    onClick={handleToggleClosePreference}
                    defaultChecked={openOnLoadPreference !== null}
                  />
                }
                label="Do not show this on load"
              />
              <QuickstartCloseButton onClick={onClose} variant="contained">
                &times;
              </QuickstartCloseButton>
            </QuickstartHeaderRow>
            <Box
              sx={{
                borderTop: `2px solid ${theme.palette.secondary.main}`,
                overflowY: "scroll",
                padding: "1rem",
              }}
            >
              <Typography variant="body1">
                This tool helps to you explore California's Pesticide Use
                Reporting (PUR) data alongside demographic census data. With
                this tool you can:
                <ul>
                  <li>
                    View pesticide use a township, county, school district, zip
                    code, census tract, and section geographic scales
                  </li>
                  <li>
                    Explore the use of specific active ingredients, products,
                    site usage (commodities), and other pesticide use
                    characteristics
                  </li>
                  <li>
                    Filter data month by month from {START_YEAR} to {END_YEAR}, and see data
                    used over time (use over time view)
                  </li>
                  <li>
                    See data side-by-side with census demographic data to see
                    which communities may be more exposed to pesticide use
                    (demographic comparison view)
                  </li>
                </ul>
                To get started, try out our{" "}
                <TabButton
                  onClick={handleClickStart}
                  sx={{
                    color: "white",
                    backgroundColor: theme.palette.primary.main,
                  }}
                >
                  application tour
                </TabButton>
              </Typography>
              <Typography variant="body2" fontStyle={"italic"} mt={2}>
                Presented by the Open Spatial Lab at the University of Chicago
                Data Science Institute in collaboration with Californians for
                Pesticide Reform (CPR) and Pesticide Action & Agroecology
                Network (PAN).
                <br />
                Data are sourced from the California Department of Pesticide
                Regulation (CDPR) California Pesticide Information Portal
                project (CalPIP) and the US Census Bureau.
              </Typography>
            </Box>
          </Box>
        </QuickstartContainer>
      </Modal>
    </>
  );
};
