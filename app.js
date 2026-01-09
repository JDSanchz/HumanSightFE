import React from "react";
import { createRoot } from "react-dom/client";

const input = document.getElementById("file-input");
const preview = document.getElementById("preview");
const status = document.getElementById("status");

const previewRoot = createRoot(preview);
let currentUrl = null;

const renderMessage = (message) => {
  previewRoot.render(
    React.createElement("p", { className: "placeholder" }, message),
  );
};

const renderImage = (url, alt) => {
  previewRoot.render(React.createElement("img", { src: url, alt }));
};

const resetPreview = (message) => {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  renderMessage(message);
};

renderMessage("Your preview will appear here.");

input.addEventListener("change", (event) => {
  const [file] = event.target.files;

  if (!file) {
    status.textContent = "No image selected.";
    resetPreview("Your preview will appear here.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    status.textContent = "Please choose a valid image file.";
    resetPreview("Unsupported file type.");
    return;
  }

  currentUrl = URL.createObjectURL(file);
  status.textContent = `Selected: ${file.name}`;
  renderImage(currentUrl, file.name);
});
