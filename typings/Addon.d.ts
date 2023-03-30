// https://github.com/microsoft/TypeScript/issues/9619
interface MapWithSafeGet<K, V, KnownKey extends K> extends GuardedMap<K, V, KnownKey> {
  get (k: KnownKey): V;
  get (k: K): V | undefined;
}

interface GuardedMap<K, V, K1 extends K = never> extends Map<K, V> {
  has <K2 extends K>(key: K2): this is MapWithSafeGet<K, V, K1 | K2>;
}