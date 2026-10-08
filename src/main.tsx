import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import createTheme from "@mui/material/styles/createTheme";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import "./index.css";
import { getDb } from "./utils/db";
import { page } from "./utils/queryParams";
import { Validation } from "./components/Validation";

export const theme = createTheme({
  // primary accent color rgb((96, 158, 66)
  palette: {
    primary: {
      main: "#557794",
    },
    secondary: {
      main: "#609E42",
    },
  },
  typography: {
    fontFamily: [
      "Rubik",
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...ownerState,
          textTransform: "none",
          }),
      }
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          '& .MuiCheckbox-root + .MuiFormControlLabel-label': {
            fontSize: '0.75rem'
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.component === 'p' && {
            fontSize: '0.75rem'
          }),
        }),
      },
    },
    // listitem
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: 0,
          margin: 0,
          fontSize: "0.75rem"
        },
      },
    },
  },
});

// fetch the DuckDB wasm while the page settles, so the first query doesn't wait for it
(window.requestIdleCallback ?? setTimeout)(() => getDb().catch(() => {}));

ReactDOM.createRoot(document.getElementById("explorer-app-root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {page === "validation" ? <Validation /> : <App />}
    </ThemeProvider>
  </React.StrictMode>
);
