
# Api Autopilot Sensor Request

*This model accepts additional fields of type unknown.*

## Structure

`ApiAutopilotSensorRequest`

## Fields

| Name | Type | Tags | Description |
|  --- | --- | --- | --- |
| `device` | `string` | Required | - |
| `location` | `string` | Required | - |
| `reading` | `string` | Required | - |
| `additionalProperties` | `Record<string, unknown>` | Optional | - |

## Example

```ts
import { ApiAutopilotSensorRequest } from 'aeonith-apilib';

const apiAutopilotSensorRequest: ApiAutopilotSensorRequest = {
  device: 'Leak sensor',
  location: 'Garage water heater',
  reading: 'Water detected on the floor',
  additionalProperties: {
    'exampleAdditionalProperty': { 'key1': 'val1', 'key2': 'val2' }
  },
};
```

