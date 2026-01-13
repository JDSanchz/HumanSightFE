import React from "react";

const renderMessage = (previewRoot, message) => {
  previewRoot.render(
    React.createElement("p", { className: "placeholder" }, message),
  );
};

const renderScores = (scores) =>
  scores
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((entry) =>
      React.createElement(
        "li",
        { key: entry.label },
        React.createElement("span", { className: "label" }, entry.label),
        React.createElement(
          "span",
          { className: "score" },
          `${(entry.score * 100).toFixed(1)}%`,
        ),
      ),
    );

const renderPreviewGrid = (previewRoot, items) => {
  const cards = items.map((item) => {
    const previewMedia = item.url
      ? React.createElement("img", { src: item.url, alt: item.name })
      : React.createElement(
          "div",
          { className: "preview-skeleton" },
          "Preparing preview...",
        );

    const scoreList =
      item.scores?.length > 0
        ? React.createElement(
            "ul",
            { className: "score-list" },
            renderScores(item.scores),
          )
        : null;

    const statusText =
      item.error?.length > 0
        ? `Error: ${item.error}`
        : item.status === "done"
          ? "Analysis complete"
          : item.status === "loading"
            ? "Analyzing..."
            : "Queued";

    const loader =
      item.status === "loading"
        ? React.createElement("div", { className: "loader" })
        : null;

    return React.createElement(
      "article",
      { className: "preview-card", key: item.id },
      previewMedia,
      React.createElement(
        "div",
        { className: "preview-meta" },
        React.createElement("span", { className: "name" }, item.name),
        React.createElement(
          "div",
          { className: "status-row" },
          React.createElement("p", { className: "status" }, statusText),
          loader,
        ),
        scoreList,
      ),
    );
  });

  previewRoot.render(
    React.createElement("div", { className: "preview-grid" }, cards),
  );
};

const setDownloadState = (downloadPeopleButton, enabled) => {
  if (!downloadPeopleButton) {
    return;
  }
  downloadPeopleButton.disabled = !enabled;
};

const updateThresholdLabels = (peopleRange, peopleValue) => {
  if (!peopleRange || !peopleValue) {
    return;
  }
  peopleValue.textContent = `${peopleRange.value}%`;
};

const updateRecommendedTooltip = (peopleRecommendation, recommendedThreshold) => {
  if (!peopleRecommendation) {
    return;
  }
  const label = `Recommended: ${recommendedThreshold}% based on model performance.`;
  peopleRecommendation.setAttribute("aria-label", label);
  peopleRecommendation.dataset.tooltip = label;
};

const setProgressVisible = (progress, visible) => {
  if (!progress) {
    return;
  }
  if (visible) {
    progress.hidden = false;
    requestAnimationFrame(() => {
      progress.classList.add("is-active");
    });
    return;
  }
  progress.classList.remove("is-active");
  const transitionMs = 300;
  window.setTimeout(() => {
    if (!progress.classList.contains("is-active")) {
      progress.hidden = true;
    }
  }, transitionMs);
};

const updateProgress = (
  { progressBar, progressText, progressCount },
  completed,
  total,
) => {
  if (!progressBar || !progressText || !progressCount) {
    return;
  }
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal);
  const percent = safeTotal ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  progressBar.style.width = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", String(percent));
  if (!safeTotal) {
    progressText.textContent = "Waiting for images...";
  } else if (safeCompleted >= safeTotal) {
    progressText.textContent = "Analysis complete";
  } else {
    progressText.textContent = "Analyzing images...";
  }
  progressCount.textContent = `${safeCompleted}/${safeTotal}`;
};

const updateLimitHint = (limitHint, maxFiles) => {
  if (!limitHint) {
    return;
  }
  limitHint.textContent = `Choose up to ${maxFiles} images to preview and analyze.`;
};

export {
  renderMessage,
  renderPreviewGrid,
  setProgressVisible,
  setDownloadState,
  updateProgress,
  updateLimitHint,
  updateRecommendedTooltip,
  updateThresholdLabels,
};
