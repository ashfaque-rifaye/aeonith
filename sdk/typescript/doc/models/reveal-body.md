
# Reveal Body

*This model accepts additional fields of type unknown.*

## Structure

`RevealBody`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `offer` | [`Offer`](../../doc/models/offer.md) | Required | - |
| `salt` | `string` | Required | **Constraints**: *Pattern*: `^[0-9a-f]{32,128}$` |
| `pitch` | `string \| undefined` | Optional | **Constraints**: *Maximum Length*: `600` |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { RevealBody } from 'aeonith-apilib';

const revealBody: RevealBody = {
  offer: {
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
  },
  salt: 'salt8',
  pitch: 'pitch2',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

