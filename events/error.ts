export default (_, error: Error, shard?: number) => {
  return console.error(`Shard ${shard}`, error);
};