
# Catalog Item

*This model accepts additional fields of type unknown.*

## Structure

`CatalogItem`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `id` | `string \| undefined` | Optional | - |
| `name` | `string \| undefined` | Optional | - |
| `msrpCents` | `number \| undefined` | Optional | - |
| `units` | `number \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { CatalogItem } from 'aeonith-apilib';

const catalogItem: CatalogItem = {
  id: 'id6',
  name: 'name6',
  msrpCents: 154,
  units: 254,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

