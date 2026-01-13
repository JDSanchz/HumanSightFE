const revokeUrls = (items) => {
  items.forEach((item) => {
    if (item.url) {
      URL.revokeObjectURL(item.url);
    }
  });
};

const itemMeetsThreshold = (item, threshold, peopleLabel) => {
  if (!item.scores?.length) {
    return false;
  }
  const peopleEntry = item.scores.find((entry) => entry.label === peopleLabel);
  const peopleScore = peopleEntry ? peopleEntry.score : 0;
  return peopleScore >= threshold;
};

export { itemMeetsThreshold, revokeUrls };
