# Marker Tree

[![npm version](https://badge.fury.io/js/marker-tree.svg)](https://www.npmjs.com/package/marker-tree)
[![CI](https://github.com/alks801/marker-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/alks801/marker-tree/actions/workflows/ci.yml)

Type-safe `data-test` attribute tree for e2e testing. One object for both marking DOM elements and getting selectors in tests.

## Quick Example

```typescript
import { simple, complex } from 'marker-tree'

// Define your marker tree
const page = complex({
  header: complex({
    logo: simple,
    menu: simple,
  }),
  loginButton: simple,
})('page')

// In React/Vue/etc - spread nodeProps to add data-test attribute
<header {...page.header.nodeProps}>        // <header data-test="page/header">
<img {...page.header.logo.nodeProps} />    // <img data-test="page/header/logo">
<button {...page.loginButton.nodeProps}>   // <button data-test="page/loginButton">

// In tests - use selector
cy.get(page.header.logo.selector).click()  // cy.get("[data-test='page/header/logo']")
```

## Installation

```bash
npm install marker-tree
```

## API

### `simple`

Creates a leaf marker (no children).

```typescript
const button = simple('submit')

button.value      // "submit"
button.selector   // "[data-test='submit']"
button.nodeProps  // { 'data-test': 'submit' }
```

### `complex(children)`

Creates a marker with nested children.

```typescript
const form = complex({
  email: simple,
  password: simple,
  submit: simple,
})('loginForm')

form.selector           // "[data-test='loginForm']"
form.email.selector     // "[data-test='loginForm/email']"
form.submit.selector    // "[data-test='loginForm/submit']"
```

### `byKey(schema)`

Creates dynamic markers for lists/arrays.

```typescript
const list = complex({
  items: byKey(simple),
})('todoList')

list.items.selector         // "[data-test='todoList/items']"
list.items('1').selector    // "[data-test='todoList/items/1']"
list.items('abc').selector  // "[data-test='todoList/items/abc']"

// Usage in React
{todos.map(todo => (
  <li key={todo.id} {...list.items(todo.id).nodeProps}>
))}
```

## Custom Attribute Names

Default attribute is `data-test`. Use `createMarkerTree` for others:

```typescript
import { createMarkerTree } from 'marker-tree'

// For Testing Library
const { simple, complex, byKey } = createMarkerTree('data-testid')

// For Cypress
const { simple, complex, byKey } = createMarkerTree('data-cy')
```

## Full Example

```typescript
// markers.ts
import { simple, complex, byKey } from 'marker-tree'

const header = complex({
  logo: simple,
  nav: complex({
    home: simple,
    about: simple,
  }),
  userMenu: simple,
})

const productList = complex({
  filters: simple,
  items: byKey(complex({
    image: simple,
    title: simple,
    price: simple,
    addToCart: simple,
  })),
})

export const app = complex({
  header,
  productList,
  footer: simple,
})('app')
```

```tsx
// ProductList.tsx
import { app } from './markers'

export const ProductList = ({ products }) => (
  <div {...app.productList.nodeProps}>
    <aside {...app.productList.filters.nodeProps}>...</aside>
    {products.map(p => (
      <article key={p.id} {...app.productList.items(p.id).nodeProps}>
        <img {...app.productList.items(p.id).image.nodeProps} />
        <h2 {...app.productList.items(p.id).title.nodeProps}>{p.name}</h2>
        <span {...app.productList.items(p.id).price.nodeProps}>{p.price}</span>
        <button {...app.productList.items(p.id).addToCart.nodeProps}>Add</button>
      </article>
    ))}
  </div>
)
```

```typescript
// product.spec.ts (Cypress)
import { app } from './markers'

it('adds product to cart', () => {
  cy.get(app.productList.items('product-1').addToCart.selector).click()
})
```

## TypeScript

Full type inference and autocomplete for all nested markers.

## License

ISC
