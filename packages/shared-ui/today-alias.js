// This alias changes only the route name. Keep the router's search opaque so
// duplicate keys, ordering, encoding and project context survive the Relay hop.
export function todayAliasTarget(search) {
  const query = typeof search === "string" &&
    (search === "" || search.startsWith("?")) &&
    !/[#\u0000-\u001f\u007f]/u.test(search) ? search : "";
  // Separate fields prevent query values from becoming a path or fragment.
  return { pathname: "/now", search: query, hash: "" };
}
