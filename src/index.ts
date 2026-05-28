const DEFAULT_ATTR = 'data-test'

/**
 * Escapes single quotes for use in CSS attribute selectors
 */
function escapeSelector(value: string): string {
  return value.replace(/'/g, "\\'")
}

export type MarkerNodeProps<A extends string = typeof DEFAULT_ATTR> = {
  [K in A]: string
}

export type Marker<A extends string = typeof DEFAULT_ATTR> = {
  /**
   * Attribute value
   */
  value: string

  /**
   * Attribute selector
   * @example `[data-test='${value}']`
   */
  selector: string

  /**
   * Object for convenient setting of the node attribute in tsx
   * @example { 'data-test': value }
   */
  nodeProps: MarkerNodeProps<A>
}

export type Schema<M extends Marker<any>> = (value: string) => M

export type UnpackedMarkerType<S extends Schema<any>> = S extends Schema<infer M> ? M : never

export type ComplexSchema<C extends Record<string, Schema<any>>, A extends string = typeof DEFAULT_ATTR> = Schema<
  Marker<A> & {
    [P in keyof C]: UnpackedMarkerType<C[P]>
  }
>

/**
 * Creates a simple marker with the given attribute name
 */
function createSimple<A extends string>(attrName: A): Schema<Marker<A>> {
  return (value: string) => ({
    value,
    selector: `[${attrName}='${escapeSelector(value)}']`,
    nodeProps: {
      [attrName]: value,
    } as MarkerNodeProps<A>,
  })
}

/**
 * Creates a complex schema factory with the given attribute name
 */
function createComplex<A extends string>(attrName: A) {
  const simpleSchema = createSimple(attrName)

  return function complex<C extends Record<string, Schema<any>>>(nodes: C): ComplexSchema<C, A> {
    return (value: string) => {
      const result = simpleSchema(value) as Marker<A> & { [P in keyof C]: UnpackedMarkerType<C[P]> }

      Object.entries(nodes).forEach(([key, child]) => {
        Object.defineProperty(result, key, {
          get: () => child(`${value}/${key}`),
        })
      })

      return result
    }
  }
}

/**
 * Creates a byKey schema factory with the given attribute name
 */
function createByKey<A extends string>(attrName: A) {
  return function byKey<S extends Schema<any>>(schema: S) {
    return (value: string) => {
      const result = ((key: string) => schema(`${value}/${key}`)) as Marker<A> &
        ((key: string) => UnpackedMarkerType<S>)

      result.value = value
      result.selector = `[${attrName}='${escapeSelector(value)}']`
      result.nodeProps = {
        [attrName]: value,
      } as MarkerNodeProps<A>

      return result
    }
  }
}

/**
 * Simple schema for a single marker creation
 * @param value value of data-test attribute
 * @returns Marker
 */
export const simple: Schema<Marker> = createSimple(DEFAULT_ATTR)

/**
 * Function that creates a complex schema containing multiple markers
 * @param nodes Dictionary of markers
 * @returns Function that creates a complex marker
 */
export const complex = createComplex(DEFAULT_ATTR)

/**
 * Function that creates a schema for a marker with a given value and a key
 * @param schema Schema to create marker
 * @returns Marker object
 */
export const byKey = createByKey(DEFAULT_ATTR)

export type MarkerTreeFactory<A extends string> = {
  simple: Schema<Marker<A>>
  complex: <C extends Record<string, Schema<any>>>(nodes: C) => ComplexSchema<C, A>
  byKey: <S extends Schema<any>>(schema: S) => (value: string) => Marker<A> & ((key: string) => UnpackedMarkerType<S>)
}

/**
 * Creates a marker tree factory with a custom attribute name
 * @param attrName The attribute name to use (e.g., 'data-testid', 'data-cy')
 * @returns An object with simple, complex, and byKey functions
 *
 * @example
 * ```typescript
 * // For Cypress
 * const { simple, complex, byKey } = createMarkerTree('data-cy')
 *
 * // For Testing Library
 * const { simple, complex, byKey } = createMarkerTree('data-testid')
 * ```
 */
export function createMarkerTree<A extends string>(attrName: A): MarkerTreeFactory<A> {
  return {
    simple: createSimple(attrName),
    complex: createComplex(attrName),
    byKey: createByKey(attrName),
  }
}
