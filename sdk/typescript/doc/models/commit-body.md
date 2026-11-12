
# Commit Body

*This model accepts additional fields of type unknown.*

## Structure

`CommitBody`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `providerId` | `string` | Required | - |
| `providerName` | `string` | Required | - |
| `hash` | `string` | Required | **Constraints**: *Pattern*: `^[0-9a-f]{64}$` |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { CommitBody } from 'aeonith-apilib';

const commitBody: CommitBody = {
  providerId: 'providerId0',
  providerName: 'providerName0',
  hash: 'hash2',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

