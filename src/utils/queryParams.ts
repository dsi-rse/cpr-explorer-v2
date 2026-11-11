const url = new URL(window.location.href);
export const isDisplay = url.searchParams.get("display") === "true";
export const query = url.searchParams.get("query");
export const page = url.searchParams.get("page");