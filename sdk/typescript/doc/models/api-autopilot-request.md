
# Api Autopilot Request

*This model accepts additional fields of type unknown.*

## Structure

`ApiAutopilotRequest`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `buyerName` | `string \| undefined` | Optional | - |
| `zip` | `string \| undefined` | Optional | - |
| `capDollars` | `number` | Required | - |
| `categories` | [`Category[]`](../../doc/models/category.md) | Required | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { ApiAutopilotRequest, Category } from 'aeonith-apilib';

const apiAutopilotRequest: ApiAutopilotRequest = {
  capDollars: 109.82,
  categories: [
    Category.Plumbing,
    Category.Hvac
  ],
  buyerName: 'buyerName0',
  zip: 'zip4',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

