
# Autopilot

*This model accepts additional fields of type unknown.*

## Structure

`Autopilot`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `id` | `string \| undefined` | Optional | - |
| `buyerName` | `string \| undefined` | Optional | - |
| `capCents` | `number \| undefined` | Optional | - |
| `categories` | `string[] \| undefined` | Optional | - |
| `status` | [`Status1 \| undefined`](../../doc/models/status-1.md) | Optional | - |
| `vaultId` | `string \| undefined` | Optional | PayPal Vault payment token |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Autopilot, Status1 } from 'aeonith-apilib';

const autopilot: Autopilot = {
  id: 'id0',
  buyerName: 'buyerName0',
  capCents: 138,
  categories: [
    'categories2',
    'categories1',
    'categories0'
  ],
  status: Status1.Revoked,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

