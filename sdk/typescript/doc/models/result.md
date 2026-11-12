
# Result

*This model accepts additional fields of type unknown.*

## Structure

`Result`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `status` | `string \| undefined` | Optional | - |
| `winner` | [`Winner \| null \| undefined`](../../doc/models/winner.md) | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Result } from 'aeonith-apilib';

const result: Result = {
  status: 'status8',
  winner: {
    providerId: 'providerId8',
    priceCents: 66,
    unitsServed: 178,
    additionalProperties: {
      'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
    },
  },
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

