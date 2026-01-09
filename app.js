import React from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";

const input = document.getElementById("file-input");
const preview = document.getElementById("preview");
const status = document.getElementById("status");
const health = document.getElementById("health");
const results = document.getElementById("results");
const downloadPeopleButton = document.getElementById("download-people");
const peopleRange = document.getElementById("people-range");
const peopleValue = document.getElementById("people-value");
const appDescription = document.getElementById("app-description");
const dismissDescription = document.getElementById("dismiss-description");
const limitHint = document.getElementById("limit-hint");
const devFlag = document.getElementById("dev-flag");

const previewRoot = createRoot(preview);
const resultsRoot = createRoot(results);
let activeItems = [];
let completedItems = [];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const rawLimit = import.meta.env.VITE_LIMIT ?? import.meta.env.LIMIT;
const parsedLimit = Number.parseInt(rawLimit, 10);
const MAX_FILES =
  Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
const PEOPLE_LABEL = "people";

const renderMessage = (message) => {
  previewRoot.render(
    React.createElement("p", { className: "placeholder" }, message),
  );
};

const revokeUrls = (items) => {
  items.forEach((item) => {
    if (item.url) {
      URL.revokeObjectURL(item.url);
    }
  });
};

const resetPreview = (message) => {
  revokeUrls(activeItems);
  activeItems = [];
  completedItems = [];
  setDownloadState(false);
  renderMessage(message);
};

const renderResultsMessage = (message) => {
  resultsRoot.render(
    React.createElement("p", { className: "placeholder" }, message),
  );
};

const updateHealth = (message, state) => {
  if (!health) {
    return;
  }
  health.textContent = message;
  if (state) {
    health.dataset.state = state;
  } else {
    delete health.dataset.state;
  }
};

const pingHealth = async () => {
  if (!health) {
    return;
  }
  updateHealth("API: checking...", "pending");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(bodyText || `HTTP ${response.status}`);
    }
    let healthMessage = "API: ok";
    try {
      const data = JSON.parse(bodyText);
      if (data?.status) {
        healthMessage = `API: ${data.status}`;
      }
    } catch {
      // Non-JSON response; default to ok.
    }
    updateHealth(healthMessage, "ok");
  } catch (error) {
    updateHealth("API: unavailable", "error");
  } finally {
    clearTimeout(timeoutId);
  }
};

const setDownloadState = (enabled) => {
  downloadPeopleButton.disabled = !enabled;
};

const updateThresholdLabels = () => {
  peopleValue.textContent = `${peopleRange.value}%`;
};

updateThresholdLabels();
pingHealth();

if (limitHint) {
  limitHint.textContent = `Choose up to ${MAX_FILES} images to preview and analyze.`;
}

if (devFlag) {
  devFlag.hidden = !Number.isFinite(parsedLimit) || parsedLimit <= 0;
}

if (dismissDescription && appDescription) {
  dismissDescription.addEventListener("click", () => {
    appDescription.remove();
  });
}

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

const renderPreviewGrid = (items) => {
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

const resizeImageForUpload = async (file, scale = 0.5, maxBytes = 200 * 1024) => {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }

  if (!bitmap) {
    return file;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return file;
  }

  const targetType =
    file.type === "image/jpeg" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";

  const toBlobWithQuality = (quality, width, height) => {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (result) => resolve(result || file),
        targetType,
        quality,
      );
    });
  };

  let currentScale = scale;
  let currentQuality = targetType === "image/jpeg" ? 0.9 : 0.92;
  let blob = await toBlobWithQuality(
    currentQuality,
    bitmap.width * currentScale,
    bitmap.height * currentScale,
  );

  const minQuality = 0.5;
  const minScale = 0.2;
  const maxAttempts = 8;
  let attempts = 0;

  while (blob.size > maxBytes && attempts < maxAttempts) {
    attempts += 1;
    if (currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, currentQuality - 0.1);
    } else {
      currentScale = Math.max(minScale, currentScale * 0.85);
    }

    blob = await toBlobWithQuality(
      currentQuality,
      bitmap.width * currentScale,
      bitmap.height * currentScale,
    );
  }

  bitmap.close();
  return new File([blob], file.name, { type: blob.type || file.type });
};

const analyzeImage = async (file, resizedFile = null) => {
  const formData = new FormData();
  const uploadFile = resizedFile || (await resizeImageForUpload(file));
  formData.append("file", uploadFile);

  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to analyze image.");
  }

  return response.json();
};

renderMessage("Your preview will appear here.");
renderResultsMessage("Analysis results will appear here.");
setDownloadState(false);

const downloadZip = async (items, filename) => {
  const zip = new JSZip();
  const usedNames = new Set();

  items.forEach((item, index) => {
    let safeName = item.file?.name || `image_${index + 1}.jpg`;
    if (usedNames.has(safeName)) {
      const extIndex = safeName.lastIndexOf(".");
      const base = extIndex > 0 ? safeName.slice(0, extIndex) : safeName;
      const ext = extIndex > 0 ? safeName.slice(extIndex) : "";
      safeName = `${base}_${index + 1}${ext}`;
    }
    usedNames.add(safeName);
    if (item.file) {
      zip.file(safeName, item.file);
    }
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const itemMeetsThreshold = (item) => {
  if (!item.scores?.length) {
    return false;
  }
  const peopleThreshold = Number(peopleRange.value) / 100;
  const peopleEntry = item.scores.find((entry) => entry.label === PEOPLE_LABEL);
  const peopleScore = peopleEntry ? peopleEntry.score : 0;
  return peopleScore >= peopleThreshold;
};

peopleRange.addEventListener("input", updateThresholdLabels);

downloadPeopleButton.addEventListener("click", () => {
  if (completedItems.length === 0) {
    return;
  }
  const filtered = completedItems.filter(itemMeetsThreshold);
  if (filtered.length === 0) {
    renderResultsMessage("No images matched the selected threshold.");
    return;
  }
  renderResultsMessage("Preparing ZIP download...");
  downloadZip(filtered, "people_threshold.zip").catch(() => {
    renderResultsMessage("Unable to create ZIP.");
  });
});

input.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (imageFiles.length === 0) {
    status.textContent = "No valid images selected.";
    resetPreview("Your preview will appear here.");
    renderResultsMessage("Analysis results will appear here.");
    return;
  }

  const limitedFiles = imageFiles.slice(0, MAX_FILES);
  const truncated = imageFiles.length > MAX_FILES;

  const items = limitedFiles.map((file, index) => ({
    id: `${file.name}-${index}-${file.lastModified}`,
    file,
    resizedFile: null,
    name: file.name,
    url: "",
    status: "queued",
    scores: [],
    error: "",
  }));

  revokeUrls(activeItems);
  activeItems = items;
  completedItems = [];
  setDownloadState(false);

  renderPreviewGrid(items);
  status.textContent = truncated
    ? `Selected ${limitedFiles.length} images (showing first ${MAX_FILES}).`
    : `Selected ${limitedFiles.length} image(s).`;
  renderResultsMessage("Preparing previews...");

  let completed = 0;
  const updateSummary = () => {
    const failed = items.filter((item) => item.error).length;
    renderResultsMessage(
      `Completed ${completed}/${items.length} analyses` +
        (failed ? ` (${failed} failed)` : "."),
    );
  };

  const preparePreviews = async () => {
    for (const item of items) {
      try {
        const resizedFile = await resizeImageForUpload(item.file);
        item.resizedFile = resizedFile;
        if (item.url) {
          URL.revokeObjectURL(item.url);
        }
        item.url = URL.createObjectURL(resizedFile);
      } catch {
        item.url = URL.createObjectURL(item.file);
      } finally {
        renderPreviewGrid(items);
      }
    }
  };

  const processQueue = async () => {
    for (const item of items) {
      item.status = "loading";
      renderPreviewGrid(items);

      try {
        const data = await analyzeImage(item.file, item.resizedFile);
        if (data?.scores?.length) {
          item.scores = data.scores;
        }
        item.status = "done";
      } catch (error) {
        item.error = error.message || "Unable to analyze image.";
        item.status = "done";
      } finally {
        completed += 1;
        completedItems = items.filter((entry) => entry.status === "done");
        setDownloadState(completedItems.length > 0);
        renderPreviewGrid(items);
        updateSummary();
      }
    }
  };

  const handleSelection = async () => {
    await preparePreviews();
    renderResultsMessage("Analyzing images...");
    await processQueue();
  };

  void handleSelection();
});
