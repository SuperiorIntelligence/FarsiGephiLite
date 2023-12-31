import { flatMap, isNumber, keyBy, last, mapValues, max, min, uniq } from "lodash";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Slider, { SliderProps } from "rc-slider";
import cx from "classnames";

import { useFiltersActions } from "../../core/context/dataContexts";
import { RangeFilterType } from "../../core/filters/types";
import { graphDatasetAtom, parentFilteredGraphAtom } from "../../core/graph";
import { findRanges, shortenNumber } from "./utils";
import { useReadAtom } from "../../core/utils/atoms";

interface RangeValue {
  min: number;
  max: number;
  values: number[];
}

interface RangeMetric {
  unit: number;
  step: number;
  min: number;
  max: number;
  maxCount: number;
  ranges: RangeValue[];
}

const RANGE_STYLE = {
  dotStyle: { borderColor: "#ccc" },
  railStyle: { backgroundColor: "#ccc" },
  activeDotStyle: { borderColor: "black" },
  trackStyle: [{ backgroundColor: "black" }, { backgroundColor: "black" }],
};

export const RangeFilterEditor: FC<{ filter: RangeFilterType }> = ({ filter }) => {
  const parentGraph = useReadAtom(parentFilteredGraphAtom);

  const { t } = useTranslation();
  const { replaceCurrentFilter } = useFiltersActions();

  const [rangeMetric, setRangeMetric] = useState<RangeMetric>();

  useEffect(() => {
    const attributes = filter.itemType === "nodes" ? graphDatasetAtom.get().nodeData : graphDatasetAtom.get().edgeData;

    const values = flatMap(filter.itemType === "nodes" ? parentGraph.nodes() : parentGraph.edges(), (itemId) => {
      const v = attributes[itemId][filter.field];
      if (v && (typeof v === "number" || !isNaN(+v))) return [v];
      return [];
    }) as number[];
    const minValue = min(values);
    const maxValue = max(values);
    if (minValue && maxValue) {
      const { unit, ranges } = findRanges(minValue, maxValue);
      const rangeValues = ranges.map((range) => {
        const rangeValues = values.filter((v) => v >= range[0] && v < range[1]);
        return {
          min: range[0],
          max: range[1],
          values: rangeValues,
        };
      });

      setRangeMetric({
        min: ranges[0][0],
        max: (last(ranges) || ranges[0])[1],
        step: unit < 1 || unit >= 10 ? unit / 10 : 1,
        unit,
        ranges: rangeValues,
        maxCount: Math.max(...rangeValues.map((r) => r.values.length)),
      });
    }
  }, [filter.itemType, filter.field, parentGraph]);

  const marks: SliderProps["marks"] = rangeMetric
    ? mapValues(
        keyBy(
          uniq(
            rangeMetric.ranges
              .flatMap((r) => [r.min, r.max])
              .concat([filter.min || rangeMetric.min, filter.max || rangeMetric.max]),
          ),
        ),
        (v) =>
          v === filter.min || v === filter.max
            ? {
                label: shortenNumber(v),
                style: { fontWeight: "bold", background: "white", padding: "0 0.2em", zIndex: 1 },
              }
            : { label: " ", style: { fontWeight: "bold", background: "white", padding: "0 0.2em", zIndex: 1 } },
      )
    : {};

  return rangeMetric ? (
    <form onSubmit={(e) => e.preventDefault()}>
      {rangeMetric.max !== rangeMetric.min ? (
        <ul className="list-unstyled range-filter">
          {(rangeMetric.ranges || []).map((range) => {
            const globalCount = range.values.length;
            const filteredCount = range.values.filter(
              (v) => !filter.min || (v >= filter.min && (!filter.max || v < filter.max)),
            ).length;
            const filteredHeight = (filteredCount / rangeMetric.maxCount) * 100;
            const isLabelInside = filteredHeight > 90;

            return (
              <div className="bar" key={range.min}>
                <div className="global" style={{ height: (globalCount / rangeMetric.maxCount) * 100 + "%" }} />
                <div
                  className="filtered"
                  style={{
                    height: filteredHeight + "%",
                  }}
                >
                  {filteredCount !== 0 && (
                    <span className={cx("label", isLabelInside ? "inside" : "outside")}>
                      {shortenNumber(filteredCount)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </ul>
      ) : (
        <div className="badge bg-warning p-2 mb-2 mt-2">{t("filters.inapplicable")}</div>
      )}

      <Slider
        className="pb-3"
        range
        disabled={rangeMetric.min === rangeMetric.max}
        value={
          [
            filter.min !== undefined ? filter.min : rangeMetric?.min,
            filter.max !== undefined ? filter.max : rangeMetric?.max,
          ].filter((n) => isNumber(n)) as number[]
        }
        {...rangeMetric}
        marks={marks}
        onChange={(value) => {
          if (Array.isArray(value)) {
            const [minSelected, maxSelected] = value;
            replaceCurrentFilter({ ...filter, min: minSelected, max: maxSelected });
          }
        }}
        allowCross={false}
        {...RANGE_STYLE}
      />

      <div className="d-flex">
        <div className="d-flex align-items-center mt-1">
          <input
            className="form-control form-control-sm"
            id="min"
            type="number"
            disabled={rangeMetric.min === rangeMetric.max}
            min={rangeMetric?.min}
            // max={filter.max}
            step={rangeMetric?.step}
            value={filter.min || ""}
            placeholder={"" + rangeMetric?.min}
            onChange={(e) => {
              const newMin = +e.target.value;
              replaceCurrentFilter({ ...filter, min: newMin });
            }}
          />
          <label className="form-check-label small ms-1" htmlFor="min">
            {t("common.min")}
          </label>
        </div>
        <div className="d-flex align-items-center mt-1 ms-1">
          <input
            className="form-control form-control-sm "
            id="max"
            type="number"
            disabled={rangeMetric.min === rangeMetric.max}
            min={filter.min}
            max={rangeMetric?.max}
            step={rangeMetric?.step}
            placeholder={"" + rangeMetric?.max}
            value={filter.max || ""}
            onChange={(e) => {
              const newMax = +e.target.value;
              replaceCurrentFilter({ ...filter, max: newMax });
            }}
          />
          <label className="form-check-label small ms-1" htmlFor="max">
            {t("common.max")}
          </label>
        </div>
      </div>
      <div>
        <input
          className="form-check-input me-2"
          disabled={rangeMetric.min === rangeMetric.max}
          type="checkbox"
          id="keepMissingValues"
          checked={filter.keepMissingValues}
          onChange={(e) => {
            replaceCurrentFilter({ ...filter, keepMissingValues: e.target.checked });
          }}
        />
        <label className="from-check-label" htmlFor="keepMissingValues">
          {t("filters.keepMissingValues")}
        </label>
      </div>
    </form>
  ) : null;
};

export const RangeFilter: FC<{
  filter: RangeFilterType;
  active?: boolean;
  editMode?: boolean;
}> = ({ filter, editMode, active }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="fs-5">
        {filter.field} ({t(`graph.model.${filter.itemType}`)})
      </div>
      {editMode ? (
        <RangeFilterEditor filter={filter} />
      ) : (
        <div>
          <span className="fs-5">
            {filter.min ? `${filter.min}` : "∞"} - {filter.max ? `${filter.max}` : "∞"}
          </span>{" "}
        </div>
      )}
    </div>
  );
};
