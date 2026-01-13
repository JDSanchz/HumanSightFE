const getDomRefs = () => ({
  input: document.getElementById("file-input"),
  preview: document.getElementById("preview"),
  status: document.getElementById("status"),
  health: document.getElementById("health"),
  progress: document.getElementById("progress"),
  progressText: document.getElementById("progress-text"),
  progressCount: document.getElementById("progress-count"),
  progressBar: document.getElementById("progress-bar"),
  downloadPeopleButton: document.getElementById("download-people"),
  peopleRange: document.getElementById("people-range"),
  peopleValue: document.getElementById("people-value"),
  peopleRecommendation: document.getElementById("people-recommendation"),
  appDescription: document.getElementById("app-description"),
  dismissDescription: document.getElementById("dismiss-description"),
  limitHint: document.getElementById("limit-hint"),
  devFlag: document.getElementById("dev-flag"),
});

export { getDomRefs };
