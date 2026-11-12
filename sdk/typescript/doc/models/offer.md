
# Offer

*This model accepts additional fields of type unknown.*

## Structure

`Offer`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Required | - |
| `providerId` | `string` | Required | - |
| `priceCents` | `number` | Required | **Constraints**: `<= 10000000` |
| `minUnits` | `number` | Required | **Constraints**: `>= 1` |
| `discountBps` | `number \| undefined` | Optional | Fleet discount off MSRP on every model (catalog pools) |
| `promises` | [`Promises`](../../doc/models/promises.md) | Required | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Offer } from 'aeonith-apilib';

const offer: Offer = {
  requestId: 'requestId6',
  providerId: 'providerId2',
  priceCents: 9999000,
  minUnits: 236,
  promises: {
    licensed: false,
    warrantyMonths: 106,
    startAt: '2016-03-13T12:52:32.123Z',
    licenseNo: 'licenseNo4',
    endAt: '2016-03-13T12:52:32.123Z',
    additionalProperties: {
      'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
    },
  },
  discountBps: 120,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

