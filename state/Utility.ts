// pascal to camel
export function pascalToCamel(str: string) {
  return str.replace(/\.?([A-Z])/g, function (_, y) {
    return "_" + y.toLowerCase();
  }).replace(/^_/, "");
};