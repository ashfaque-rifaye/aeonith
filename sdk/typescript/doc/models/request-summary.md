
# Request Summary

*This model accepts additional fields of type unknown.*

## Structure

`RequestSummary`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `id` | `string \| undefined` | Optional | - |
| `title` | `string \| undefined` | Optional | - |
| `status` | `string \| undefined` | Optional | - |
| `mode` | `string \| undefined` | Optional | - |
| `buyers` | [`Buyer[] \| undefined`](../../doc/models/buyer.md) | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { RequestSummary, Status } from 'aeonith-apilib';

const requestSummary: RequestSummary = {
  id: 'id4',
  title: 'title0',
  status: 'status6',
  mode: 'mode2',
  buyers: [
    {
      id: 'id6',
      name: 'name6',
      units: 164,
      status: Status.Voided,
      authorizationId: 'authorizationId0',
      additionalProperties: {
        'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
      },
    },
    {
      id: 'id6',
      name: 'name6',
      units: 164,
      status: Status.Voided,
      authorizationId: 'authorizationId0',
      additionalProperties: {
        'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
      },
    },
    {
      id: 'id6',
      name: 'name6',
      units: 164,
      status: Status.Voided,
      authorizationId: 'authorizationId0',
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

