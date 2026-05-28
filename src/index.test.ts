import { describe, it, expect } from 'vitest'
import { simple, complex, byKey, createMarkerTree } from './index'

describe('simple', () => {
  it('creates a marker with correct value', () => {
    const marker = simple('test')

    expect(marker.value).toBe('test')
  })

  it('creates a marker with correct selector', () => {
    const marker = simple('test')

    expect(marker.selector).toBe("[data-test='test']")
  })

  it('creates a marker with correct nodeProps', () => {
    const marker = simple('test')

    expect(marker.nodeProps).toEqual({ 'data-test': 'test' })
  })

  it('handles special characters in value', () => {
    const marker = simple('test/path/item')

    expect(marker.value).toBe('test/path/item')
    expect(marker.selector).toBe("[data-test='test/path/item']")
  })

  it('escapes single quotes in selector', () => {
    const marker = simple("it's a test")

    expect(marker.value).toBe("it's a test")
    expect(marker.selector).toBe("[data-test='it\\'s a test']")
    expect(marker.nodeProps).toEqual({ 'data-test': "it's a test" })
  })

  it('escapes multiple single quotes', () => {
    const marker = simple("don't stop believin'")

    expect(marker.selector).toBe("[data-test='don\\'t stop believin\\'']")
  })
})

describe('complex', () => {
  it('creates a complex marker with nested children', () => {
    const schema = complex({
      header: simple,
      footer: simple,
    })

    const marker = schema('root')

    expect(marker.value).toBe('root')
    expect(marker.header.value).toBe('root/header')
    expect(marker.footer.value).toBe('root/footer')
  })

  it('creates correct selectors for nested children', () => {
    const schema = complex({
      header: simple,
    })

    const marker = schema('app')

    expect(marker.selector).toBe("[data-test='app']")
    expect(marker.header.selector).toBe("[data-test='app/header']")
  })

  it('supports deeply nested structures', () => {
    const schema = complex({
      header: complex({
        menu: complex({
          button: simple,
        }),
      }),
    })

    const marker = schema('root')

    expect(marker.header.menu.button.value).toBe('root/header/menu/button')
    expect(marker.header.menu.button.selector).toBe("[data-test='root/header/menu/button']")
  })

  it('provides correct nodeProps for all levels', () => {
    const schema = complex({
      child: simple,
    })

    const marker = schema('parent')

    expect(marker.nodeProps).toEqual({ 'data-test': 'parent' })
    expect(marker.child.nodeProps).toEqual({ 'data-test': 'parent/child' })
  })
})

describe('byKey', () => {
  it('creates a marker with dynamic key support', () => {
    const schema = complex({
      items: byKey(simple),
    })

    const marker = schema('list')

    expect(marker.items.value).toBe('list/items')
    expect(marker.items('item-1').value).toBe('list/items/item-1')
    expect(marker.items('item-2').value).toBe('list/items/item-2')
  })

  it('escapes single quotes in byKey selector', () => {
    const schema = complex({
      items: byKey(simple),
    })

    const marker = schema("parent's")

    expect(marker.items.value).toBe("parent's/items")
    expect(marker.items.selector).toBe("[data-test='parent\\'s/items']")
    expect(marker.items("child's").selector).toBe("[data-test='parent\\'s/items/child\\'s']")
  })

  it('creates correct selectors for dynamic keys', () => {
    const schema = complex({
      items: byKey(simple),
    })

    const marker = schema('list')

    expect(marker.items.selector).toBe("[data-test='list/items']")
    expect(marker.items('123').selector).toBe("[data-test='list/items/123']")
  })

  it('works with complex nested schemas', () => {
    const schema = complex({
      items: byKey(
        complex({
          title: simple,
          content: simple,
        })
      ),
    })

    const marker = schema('list')

    expect(marker.items('id-1').title.value).toBe('list/items/id-1/title')
    expect(marker.items('id-1').content.selector).toBe("[data-test='list/items/id-1/content']")
  })

  it('provides nodeProps for callable marker', () => {
    const schema = complex({
      items: byKey(simple),
    })

    const marker = schema('list')

    expect(marker.items.nodeProps).toEqual({ 'data-test': 'list/items' })
    expect(marker.items('x').nodeProps).toEqual({ 'data-test': 'list/items/x' })
  })
})

describe('real-world usage', () => {
  it('supports typical app structure', () => {
    const headerSchema = complex({
      menu: complex({
        button: simple,
        container: simple,
      }),
      loginButton: simple,
    })

    const footerSchema = complex({
      links: simple,
      brands: complex({
        container: simple,
        items: byKey(simple),
      }),
    })

    const appPageSchema = complex({
      header: headerSchema,
      footer: footerSchema,
    })

    const rootSchema = complex({
      appPage: appPageSchema,
    })

    const root = rootSchema('root')

    expect(root.appPage.header.menu.button.selector).toBe(
      "[data-test='root/appPage/header/menu/button']"
    )
    expect(root.appPage.footer.brands.items('brand-1').selector).toBe(
      "[data-test='root/appPage/footer/brands/items/brand-1']"
    )
  })
})

describe('createMarkerTree', () => {
  it('creates marker tree with custom attribute name', () => {
    const { simple, complex } = createMarkerTree('data-testid')

    const schema = complex({
      button: simple,
    })

    const marker = schema('root')

    expect(marker.selector).toBe("[data-testid='root']")
    expect(marker.nodeProps).toEqual({ 'data-testid': 'root' })
    expect(marker.button.selector).toBe("[data-testid='root/button']")
    expect(marker.button.nodeProps).toEqual({ 'data-testid': 'root/button' })
  })

  it('works with data-cy for Cypress', () => {
    const { simple, complex, byKey } = createMarkerTree('data-cy')

    const schema = complex({
      items: byKey(simple),
    })

    const marker = schema('list')

    expect(marker.selector).toBe("[data-cy='list']")
    expect(marker.items('id').selector).toBe("[data-cy='list/items/id']")
    expect(marker.items('id').nodeProps).toEqual({ 'data-cy': 'list/items/id' })
  })

  it('supports nested complex structures with custom attribute', () => {
    const { simple, complex } = createMarkerTree('data-qa')

    const schema = complex({
      header: complex({
        logo: simple,
      }),
    })

    const marker = schema('app')

    expect(marker.header.logo.selector).toBe("[data-qa='app/header/logo']")
    expect(marker.header.logo.nodeProps).toEqual({ 'data-qa': 'app/header/logo' })
  })
})
