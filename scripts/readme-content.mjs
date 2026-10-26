export function prepareReadme(readme, repositoryIsPublic = false) {
  if (repositoryIsPublic) return readme;
  return readme
    .replace(
      /!\[[^\]]*\]\((?!https?:)[^)]+\)/g,
      "A preview screenshot is included at `docs/images/preview.png` in the installed extension.",
    )
    .replace(
      /\[([^\]]+)\]\((?!https?:|#)([^)]+)\)/g,
      "$1 (`$2` in the source repository)",
    );
}
