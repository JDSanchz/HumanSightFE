const updateHealth = (health, message, state) => {
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

const pingHealth = async (apiUrl, health) => {
  if (!health) {
    return;
  }
  updateHealth(health, "API: checking...", "pending");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${apiUrl}/health`, {
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
    updateHealth(health, healthMessage, "ok");
  } catch {
    updateHealth(health, "API: unavailable", "error");
  } finally {
    clearTimeout(timeoutId);
  }
};

export { pingHealth };
