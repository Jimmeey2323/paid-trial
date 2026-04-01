import React from "react"
import ReactDOM from "react-dom/client"

import App from "./App"
import "./index.css"

function installPerformanceCompatibilityShim() {
  if (typeof window === "undefined") {
    return
  }

  const performanceApi = window.performance as Performance & {
    clearMarks?: (markName?: string) => void
    clearMeasures?: (measureName?: string) => void
    mark?: (markName: string, markOptions?: PerformanceMarkOptions) => PerformanceMark
    measure?: (
      measureName: string,
      startOrMeasureOptions?: string | PerformanceMeasureOptions,
      endMark?: string,
    ) => PerformanceMeasure
  }

  if (!performanceApi) {
    return
  }

  if (typeof performanceApi.clearMarks !== "function") {
    performanceApi.clearMarks = () => undefined
  }

  if (typeof performanceApi.clearMeasures !== "function") {
    performanceApi.clearMeasures = () => undefined
  }

  if (typeof performanceApi.mark !== "function") {
    performanceApi.mark = (() => ({
      detail: null,
      duration: 0,
      entryType: "mark",
      name: "",
      startTime: 0,
      toJSON: () => ({}),
    })) as Performance["mark"]
  }

  if (typeof performanceApi.measure !== "function") {
    performanceApi.measure = (() => ({
      detail: null,
      duration: 0,
      entryType: "measure",
      name: "",
      startTime: 0,
      toJSON: () => ({}),
    })) as Performance["measure"]
  }
}

installPerformanceCompatibilityShim()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
