import React from "react";
import { FilterSpec, OptionLabel } from "../types/state";
import { DATA_URL } from "../utils/queries";

export const useOptions = (spec: FilterSpec) => {
  const [options, setOptions] = React.useState<OptionLabel[]>(
    spec.options.type === "static" ? spec.options.values : []
  );

  React.useEffect(() => {
    if (
      spec.options.type === "dynamic" &&
      spec.options.value &&
      spec.options.label
    ) {
      fetch(`${DATA_URL}/lookup/${spec.options.lookup}.json`)
        .then((response) => response.json())
        .then((data) => {
          const options = data.map((item: any) => ({
            // @ts-ignore
            value: item[spec.options.value],
            // @ts-ignore
            label: item[spec.options.label].replace(/_/g, " "),
            ...item
          }));
          setOptions(options);
        });
    }
  }, []);

  return options;
};
