export async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(payload?.error ?? "Unable to save. Please try again."),
      { status: response.status, fields: payload?.errors ?? {} },
    );
  return payload;
}
