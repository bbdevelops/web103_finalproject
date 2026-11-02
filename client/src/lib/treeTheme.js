export function treeTheme(id) {
  return (
    [
      { color: "mint", icon: "code", category: "THE INTERFACE" },
      { color: "blue", icon: "server", category: "THE ENGINE" },
      { color: "violet", icon: "database", category: "THE FOUNDATION" },
      { color: "amber", icon: "cloud", category: "THE LAUNCH" },
    ][(Number(id) - 1) % 4] ?? {
      color: "mint",
      icon: "branch",
      category: "YOUR NEXT CHAPTER",
    }
  );
}
