import "mapbox-gl/dist/mapbox-gl.css";
import Box from "@mui/material/Box";
import { useStore } from "../state/store";
import React from "react";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { getMapConfig, mapLayers } from "../config/map";

export const MapTooltip: React.FC<{
  geographyTooltips: ReturnType<typeof getMapConfig>[number]['tooltipKeys'];
  mapLayerTooltips: typeof mapLayers[number]['tooltipKeys'];
}> = ({
  mapLayerTooltips,
  geographyTooltips
}) => {
  const config = mapLayers.find(f => f.tooltipKeys === mapLayerTooltips)

  const tooltip = useStore((state) => state.tooltip);
  if (!tooltip) return null;
  return (
    <Box
      component={"div"}
      sx={{
        position: "absolute",
        left: tooltip.x,
        top: tooltip.y,
        padding: "0.5rem",
        background: "rgba(255,255,255,0.95)",
        // shadow
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        zIndex: 1000,
        fontSize: "0.75rem",
        transform: `translate(${tooltip.flipX ? "calc(-100% - 0.5rem)" : "0.5rem"}, ${tooltip.flipY ? "calc(-100% - 0.5rem)" : "0.5rem"})`,
        pointerEvents: "none",
      }}
    >
      <List style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {!!mapLayerTooltips &&
          Object.entries(mapLayerTooltips).map(([key, value]) => (
            <ListItem key={key}>
              <Typography component="p">
                <b>{value || "Data"}:</b>{" "}
                {!!tooltip?.data?.[key]
                  ? config?.tooltipFormatter?.(tooltip?.data?.[key])  || tooltip?.data?.[key]?.toLocaleString()
                  : "N/A"}
              </Typography>
            </ListItem>
          ))}
        {!!geographyTooltips &&
          Object.entries(geographyTooltips).map(([key, value]) => (
            <ListItem key={key}>
              <Typography component="p">
                <b>{value || "Data"}:</b>{" "}
                {(tooltip?.data?.[key] as string) || "N/A"}
              </Typography>
            </ListItem>
          ))}
      </List>
    </Box>
  );
};