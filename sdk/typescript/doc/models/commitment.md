
# Commitment

*This model accepts additional fields of type unknown.*

## Structure

`Commitment`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `providerId` | `string \| undefined` | Optional | - |
| `providerName` | `string \| undefined` | Optional | - |
| `hash` | `string \| undefined` | Optional | - |
| `committedAt` | `string \| undefined` | Optional | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { Commitment } from 'aeonith-apilib';

const commitment: Commitment = {
  providerId: 'providerId6',
  providerName: 'providerName4',
  hash: 'hash8',
  committedAt: '2016-03-13T12:52:32.123Z',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

