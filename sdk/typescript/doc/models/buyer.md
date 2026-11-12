
# Buyer

*This model accepts additional fields of type unknown.*

## Structure

`Buyer`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `id` | `string \| undefined` | Optional | - |
| `name` | `string \| undefined` | Optional | - |
| `units` | `number \| undefined` | Optional | - |
| `status` | [`Status \| undefined`](../../doc/models/status.md) | Optional | - |
| `authorizationId` | `string \| undefined` | Optional | PayPal authorization id |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Buyer, Status } from 'aeonith-apilib';

const buyer: Buyer = {
  id: 'id0',
  name: 'name0',
  units: 156,
  status: Status.Captured,
  authorizationId: 'authorizationId4',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

