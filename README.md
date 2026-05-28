# Marker Tree

[![npm version](https://badge.fury.io/js/marker-tree.svg)](https://www.npmjs.com/package/marker-tree)
[![CI](https://github.com/alks801/marker-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/alks801/marker-tree/actions/workflows/ci.yml)

To simplify the labeling of elements for testing, the `MarkerTree` library was created.

It allows adding relative data attributes to any DOM elements. The attribute values are automatically assigned based on a mapper object. This means we create a specific object in TypeScript, describe its properties using simple instructions, and use it for labeling elements and testing. One object is used for both labeling and as a quick way to access element selectors.

## Installation

```bash
npm install marker-tree
```

## Basic Types

The core base type, `Marker`, is represented as follows:

```typescript
type Marker = {
   value: string;      // The value of the attribute
   selector: string;   // The selector for this attribute in the form `[data-test='${value}']`
   nodeProps: {        // An object for conveniently setting the attribute on a node in TSX
      'data-test': string;
   };
};
```

### Schema

A Schema is a descriptor function (essentially a schema 😊) that returns a Marker.

```typescript
type Schema<M extends Marker> = (value: string) => M;
```

### Helper: UnpackedMarkerType

```typescript
type UnpackedMarkerType<S extends Schema<any>> = S extends Schema<infer M> ? M : never;
```

### ComplexSchema

A ComplexSchema is a combination of a Marker and a schema-object, where the keys are other schemas or schema-objects.

```typescript
type ComplexSchema<C extends Record<string, Schema<any>>> = Schema<
   Marker & {
      [P in keyof C]: UnpackedMarkerType<C[P]>;
   }
>;
```

## Functions

The library provides three functions:

### 1. simple

```typescript
const simple: Schema<Marker> = (value) => ({
   value,
   selector: `[data-test='${value}']`,
   nodeProps: {
      'data-test': value,
   },
});
```
Returns a Schema (descriptor) for the provided attribute value.

### 2. complex

```typescript
function complex<C extends Record<string, Schema<any>>>(nodes: C): ComplexSchema<C> {
   return (value: string) => {
       const result = simple(value) as Marker & { [P in keyof C]: UnpackedMarkerType<C[P]> };
       Object.keys(nodes).forEach((key) => {
          const child = nodes[key];
          Object.defineProperty(result, key, {
             get: () => child(`${value}/${key}`),
          });
       });
       return result;
    };
}
```

Returns a ComplexSchema for a descriptor object. It also sets a getter for all keys of the object, which invokes either a Schema or a ComplexSchema.

### 3. byKey

```typescript
function byKey<S extends Schema<any>>(schema: S) {
    return (value: string) => {
       const result = ((key: string) => schema(`${value}/${key}`)) as Marker & ((key: string) => UnpackedMarkerType<S>);
       result.value = value;
       result.selector = `[data-test='${value}']`;
       result.nodeProps = {
          'data-test': value,
       };
       return result;
    };
}
```

Returns a function that allows automatic assignment of data attributes for a list of elements. Particularly useful for constructs involving arrays and `map` in rendering.

## Practice

### When to Use `simple` and When to Use `complex`?

Imagine all future element-selectors as a tree. If the current element can only be a leaf and will not contain any deeper selectors, use `simple`. Otherwise, use `complex`. For example:

- A `div` containing an application would be created using `complex`.
- An `input`, `span`, or logo would use `simple`.

The choice between `simple` and `complex` is based on **logic** rather than HTML semantics. For instance:

- A simple "Play" button, where we only need to click it in tests, would use `simple`.
- If we need to interact with the button and also check for text changes or the appearance of a logo inside it, we would use `complex` because the logo itself would need to be marked up, adding another level of nesting.

This will become clearer with examples.

---

### Creating the Marker Tree

The creation of the marker tree starts with the **root**. Since the root will definitely contain other elements (selectors), we use `complex`:

```typescript
complex({})
```

The `complex` function returns a `ComplexSchema`—a function that takes a `value` attribute and returns a `Marker` + `Record<string, Schema<any>>`.

Let's create a root schema for the future application:

```typescript
const rootObjectSchema = complex({});
```

For now, this is a descriptor-function. To get the desired `Marker` + `Record<string, Schema<any>>`, we do the following:

```typescript
const rootObject = rootObjectSchema('root');
```

Now we have access to the properties that we will use later.

If we assign the `data-*` attribute to the `root` div in our application:

```tsx
<div {...rootObject.nodeProps}>
```

The key and value will be assigned in the markup.

---

### Moving Forward: Marking Up `appPage`, `header`, and `footer`

Let's proceed by marking up `appPage`, `header`, and `footer`, and include them in the `root`. In the example below, we will also use the `byKey` construct to mark up a dynamic list of brands in the footer.

```typescript
const headerSchema = complex({
    menu: complex({
        button: simple,
        container: simple,
    }),
    loginButton: simple,
});

const footerSchema = complex({
   links: simple,
   brands: complex({
      container: simple,
      items: byKey(simple),
   }),
});

const appPageSchema = complex({
   header: headerSchema,
   footer: footerSchema,
});

const rootObjectSchema = complex({
   appPage: appPageSchema,
});

export const rootObject = rootObjectSchema('root');
export const appPageObject = rootObject.appPage;
```

---

### Marking Up Elements

Marking up elements is no different from marking up the `root`:

```tsx
<header className={styles.root} ref={rootRef} {...appPageObject.header.nodeProps}>
```

For `byKey`, we mark up as follows:

```tsx
{data.map(({ id, image }) => (
   <div className={styles.image} key={id} {...appPageObject.footer.brands.items(id).nodeProps}>
```

---

### Resulting Markup

As a result, we get markup like this:

```html
<div data-test="root">
   <div data-test="root/appPage">
      <header data-test="root/appPage/header">
         <!-- Header content -->
      </header>
      <footer data-test="root/appPage/footer">
         <div data-test="root/appPage/footer/brands">
            <div data-test="root/appPage/footer/brands/items/1"></div>
            <div data-test="root/appPage/footer/brands/items/2"></div>
            <!-- More items -->
         </div>
      </footer>
   </div>
</div>
```

---

## Testing

For testing, selectors for all marked-up elements can be taken from the same objects:

```typescript
const { menu } = appPageObject.header;
cy.get(menu.container.selector).should('not.be.visible');
cy.get(menu.button.selector).click();
```

This approach ensures a clean and maintainable way to manage selectors and test interactions in your application.

---

## Custom Attribute Names

By default, `marker-tree` uses `data-test` as the attribute name. If you need a different attribute (e.g., `data-testid` for Testing Library or `data-cy` for Cypress), use the `createMarkerTree` factory:

```typescript
import { createMarkerTree } from 'marker-tree';

// For Testing Library
const { simple, complex, byKey } = createMarkerTree('data-testid');

// For Cypress
const { simple, complex, byKey } = createMarkerTree('data-cy');

// For any custom attribute
const { simple, complex, byKey } = createMarkerTree('data-qa');
```

The returned `simple`, `complex`, and `byKey` functions work exactly the same way, but generate selectors and `nodeProps` with your custom attribute name:

```typescript
const { simple, complex } = createMarkerTree('data-testid');

const rootSchema = complex({
  button: simple,
});

const root = rootSchema('app');

console.log(root.button.selector);   // "[data-testid='app/button']"
console.log(root.button.nodeProps);  // { 'data-testid': 'app/button' }
```

---

## TypeScript Support

This library is written in TypeScript and provides full type inference for your marker trees. All nested properties are properly typed, giving you autocomplete and type checking in your IDE.

---

## License

ISC