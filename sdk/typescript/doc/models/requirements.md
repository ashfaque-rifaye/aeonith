
# Requirements

*This model accepts additional fields of type unknown.*

## Structure

`Requirements`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `licensed` | `boolean \| undefined` | Optional | - |
| `minWarrantyMonths` | `number \| undefined` | Optional | - |
| `completeBy` | `string \| undefined` | Optional | YYYY-MM-DD, end of day US Central |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Requirements } from 'aeonith-apilib';

const requirements: Requirements = {
  licensed: false,
  minWarrantyMonths: 86,
  completeBy: 'completeBy0',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

