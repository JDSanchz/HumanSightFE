import { createRoot } from "react-dom/client";
import {
  API_URL,
  MAX_FILES,
  PEOPLE_LABEL,
  RECOMMENDED_THRESHOLD,
  parsedLimit,
} from "./src/constants.js";
import { getDomRefs } from "./src/dom.js";
import { pingHealth } from "./src/health.js";
import { analyzeImage, resizeImageForUpload } from "./src/images.js";
import { itemMeetsThreshold, revokeUrls } from "./src/items.js";
import { downloadZip } from "./src/zip.js";
import {
  renderMessage,
  renderPreviewGrid,
  setProgressVisible,
  setDownloadState,
  updateProgress,
  updateLimitHint,
  updateRecommendedTooltip,
  updateThresholdLabels,
} from "./src/ui.js";

const dom = getDomRefs();
const previewRoot = createRoot(dom.preview);

const renderPreview = (items) => renderPreviewGrid(previewRoot, items);
const renderPlaceholder = (message) => renderMessage(previewRoot, message);
const progressElements = {
  progressBar: dom.progressBar,
  progressText: dom.progressText,
  progressCount: dom.progressCount,
};

let activeItems = [];
let completedItems = [];

if (dom.peopleRange) {
  dom.peopleRange.value = String(RECOMMENDED_THRESHOLD);
}
const resetPreview = (message) => {
  revokeUrls(activeItems);
  activeItems = [];
  completedItems = [];
  setDownloadState(dom.downloadPeopleButton, false);
  renderPlaceholder(message);
};

updateRecommendedTooltip(dom.peopleRecommendation, RECOMMENDED_THRESHOLD);
updateThresholdLabels(dom.peopleRange, dom.peopleValue);
pingHealth(API_URL, dom.health);
updateLimitHint(dom.limitHint, MAX_FILES);

if (dom.devFlag) {
  dom.devFlag.hidden = !Number.isFinite(parsedLimit) || parsedLimit <= 0;
}

if (dom.dismissDescription && dom.appDescription) {
  dom.dismissDescription.addEventListener("click", () => {
    dom.appDescription.remove();
  });
}

renderPlaceholder("Your preview will appear here.");
setDownloadState(dom.downloadPeopleButton, false);

if (dom.peopleRange) {
  dom.peopleRange.addEventListener("input", () => {
    updateThresholdLabels(dom.peopleRange, dom.peopleValue);
  });
}

if (dom.downloadPeopleButton) {
  dom.downloadPeopleButton.addEventListener("click", () => {
    if (completedItems.length === 0) {
      return;
    }
    const peopleThreshold = Number(dom.peopleRange?.value || 0) / 100;
    const filtered = completedItems.filter((item) =>
      itemMeetsThreshold(item, peopleThreshold, PEOPLE_LABEL),
    );
    if (filtered.length === 0) {
      return;
    }
    downloadZip(filtered, "people_threshold.zip").catch((error) => {
      console.error("Unable to create ZIP.", error);
    });
  });
}

if (dom.input) {
  dom.input.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      if (dom.status) {
        dom.status.textContent = "No valid images selected.";
      }
      resetPreview("Your preview will appear here.");
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
    setDownloadState(dom.downloadPeopleButton, false);

    renderPreview(items);
    if (dom.status) {
      dom.status.textContent = truncated
        ? `Selected ${limitedFiles.length} images (showing first ${MAX_FILES}).`
        : `Selected ${limitedFiles.length} image(s).`;
    }
    setProgressVisible(dom.progress, true);
    updateProgress(progressElements, 0, items.length);

    let completed = 0;

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
          renderPreview(items);
        }
      }
    };

    const processQueue = async () => {
      for (const item of items) {
        item.status = "loading";
        renderPreview(items);

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
        setDownloadState(dom.downloadPeopleButton, completedItems.length > 0);
        renderPreview(items);
        updateProgress(progressElements, completed, items.length);
      }
    }
    };

    const handleSelection = async () => {
      await preparePreviews();
      await processQueue();
    };

    void handleSelection();
  });
}
