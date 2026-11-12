
# Api Requests Buyers Hold Response

*This model accepts additional fields of type unknown.*

## Structure

`ApiRequestsBuyersHoldResponse`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `id` | `string \| undefined` | Optional | PayPal order id |
| `approveUrl` | `string \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { ApiRequestsBuyersHoldResponse } from 'aeonith-apilib';

const apiRequestsBuyersHoldResponse: ApiRequestsBuyersHoldResponse = {
  id: 'id4',
  approveUrl: 'approveUrl0',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

