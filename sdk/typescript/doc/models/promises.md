
# Promises

*This model accepts additional fields of type unknown.*

## Structure

`Promises`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `licensed` | `boolean` | Required | - |
| `licenseNo` | `string \| undefined` | Optional | - |
| `warrantyMonths` | `number` | Required | - |
| `startAt` | `string` | Required | - |
| `endAt` | `string \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Promises } from 'aeonith-apilib';

const promises: Promises = {
  licensed: false,
  warrantyMonths: 106,
  startAt: '2016-03-13T12:52:32.123Z',
  licenseNo: 'licenseNo4',
  endAt: '2016-03-13T12:52:32.123Z',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

