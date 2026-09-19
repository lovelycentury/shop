export type Remapped<T, P extends string> = {
  [K in keyof T & string as `${P}${Capitalize<K>}`]: T[K]
}

/**
 * Prefixes every key of `source`, so several results can be destructured side by side.
 *
 * const { userStatus, userIsLoading } = remap(useQuery(...), "user")
 *
 * Keys are exposed as getters, which keeps refs and reactive sources live.
 */
const remap = <T extends object, P extends string>(
  source: T,
  prefix: P
): Remapped<T, P> => {
  const target = {} as Remapped<T, P>

  for (const key of Object.keys(source) as (keyof T & string)[]) {
    Object.defineProperty(
      target,
      `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`,
      {
        get: () => source[key],
        enumerable: true,
      }
    )
  }

  return target
}

export default remap
