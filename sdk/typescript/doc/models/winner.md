
# Winner

*This model accepts additional fields of type unknown.*

## Structure

`Winner`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `providerId` | `string \| undefined` | Optional | - |
| `priceCents` | `number \| undefined` | Optional | - |
| `unitsServed` | `number \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Winner } from 'aeonith-apilib';

const winner: Winner = {
  providerId: 'providerId8',
  priceCents: 66,
  unitsServed: 178,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

