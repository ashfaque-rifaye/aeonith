
# Demand Signal

*This model accepts additional fields of type unknown.*

## Structure

`DemandSignal`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Required | - |
| `mode` | [`Mode`](../../doc/models/mode.md) | Required | - |
| `title` | `string` | Required | - |
| `category` | `string` | Required | - |
| `description` | `string \| undefined` | Optional | - |
| `zip` | `string \| undefined` | Optional | - |
| `requirements` | [`Requirements \| undefined`](../../doc/models/requirements.md) | Optional | - |
| `depositPerUnitCents` | `number \| null \| undefined` | Optional | - |
| `fundedUnits` | `number` | Required | Units backed by a PayPal hold |
| `fundedRequests` | `number \| undefined` | Optional | - |
| `closesAt` | `string \| undefined` | Optional | - |
| `status` | `string` | Required | - |
| `catalog` | [`Catalog \| undefined`](../../doc/models/catalog.md) | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { DemandSignal, Mode } from 'aeonith-apilib';

const demandSignal: DemandSignal = {
  requestId: 'requestId6',
  mode: Mode.Solo,
  title: 'title0',
  category: 'category2',
  fundedUnits: 60,
  status: 'status6',
  description: 'description4',
  zip: 'zip8',
  requirements: {
    licensed: false,
    minWarrantyMonths: 86,
    completeBy: 'completeBy0',
    additionalProperties: {
      'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
    },
  },
  depositPerUnitCents: 154,
  fundedRequests: 144,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

