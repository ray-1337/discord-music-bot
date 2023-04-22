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

// chunk array
export function chunk(array: any[], chunkSize: number) {
  const temp: any[] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    temp.push(array.slice(i, i + chunkSize));
  };

  return temp;
};

// 60 -> 01:00
export function millisToMinutesAndSeconds(_ms: number) { 
  const minutes = Math.floor(_ms / 60000);
  const seconds = ((_ms % 60000) / 1000).toFixed(0);
  return (+minutes < 10 ? '0' + minutes : '') + ":" + (+seconds < 10 ? '0' : '') + seconds;
};