// pascal to camel
export function pascalToCamel(str: string) {
  return str.replace(/\.?([A-Z])/g, function (_, y) {
    return "_" + y.toLowerCase();
  }).replace(/^_/, "");
};

// truncate string
export function truncateString(str: string, num: number) {
  return str.length > num ? str.slice(0, num) + "..." : str;
};