export const difficulties = ["beginner", "intermediate", "advanced"];
export const statuses = ["backlog", "in_progress", "completed"];
export const questFields = [
  "skill_tree_id",
  "title",
  "description",
  "requirements",
  "difficulty",
  "xp_reward",
  "position",
  "prerequisite_notes",
  "tech_stack_tags",
  "documentation_urls",
];
export function validId(value) {
  return /^[1-9]\d*$/.test(String(value)) && Number(value) <= 2147483647;
}
export function httpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function validateQuest(body, partial = false) {
  const errors = {},
    values = {};
  for (const field of questFields) {
    if (
      !(field in body) &&
      (partial ||
        [
          "prerequisite_notes",
          "tech_stack_tags",
          "documentation_urls",
        ].includes(field))
    )
      continue;
    const value = body[field];
    if (["title", "description", "requirements"].includes(field)) {
      if (typeof value !== "string" || !value.trim())
        errors[field] = "This field is required.";
      else values[field] = value.trim();
    } else if (["skill_tree_id", "xp_reward", "position"].includes(field)) {
      if (
        !Number.isInteger(value) ||
        value < (field === "skill_tree_id" ? 1 : 0) ||
        value > 2147483647
      )
        errors[field] = "Enter a valid whole number.";
      else values[field] = value;
    } else if (field === "difficulty") {
      if (!difficulties.includes(value))
        errors[field] = "Choose Beginner, Intermediate, or Advanced.";
      else values[field] = value;
    } else if (field === "prerequisite_notes") {
      if (value !== null && typeof value !== "string")
        errors[field] = "Enter text.";
      else values[field] = value?.trim() || null;
    } else {
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        errors[field] = "Provide a list of text values.";
      else {
        values[field] = value.map((item) => item.trim()).filter(Boolean);
        if (
          field === "documentation_urls" &&
          values[field].some((item) => !httpUrl(item))
        )
          errors[field] = "Use HTTP or HTTPS links.";
      }
    }
  }
  return { values, errors };
}
