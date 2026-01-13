import JSZip from "jszip";

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

export { downloadZip };
