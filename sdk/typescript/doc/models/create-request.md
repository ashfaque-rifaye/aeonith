
# Create Request

*This model accepts additional fields of type unknown.*

## Structure

`CreateRequest`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `mode` | [`Mode \| undefined`](../../doc/models/mode.md) | Optional | - |
| `flow` | [`Flow \| undefined`](../../doc/models/flow.md) | Optional | quotes = sealed quotes first, hold on booking |
| `title` | `string` | Required | - |
| `category` | `string` | Required | - |
| `description` | `string \| undefined` | Optional | - |
| `zip` | `string \| undefined` | Optional | - |
| `licensed` | `boolean \| undefined` | Optional | - |
| `minWarrantyMonths` | `number \| undefined` | Optional | - |
| `completeBy` | `string \| undefined` | Optional | - |
| `buyerName` | `string \| undefined` | Optional | - |
| `limitDollars` | `number \| undefined` | Optional | - |
| `depositDollars` | `number \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { CreateRequest, Flow, Mode } from 'aeonith-apilib';

const createRequest: CreateRequest = {
  title: 'title6',
  category: 'category8',
  mode: Mode.Solo,
  flow: Flow.Quotes,
  description: 'description0',
  zip: 'zip4',
  licensed: false,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

