
# Api Requests Join Request

*This model accepts additional fields of type unknown.*

## Structure

`ApiRequestsJoinRequest`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `name` | `string` | Required | **Constraints**: *Maximum Length*: `60` |
| `limitDollars` | `number` | Required | Private: never shown to sellers |
| `units` | `number \| undefined` | Optional | **Default**: `1`<br><br>**Constraints**: `>= 1` |
| `itemId` | `string \| undefined` | Optional | Catalog item (e.g. a car model) |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { ApiRequestsJoinRequest } from 'aeonith-apilib';

const apiRequestsJoinRequest: ApiRequestsJoinRequest = {
  name: 'name6',
  limitDollars: 230.06,
  units: 1,
  itemId: 'itemId2',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

