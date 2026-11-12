
# Catalog

*This model accepts additional fields of type unknown.*

## Structure

`Catalog`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `seller` | `string \| undefined` | Optional | - |
| `items` | [`CatalogItem[] \| undefined`](../../doc/models/catalog-item.md) | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Catalog } from 'aeonith-apilib';

const catalog: Catalog = {
  seller: 'seller2',
  items: [
    {
      id: 'id8',
      name: 'name8',
      msrpCents: 220,
      units: 188,
      additionalProperties: {
        'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
      },
    }
  ],
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

