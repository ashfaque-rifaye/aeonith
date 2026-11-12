
# Protocol V1 Requests Reveals Response

*This model accepts additional fields of type unknown.*

## Structure

`ProtocolV1RequestsRevealsResponse`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `valid` | `boolean` | Required | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { ProtocolV1RequestsRevealsResponse } from 'aeonith-apilib';

const protocolV1RequestsRevealsResponse: ProtocolV1RequestsRevealsResponse = {
  valid: false,
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

