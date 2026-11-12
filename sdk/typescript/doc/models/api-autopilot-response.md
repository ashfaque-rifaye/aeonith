
# Api Autopilot Response

*This model accepts additional fields of type unknown.*

## Structure

`ApiAutopilotResponse`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `autopilot` | [`Autopilot \| undefined`](../../doc/models/autopilot.md) | Optional | - |
| `approveUrl` | `string \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { ApiAutopilotResponse, Status1 } from 'aeonith-apilib';

const apiAutopilotResponse: ApiAutopilotResponse = {
  autopilot: {
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
  },
  approveUrl: 'approveUrl6',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

